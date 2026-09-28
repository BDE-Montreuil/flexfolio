import type { ImageOrientation } from "@/lib/types";

/** Longest edge kept on upload — matches the largest width next/image is
 *  allowed to request (see `deviceSizes` in next.config.ts), so nothing
 *  bigger than what the site can ever display ends up in storage. */
const MAX_EDGE = 2560;
const WEBP_QUALITY = 0.85;

/** Formats the canvas can't round-trip without losing something
 *  (animation, vector) — uploaded untouched. */
const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

export interface PreparedImage {
  file: File;
  orientation: ImageOrientation | null;
}

/**
 * Downscales an image to MAX_EDGE and re-encodes it as WebP in the browser
 * before it's sent to Supabase Storage. Camera/export files are often
 * 5–20 MB; the result is typically a few hundred KB, which shrinks storage
 * and gives next/image a much lighter source to transform.
 *
 * Falls back to the original file if decoding fails or if re-encoding
 * wouldn't actually make it smaller.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (PASSTHROUGH_TYPES.has(file.type)) return { file, orientation: null };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { file, orientation: null };
  }

  const orientation: ImageOrientation = bitmap.height > bitmap.width ? "portrait" : "landscape";
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { file, orientation };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
  );

  // Safari < 17 silently falls back to PNG for unsupported types — only
  // keep the result if it really is WebP and really is lighter.
  if (!blob || blob.type !== "image/webp" || (scale === 1 && blob.size >= file.size)) {
    return { file, orientation };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return {
    file: new File([blob], `${baseName}.webp`, { type: "image/webp" }),
    orientation,
  };
}

/** Upload paths always embed a fresh uuid, so an object never changes
 *  once written — let browsers, the CDN and the next/image optimizer
 *  cache it for a year instead of re-fetching (and re-transforming) it
 *  every hour. */
export const IMMUTABLE_CACHE_CONTROL = "31536000";
