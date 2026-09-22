import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "@/components/gallery";
import { Badge } from "@/components/ui/badge";
import { formatProjectDate } from "@/lib/project-helpers";
import type { ProjectWithImages, SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: settingsData }] = await Promise.all([
    supabase.from("projects").select("*, project_images(*)").eq("slug", slug).maybeSingle(),
    supabase.from("site_settings").select("gallery_layout").eq("id", 1).maybeSingle(),
  ]);

  if (!project) notFound();

  const p = project as ProjectWithImages;
  const galleryLayout =
    (settingsData as Pick<SiteSettings, "gallery_layout"> | null)?.gallery_layout ?? "3x3";

  return (
    <article className="mx-auto max-w-5xl pb-20">
      <header className="flex flex-col gap-4 px-4 pb-8 pt-10 sm:px-8">
        <span className="label-eyebrow text-brand-ink-muted">
          {formatProjectDate(p.created_at)}
        </span>
        <h1 className="font-serif text-4xl leading-tight text-brand-ink sm:text-5xl">
          {p.title}
        </h1>
        {p.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {p.tech_stack.map((tech) => (
              <Badge key={tech} variant="outline">
                {tech}
              </Badge>
            ))}
          </div>
        )}
        {(p.github_url || p.live_url) && (
          <div className="flex gap-4 text-sm">
            {p.github_url && (
              <a
                href={p.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-brand-accent"
              >
                GitHub
              </a>
            )}
            {p.live_url && (
              <a
                href={p.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-brand-accent"
              >
                Voir le live
              </a>
            )}
          </div>
        )}
      </header>

      {p.description_short && (
        <p className="px-4 pb-10 text-lg leading-relaxed text-brand-ink sm:px-8">
          {p.description_short}
        </p>
      )}

      <Gallery images={p.project_images} layout={galleryLayout} />

      {p.description_full && (
        <div className="whitespace-pre-line px-4 pt-10 text-base leading-relaxed text-brand-ink sm:px-8">
          {p.description_full}
        </div>
      )}

      <div className="px-4 pt-12 sm:px-8">
        <Link href="/" className="label-eyebrow hover:text-brand-accent">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </article>
  );
}
