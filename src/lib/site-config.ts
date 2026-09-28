import type { SocialLink } from "@/lib/types";

/**
 * Fallback copy only. Since the site_settings columns (supabase/schema.sql), every field below also lives
 * in the `site_settings` row and is editable from /admin/parametres — the
 * admin form is the source of truth. These constants exist purely as a
 * defensive default (e.g. `settings?.site_name ?? SITE.name`) for the
 * unlikely case a fetch fails or the migration hasn't run yet; editing
 * values here no longer changes the live site once settings exist in DB.
 */

export const SITE = {
  name: "Prénom Nom",
  role: "Styliste Photo & Direction Artistique",
  labelTopLeft: "Direction artistique",
  labelTopRight: "Scénographie",
  wordmark: "Portfolio",
};

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

export const ABOUT_CONTENT = {
  heading: "Salut !",
  paragraphs: [
    "Styliste photo et directrice artistique, je construis des ambiances avant de construire des images. Chaque projet démarre par une question simple : quelle histoire cet objet, ce vêtement, ce lieu a-t-il envie de raconter ?",
    "Mon travail se situe à la croisée du styling, de la scénographie et de la direction artistique — je pense la composition, la matière et la lumière comme un tout, du brief jusqu'au dernier réglage sur le plateau.",
    "Les pages qui suivent rassemblent une sélection de projets récents, entre commandes éditoriales et collaborations plus personnelles.",
  ],
  ctaLabel: "Voir le portfolio →",
  ctaHref: "/",
};

export const CONTACT = {
  email: "",
  phone: "",
  socialLinks: [] as SocialLink[],
};

/** Mirrors the brief-mandated hex values hardcoded in globals.css — same
 *  defensive-fallback role as SITE/CONTACT above, not the live source of
 *  truth once a settings row exists. */
export const PALETTE = {
  bg: "#f5f5f0",
  ink: "#1a1a1a",
  card: "#3d2b2b",
  accent: "#8b4513",
};

/** Same defensive-fallback role as PALETTE above — mirrors the
 *  supabase/schema.sql column defaults, not the live source of truth once a
 *  settings row exists. */
export const TYPOGRAPHY = {
  titleFont: "Give You Glory",
  bodyFont: "Quicksand",
} as const;
