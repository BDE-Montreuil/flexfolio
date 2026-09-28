#!/usr/bin/env node
/**
 * Supprime du bucket "project-images" les fichiers qu'aucune ligne de la
 * base ne référence plus : anciennes photos hero/profil et CV remplacés,
 * images uploadées dans un projet jamais enregistré, restes de projets
 * supprimés, etc.
 *
 * Passe par l'API Storage (Supabase interdit les DELETE directs sur
 * storage.objects en SQL) avec la clé service_role, qui contourne la RLS
 * pour voir aussi les projets masqués.
 *
 * Usage :
 *   npm run cleanup:storage                 # simulation, ne supprime rien
 *   npm run cleanup:storage -- --apply      # supprime vraiment
 *   npm run cleanup:storage -- --min-age-hours=48
 *
 * Variables d'environnement (lues depuis .env puis .env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (ou SUPABASE_SECRET_KEY)
 */
import {
  BUCKET,
  createAdminClient,
  fail,
  formatBytes,
  listAllObjects,
  listReferences,
} from "./lib/storage-admin.mjs";

const REMOVE_BATCH = 100;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const minAgeArg = args.find((a) => a.startsWith("--min-age-hours="));
// Délai de grâce : un fichier tout juste uploadé dans un formulaire pas
// encore enregistré n'a pas encore de ligne en base — on ne le touche pas.
const minAgeHours = minAgeArg ? Number(minAgeArg.split("=")[1]) : 24;
if (!Number.isFinite(minAgeHours) || minAgeHours < 0) {
  fail(`--min-age-hours invalide : ${minAgeArg}`);
}

const supabase = createAdminClient();

const [objects, refs] = await Promise.all([listAllObjects(supabase), listReferences(supabase)]);
const referenced = new Set(refs.map((ref) => ref.path));
const cutoff = Date.now() - minAgeHours * 3600 * 1000;

const orphans = objects.filter((obj) => !referenced.has(obj.path));
const deletable = orphans.filter((obj) => obj.createdAt.getTime() < cutoff);
const tooRecent = orphans.length - deletable.length;
const existing = new Set(objects.map((obj) => obj.path));
const missing = [...referenced].filter((path) => !existing.has(path));

const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
const deletableSize = deletable.reduce((sum, obj) => sum + obj.size, 0);

console.log(`Bucket "${BUCKET}" : ${objects.length} fichiers, ${formatBytes(totalSize)}`);
console.log(`Référencés en base : ${referenced.size}`);
console.log(`Orphelins : ${orphans.length} (dont ${tooRecent} de moins de ${minAgeHours} h, conservés)`);
console.log();

for (const obj of deletable) {
  console.log(`  - ${obj.path}  (${formatBytes(obj.size)})`);
}
if (deletable.length > 0) console.log();

if (missing.length > 0) {
  console.warn(`⚠ ${missing.length} URL(s) en base pointent vers un fichier absent :`);
  for (const path of missing) console.warn(`  ? ${path}`);
  console.warn();
}

if (deletable.length === 0) {
  console.log("Rien à supprimer.");
  process.exit(0);
}

if (!apply) {
  console.log(
    `Simulation : ${deletable.length} fichier(s), ${formatBytes(deletableSize)} seraient libérés. ` +
      "Relance avec --apply pour supprimer.",
  );
  process.exit(0);
}

let removed = 0;
for (let i = 0; i < deletable.length; i += REMOVE_BATCH) {
  const batch = deletable.slice(i, i + REMOVE_BATCH).map((obj) => obj.path);
  const { data, error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) fail(`Suppression interrompue après ${removed} fichier(s) : ${error.message}`);
  removed += data.length;
}

console.log(`✔ ${removed} fichier(s) supprimé(s), ${formatBytes(deletableSize)} libérés.`);
