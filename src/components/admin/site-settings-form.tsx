"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateSiteSettings } from "@/actions/site-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { GalleryLayoutToggle } from "@/components/admin/gallery-layout-toggle";
import { SocialLinksList } from "@/components/admin/social-links-list";
import { ColorField } from "@/components/admin/color-field";
import { FontNameField } from "@/components/admin/font-name-field";
import { SITE, ABOUT_CONTENT, CONTACT, PALETTE, TYPOGRAPHY } from "@/lib/site-config";
import { extractStoragePath, fileNameFromStoragePath, safeFileName } from "@/lib/storage-path";
import { IMMUTABLE_CACHE_CONTROL, prepareImageForUpload } from "@/lib/compress-image";
import {
  type GalleryLayout,
  type SiteSettings,
  type SocialLink,
} from "@/lib/types";

const BUCKET = "project-images";

/** Deletes the file a settings field pointed at before being replaced —
 *  otherwise every "Remplacer" leaves the previous upload in the bucket
 *  forever. Only touches URLs that actually live in our bucket. */
async function removeReplacedFile(
  supabase: ReturnType<typeof createClient>,
  previousUrl: string | null,
) {
  if (!previousUrl) return;
  const path = extractStoragePath(previousUrl, BUCKET);
  if (path === previousUrl) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

function PhotoField({
  label,
  currentUrl,
  field,
}: {
  label: string;
  currentUrl: string | null;
  field: "profileImageUrl" | "heroImageUrl";
}) {
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const { file: prepared } = await prepareImageForUpload(file);
    const path = `site/${field}-${crypto.randomUUID()}-${safeFileName(prepared.name)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, prepared, {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      contentType: prepared.type,
    });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error } = await updateSiteSettings({ [field]: publicUrl });
    setUploading(false);

    if (error) {
      // Settings still point at the old photo — drop the new upload
      // rather than leaving it orphaned in the bucket.
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error(error);
      return;
    }

    await removeReplacedFile(supabase, url);
    setUrl(publicUrl);
    toast.success(`${label} mise à jour.`);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="relative h-40 w-full max-w-xs overflow-hidden bg-secondary">
        {url ? (
          <Image src={url} alt={label} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-brand-ink-muted">
            Aucune photo
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Envoi..." : "Remplacer"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function CvPdfField({ currentUrl }: { currentUrl: string | null }) {
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Le CV doit être un fichier PDF.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    // uuid immediately before the filename, as the last path segment —
    // matches the convention fileNameFromStoragePath expects (see below).
    const path = `site/cv-pdf/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error } = await updateSiteSettings({ cvPdfUrl: publicUrl });
    setUploading(false);

    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error(error);
      return;
    }

    await removeReplacedFile(supabase, url);
    setUrl(publicUrl);
    toast.success("CV mis à jour.");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Fichier CV (PDF)</Label>
      <div className="flex max-w-xs items-center gap-3 border border-border p-3 text-sm">
        <FileTextIcon className="h-5 w-5 shrink-0 text-brand-ink-muted" />
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate text-brand-ink underline underline-offset-2 hover:text-brand-accent"
          >
            {fileNameFromStoragePath(extractStoragePath(url, BUCKET))}
          </a>
        ) : (
          <span className="text-brand-ink-muted">Aucun CV envoyé</span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Envoi..." : "Remplacer"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-ink-muted">
      {children}
    </h2>
  );
}

export function SiteSettingsForm({ settings }: { settings: SiteSettings | null }) {
  const [siteName, setSiteName] = useState(settings?.site_name ?? SITE.name);
  const [siteRole, setSiteRole] = useState(settings?.site_role ?? SITE.role);
  const [wordmark, setWordmark] = useState(settings?.wordmark ?? SITE.wordmark);
  const [labelTopLeft, setLabelTopLeft] = useState(settings?.label_top_left ?? SITE.labelTopLeft);
  const [labelTopRight, setLabelTopRight] = useState(
    settings?.label_top_right ?? SITE.labelTopRight,
  );

  const [aboutHeading, setAboutHeading] = useState(
    settings?.about_heading ?? ABOUT_CONTENT.heading,
  );
  const [aboutParagraphs, setAboutParagraphs] = useState(
    (settings?.about_paragraphs ?? ABOUT_CONTENT.paragraphs).join("\n\n"),
  );
  const [aboutCtaLabel, setAboutCtaLabel] = useState(
    settings?.about_cta_label ?? ABOUT_CONTENT.ctaLabel,
  );

  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>(
    settings?.gallery_layout ?? "3x3",
  );

  const [contactEmail, setContactEmail] = useState(settings?.contact_email ?? CONTACT.email);
  const [contactPhone, setContactPhone] = useState(settings?.contact_phone ?? CONTACT.phone);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    settings?.social_links ?? CONTACT.socialLinks,
  );

  const [paletteBg, setPaletteBg] = useState(settings?.palette_bg ?? PALETTE.bg);
  const [paletteInk, setPaletteInk] = useState(settings?.palette_ink ?? PALETTE.ink);
  const [paletteCard, setPaletteCard] = useState(settings?.palette_card ?? PALETTE.card);
  const [paletteAccent, setPaletteAccent] = useState(settings?.palette_accent ?? PALETTE.accent);

  const [fontTitle, setFontTitle] = useState(settings?.font_title ?? TYPOGRAPHY.titleFont);
  const [fontBody, setFontBody] = useState(settings?.font_body ?? TYPOGRAPHY.bodyFont);

  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    const { error } = await updateSiteSettings({
      siteName,
      siteRole,
      wordmark,
      labelTopLeft,
      labelTopRight,
      aboutHeading,
      aboutParagraphs: aboutParagraphs
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      aboutCtaLabel,
      galleryLayout,
      contactEmail,
      contactPhone,
      socialLinks,
      paletteBg,
      paletteInk,
      paletteCard,
      paletteAccent,
      fontTitle,
      fontBody,
    });

    setSaving(false);

    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Paramètres enregistrés.");
  }

  return (
    <div className="flex flex-col gap-10 pb-16">
      <section className="flex flex-col gap-4">
        <SectionHeading>Photos</SectionHeading>
        <div className="grid gap-8 sm:grid-cols-2">
          <PhotoField
            label="Photo de profil (page About)"
            currentUrl={settings?.profile_image_url ?? null}
            field="profileImageUrl"
          />
          <PhotoField
            label="Photo hero (page d'accueil)"
            currentUrl={settings?.hero_image_url ?? null}
            field="heroImageUrl"
          />
        </div>
        <CvPdfField currentUrl={settings?.cv_pdf_url ?? null} />
      </section>

      <Separator />

      <form onSubmit={handleSubmit} className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <SectionHeading>Identité</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="site_name">Prénom Nom</Label>
              <Input id="site_name" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="site_role">Rôle / activité</Label>
              <Input id="site_role" value={siteRole} onChange={(e) => setSiteRole(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wordmark">Wordmark (grand titre accueil)</Label>
              <Input id="wordmark" value={wordmark} onChange={(e) => setWordmark(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label_top_left">Label haut gauche (hero)</Label>
              <Input
                id="label_top_left"
                value={labelTopLeft}
                onChange={(e) => setLabelTopLeft(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label_top_right">Label haut droite (hero)</Label>
              <Input
                id="label_top_right"
                value={labelTopRight}
                onChange={(e) => setLabelTopRight(e.target.value)}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <SectionHeading>About</SectionHeading>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about_heading">Titre</Label>
            <Input
              id="about_heading"
              value={aboutHeading}
              onChange={(e) => setAboutHeading(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about_paragraphs">
              Texte (un paragraphe par bloc, séparés par une ligne vide)
            </Label>
            <Textarea
              id="about_paragraphs"
              value={aboutParagraphs}
              onChange={(e) => setAboutParagraphs(e.target.value)}
              rows={10}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about_cta_label">Texte du lien vers le portfolio</Label>
            <Input
              id="about_cta_label"
              value={aboutCtaLabel}
              onChange={(e) => setAboutCtaLabel(e.target.value)}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <SectionHeading>Disposition de la galerie projet</SectionHeading>
          <p className="text-sm text-brand-ink-muted">
            S&apos;applique à la galerie de chaque page projet — 3 colonnes dans les deux cas,
            change le format et la densité des vignettes.
          </p>
          <GalleryLayoutToggle value={galleryLayout} onChange={setGalleryLayout} />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div>
            <SectionHeading>Contact (carte About)</SectionHeading>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Affichés sur la carte About avec le Prénom Nom et le rôle définis dans « Identité »
              — laisser vide pour ne rien afficher.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_email">E-mail</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@exemple.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Réseaux sociaux</Label>
            <p className="text-xs text-brand-ink-muted">
              Affichés en icônes sous l&apos;e-mail et le téléphone. Instagram, LinkedIn, TikTok et
              Pinterest sont reconnus automatiquement depuis le lien ; les autres ont une icône
              générique.
            </p>
            <SocialLinksList links={socialLinks} onChange={setSocialLinks} />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div>
            <SectionHeading>Palette de couleurs</SectionHeading>
            <p className="mt-1 text-sm text-brand-ink-muted">
              S&apos;applique à tout le site. « Carte » est le fond de la carte CV/contact sur la
              page About.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Fond" value={paletteBg} onChange={setPaletteBg} />
            <ColorField label="Texte" value={paletteInk} onChange={setPaletteInk} />
            <ColorField label="Carte" value={paletteCard} onChange={setPaletteCard} />
            <ColorField label="Accent" value={paletteAccent} onChange={setPaletteAccent} />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div>
            <SectionHeading>Typographie</SectionHeading>
            <p className="mt-1 text-sm text-brand-ink-muted">
              S&apos;applique à tout le site. « Titres » couvre le wordmark, les intitulés de
              page et le nom dans l&apos;entête ; « Corps de texte » couvre le texte courant, les
              petits libellés en haut de l&apos;accueil, et le prénom/nom sous la photo hero.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <FontNameField
              label="Titres"
              value={fontTitle}
              onChange={setFontTitle}
              previewText={siteName || "Aa — Aperçu du titre"}
              previewClassName="text-2xl"
            />
          </div>
          <div className="flex flex-col gap-2">
            <FontNameField
              label="Corps de texte"
              value={fontBody}
              onChange={setFontBody}
              previewText="Le renard brun rapide saute par-dessus le chien paresseux."
              previewClassName="text-base"
            />
          </div>
        </section>

        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
