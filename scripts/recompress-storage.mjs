#!/usr/bin/env node
/**
 * Recompresse les images déjà présentes dans le bucket "project-images"
 * avec les mêmes réglages que l'upload côté admin
 * (src/lib/compress-image.ts) : 2560 px max sur le grand côté, WebP
 * qualité 85, orientation EXIF appliquée, métadonnées retirées.
 *
 * Seules les images référencées en base sont traitées — lance d'abord
 * `npm run cleanup:storage -- --apply` pour les orphelins.
 *
 * Chaque image recompressée est uploadée sous un NOUVEAU chemin (les
 * fichiers sont servis avec un cache d'un an, écraser l'ancien chemin
 * laisserait l'ancienne version en cache), puis la base est mise à jour,
 * puis l'ancien fichier est supprimé. Si la mise à jour échoue, tout est
 * annulé pour ce fichier.
 *
 * Usage :
 *   npm run recompress:storage                    # simulation : calcule le gain, n'écrit rien
 *   npm run recompress:storage -- --apply         # remplace vraiment
 *   npm run recompress:storage -- --min-saving=20 # seuil de gain en % (défaut 10)
 *
 * Variables d'environnement : voir scripts/lib/storage-admin.mjs.
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  BUCKET,
  createAdminClient,
  fail,
  formatBytes,
  listAllObjects,
  listReferences,
} from "./lib/storage-admin.mjs";

// Mêmes valeurs que MAX_EDGE / WEBP_QUALITY / IMMUTABLE_CACHE_CONTROL
// dans src/lib/compress-image.ts.
const MAX_EDGE = 2560;
const WEBP_QUALITY = 85;
const CACHE_CONTROL = "31536000";

const RECOMPRESSIBLE = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const UUID_SEGMENT = /^(.*?)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const minSavingArg = args.find((a) => a.startsWith("--min-saving="));
const minSaving = minSavingArg ? Number(minSavingArg.split("=")[1]) : 10;
if (!Number.isFinite(minSaving) || minSaving < 0 || minSaving >= 100) {
  fail(`--min-saving invalide : ${minSavingArg}`);
}

const supabase = createAdminClient();

/** projects/abc/<uuid>-photo.jpg -> projects/abc/<nouvel uuid>-photo.webp
 *  site/heroImageUrl-<uuid>-x.png -> site/heroImageUrl-<nouvel uuid>-x.webp */
function newPathFor(oldPath) {
  const slash = oldPath.lastIndexOf("/");
  const dir = slash === -1 ? "" : oldPath.slice(0, slash + 1);
  const name = oldPath.slice(slash + 1);
  const match = name.match(UUID_SEGMENT);
  const prefix = match ? match[1] : "";
  const original = match ? match[2] : name;
  const base = original.replace(/\.[^.]+$/, "") || "image";
  return `${dir}${prefix}${randomUUID()}-${base}.webp`;
}

async function recompress(buffer) {
  const image = sharp(buffer, { failOn: "none" });
  const meta = await image.metadata();
  // Un WebP/PNG animé perdrait son animation : on n'y touche pas.
  if ((meta.pages ?? 1) > 1) return { skipped: "animée" };

  const { data, info } = await image
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height, before: meta };
}

async function updateRefs(refs, newUrl) {
  const done = [];
  for (const ref of refs) {
    const { data, error } = await supabase
      .from(ref.table)
      .update({ [ref.column]: newUrl })
      .eq("id", ref.id)
      .eq(ref.column, ref.url)
      .select("id");
    // 0 ligne = la valeur a changé entre-temps (édition dans l'admin) :
    // on n'écrase rien et on annule, sinon on supprimerait un fichier
    // encore utilisé.
    if (error || data.length !== 1) {
      return { error: error ?? { message: `ligne ${ref.table}.${ref.id} modifiée entre-temps` }, done };
    }
    done.push(ref);
  }
  return { error: null, done };
}

async function revertRefs(refs, newUrl) {
  for (const ref of refs) {
    await supabase
      .from(ref.table)
      .update({ [ref.column]: ref.url })
      .eq("id", ref.id)
      .eq(ref.column, newUrl);
  }
}

const [objects, refs] = await Promise.all([listAllObjects(supabase), listReferences(supabase)]);
const objectsByPath = new Map(objects.map((obj) => [obj.path, obj]));

const refsByPath = new Map();
for (const ref of refs) {
  if (!RECOMPRESSIBLE.test(ref.path)) continue;
  if (!refsByPath.has(ref.path)) refsByPath.set(ref.path, []);
  refsByPath.get(ref.path).push(ref);
}

console.log(`${refsByPath.size} image(s) référencée(s) à examiner${apply ? "" : " (simulation)"}.\n`);

let totalBefore = 0;
let totalAfter = 0;
let replaced = 0;
let failed = 0;

for (const [path, pathRefs] of refsByPath) {
  const object = objectsByPath.get(path);
  if (!object) {
    console.warn(`  ? ${path} — absent du bucket, ignoré`);
    continue;
  }

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
  if (downloadError) {
    console.warn(`  ✖ ${path} — téléchargement impossible : ${downloadError.message}`);
    failed++;
    continue;
  }
  const original = Buffer.from(await blob.arrayBuffer());

  let result;
  try {
    result = await recompress(original);
  } catch (error) {
    console.warn(`  ✖ ${path} — décodage impossible : ${error.message}`);
    failed++;
    continue;
  }
  if (result.skipped) {
    console.log(`  · ${path} — ${result.skipped}, conservée`);
    continue;
  }

  const saving = 100 * (1 - result.data.length / original.length);
  const summary =
    `${formatBytes(original.length)} → ${formatBytes(result.data.length)} ` +
    `(-${saving.toFixed(0)} %, ${result.before.width}×${result.before.height} → ${result.width}×${result.height})`;

  if (saving < minSaving) {
    console.log(`  · ${path} — déjà légère (${summary}), conservée`);
    continue;
  }

  if (!apply) {
    totalBefore += original.length;
    totalAfter += result.data.length;
    console.log(`  ~ ${path} — ${summary}`);
    continue;
  }

  const newPath = newPathFor(path);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, result.data, { contentType: "image/webp", cacheControl: CACHE_CONTROL });
  if (uploadError) {
    console.warn(`  ✖ ${path} — upload impossible : ${uploadError.message}`);
    failed++;
    continue;
  }

  const {
    data: { publicUrl: newUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(newPath);

  const { error: updateError, done } = await updateRefs(pathRefs, newUrl);
  if (updateError) {
    await revertRefs(done, newUrl);
    await supabase.storage.from(BUCKET).remove([newPath]);
    console.warn(`  ✖ ${path} — mise à jour de la base impossible, annulé : ${updateError.message}`);
    failed++;
    continue;
  }

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
  if (removeError) {
    // La base pointe déjà sur la nouvelle version : l'ancien fichier est
    // juste orphelin, cleanup:storage le ramassera.
    console.warn(`  ! ${path} — remplacé, mais l'ancien fichier n'a pas pu être supprimé`);
  }

  totalBefore += original.length;
  totalAfter += result.data.length;
  console.log(`  ✔ ${path} → ${newPath} — ${summary}`);
  replaced++;
}

console.log();
if (totalBefore === 0) {
  console.log("Rien à recompresser.");
} else if (!apply) {
  console.log(
    `Simulation : ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} ` +
      `(${formatBytes(totalBefore - totalAfter)} libérés). Relance avec --apply pour remplacer.`,
  );
} else {
  console.log(
    `✔ ${replaced} image(s) remplacée(s) : ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}.`,
  );
}
if (failed > 0) {
  console.log(`⚠ ${failed} échec(s), voir ci-dessus.`);
  process.exitCode = 1;
}
