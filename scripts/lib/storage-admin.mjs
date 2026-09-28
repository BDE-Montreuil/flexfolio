/**
 * Helpers partagés par les scripts de maintenance du storage
 * (cleanup-storage.mjs, recompress-storage.mjs). Client Supabase avec la
 * clé service_role : contourne la RLS, ne jamais l'utiliser côté app.
 */
import { createClient } from "@supabase/supabase-js";

export const BUCKET = "project-images";
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const PAGE_SIZE = 1000;

export function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies " +
        "(ajoute la clé service_role dans .env.local — jamais dans .env, qui est versionné).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** URL publique -> chemin dans le bucket (null si l'URL n'y pointe pas). */
export function toStoragePath(publicUrl) {
  if (!publicUrl) return null;
  const index = publicUrl.indexOf(PUBLIC_URL_MARKER);
  if (index === -1) return null;
  const encoded = publicUrl.slice(index + PUBLIC_URL_MARKER.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 ** 2).toFixed(2)} Mo`;
}

/** Parcourt récursivement le bucket (l'API ne liste qu'un dossier à la fois). */
export async function listAllObjects(supabase, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) fail(`Lecture du bucket impossible (${prefix || "/"}) : ${error.message}`);

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        files.push(...(await listAllObjects(supabase, path)));
      } else if (item.name !== ".emptyFolderPlaceholder") {
        files.push({
          path,
          size: item.metadata?.size ?? 0,
          mimetype: item.metadata?.mimetype ?? "",
          createdAt: new Date(item.created_at ?? item.updated_at ?? 0),
        });
      }
    }
    if (data.length < PAGE_SIZE) break;
  }
  return files;
}

/** Toutes les URLs de fichiers stockées en base, avec leur emplacement,
 *  pour pouvoir les réécrire après un déplacement. */
export async function listReferences(supabase) {
  const { data: images, error: imagesError } = await supabase
    .from("project_images")
    .select("id, image_url");
  if (imagesError) fail(`Lecture de project_images impossible : ${imagesError.message}`);

  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("id, profile_image_url, hero_image_url, cv_pdf_url");
  if (settingsError) fail(`Lecture de site_settings impossible : ${settingsError.message}`);

  const refs = [];
  for (const row of images) {
    refs.push({ table: "project_images", id: row.id, column: "image_url", url: row.image_url });
  }
  for (const row of settings) {
    for (const column of ["profile_image_url", "hero_image_url", "cv_pdf_url"]) {
      if (row[column]) refs.push({ table: "site_settings", id: row.id, column, url: row[column] });
    }
  }
  return refs
    .map((ref) => ({ ...ref, path: toStoragePath(ref.url) }))
    .filter((ref) => ref.path !== null);
}
