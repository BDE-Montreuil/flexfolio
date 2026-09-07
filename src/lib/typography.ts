/** Runtime Google Fonts loading — the admin can type any font family name
 *  in /admin/parametres, so this can't go through next/font/google (that's
 *  a build-time transform that needs every font known ahead of time). See
 *  src/app/layout.tsx for where these are used. */

// Deliberately narrow: letters, digits, spaces and hyphens covers the huge
// majority of real Google Fonts family names while keeping the value safe
// to embed both in a CSS string and in a URL query param.
const SAFE_FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{0,58}[A-Za-z0-9]$|^[A-Za-z0-9]$/;

/** Falls back to `fallback` for anything blank or outside the safe charset
 *  above, so a bad/malicious value in the DB can't break the layout or
 *  escape the generated CSS/URL. */
export function sanitizeFontFamily(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return SAFE_FONT_NAME_PATTERN.test(trimmed) ? trimmed : fallback;
}

/** Builds a single Google Fonts CSS2 stylesheet URL requesting all of the
 *  given family names at once (deduped), each with a common weight range. */
export function googleFontsHref(families: string[]): string {
  const unique = Array.from(new Set(families));
  const params = unique
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** CSS `font-family` value for a given family name, quoted and paired with
 *  a generic fallback in case the Google Fonts request fails or the name
 *  isn't a real font. */
export function fontFamilyCssValue(name: string, genericFallback: "serif" | "sans-serif"): string {
  return `"${name}", ${genericFallback}`;
}
