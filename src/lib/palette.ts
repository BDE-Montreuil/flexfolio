const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/** DB values are already constrained by a CHECK (see supabase/init.sql), but
 *  this guards the inline `style` override in layout.tsx against a missing
 *  row or a pre-migration database — never trust a color straight into
 *  a style attribute without checking its shape first. */
export function sanitizeHex(value: string | null | undefined, fallback: string): string {
  return value && isValidHex(value) ? value : fallback;
}
