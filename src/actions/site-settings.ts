"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidHex } from "@/lib/palette";
import { sanitizeFontFamily } from "@/lib/typography";
import type { BodyFont, GalleryLayout, SocialLink, TitleFont } from "@/lib/types";

export async function updateSiteSettings(input: {
  profileImageUrl?: string | null;
  heroImageUrl?: string | null;
  cvPdfUrl?: string | null;
  siteName?: string;
  siteRole?: string;
  labelTopLeft?: string;
  labelTopRight?: string;
  wordmark?: string;
  aboutHeading?: string;
  aboutParagraphs?: string[];
  aboutCtaLabel?: string;
  galleryLayout?: GalleryLayout;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: SocialLink[];
  paletteBg?: string;
  paletteInk?: string;
  paletteCard?: string;
  paletteAccent?: string;
  fontTitle?: TitleFont;
  fontBody?: BodyFont;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  for (const [field, value] of Object.entries({
    paletteBg: input.paletteBg,
    paletteInk: input.paletteInk,
    paletteCard: input.paletteCard,
    paletteAccent: input.paletteAccent,
  })) {
    if (value !== undefined && !isValidHex(value)) {
      return { error: `Couleur invalide pour "${field}" — format attendu #rrggbb.` };
    }
  }

  if (input.fontTitle !== undefined) {
    const trimmed = input.fontTitle.trim();
    if (!trimmed || sanitizeFontFamily(trimmed, "") !== trimmed) {
      return {
        error: "Police de titre invalide — lettres, chiffres, espaces et tirets uniquement.",
      };
    }
  }
  if (input.fontBody !== undefined) {
    const trimmed = input.fontBody.trim();
    if (!trimmed || sanitizeFontFamily(trimmed, "") !== trimmed) {
      return {
        error:
          "Police de corps de texte invalide — lettres, chiffres, espaces et tirets uniquement.",
      };
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.profileImageUrl !== undefined) patch.profile_image_url = input.profileImageUrl;
  if (input.heroImageUrl !== undefined) patch.hero_image_url = input.heroImageUrl;
  if (input.cvPdfUrl !== undefined) patch.cv_pdf_url = input.cvPdfUrl;
  if (input.siteName !== undefined) patch.site_name = input.siteName;
  if (input.siteRole !== undefined) patch.site_role = input.siteRole;
  if (input.labelTopLeft !== undefined) patch.label_top_left = input.labelTopLeft;
  if (input.labelTopRight !== undefined) patch.label_top_right = input.labelTopRight;
  if (input.wordmark !== undefined) patch.wordmark = input.wordmark;
  if (input.aboutHeading !== undefined) patch.about_heading = input.aboutHeading;
  if (input.aboutParagraphs !== undefined) patch.about_paragraphs = input.aboutParagraphs;
  if (input.aboutCtaLabel !== undefined) patch.about_cta_label = input.aboutCtaLabel;
  if (input.galleryLayout !== undefined) patch.gallery_layout = input.galleryLayout;
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail || null;
  if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone || null;
  if (input.socialLinks !== undefined) patch.social_links = input.socialLinks;
  if (input.paletteBg !== undefined) patch.palette_bg = input.paletteBg;
  if (input.paletteInk !== undefined) patch.palette_ink = input.paletteInk;
  if (input.paletteCard !== undefined) patch.palette_card = input.paletteCard;
  if (input.paletteAccent !== undefined) patch.palette_accent = input.paletteAccent;
  if (input.fontTitle !== undefined) patch.font_title = input.fontTitle.trim();
  if (input.fontBody !== undefined) patch.font_body = input.fontBody.trim();

  const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
  if (error) return { error: error.message };

  // Palette and typography both live on the root layout, shared by every
  // route — revalidate it directly so a change shows up everywhere, not
  // just on "/".
  revalidatePath("/", "layout");
  revalidatePath("/admin/parametres");
  return { error: null };
}
