const PUBLIC_URL_MARKER = "/storage/v1/object/public/";

/** Reverses getPublicUrl(): full public URL -> path within the bucket. */
export function extractStoragePath(publicUrl: string, bucket: string): string {
  const marker = `${PUBLIC_URL_MARKER}${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return publicUrl;
  // getPublicUrl() percent-encodes the path (spaces -> %20…); the Storage
  // API's remove()/list() expect the raw key.
  const encoded = publicUrl.slice(index + marker.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** Storage keys reject accents and most punctuation — "Été 2024 (1).jpg"
 *  becomes "Ete-2024-1.jpg" so uploads don't fail on "Invalid key". */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  const clean = (part: string) =>
    part
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const safeBase = clean(base) || "fichier";
  const safeExt = clean(ext).toLowerCase();
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function fileNameFromStoragePath(path: string): string {
  const last = path.split("/").pop() ?? path;
  // Uploads are named `${uuid}-${originalFileName}`; strip the uuid prefix for display.
  const dashIndex = last.indexOf("-");
  return dashIndex > -1 && dashIndex === 36 ? last.slice(dashIndex + 1) : last;
}
