import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { SITE, CONTACT } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/types";

// Éditeur du site (mentions légales) vient de site_settings.site_name,
// éditable depuis /admin/parametres — même pattern que about/page.tsx.
// Le nom du développeur reste en dur : c'est une personne distincte du
// contenu éditorial du site, pas un champ admin — voir le footer link
// dans layout.tsx, routé ici via src/proxy.ts (/mentions-legales -> /legal).
export const dynamic = "force-dynamic";

const DEVELOPER_NAME = "Thaï-Nam NGO--MARIE";
const DEVELOPER_GITHUB_URL = "https://github.com/void19845/flexfolio";

export const metadata: Metadata = {
  title: `Crédits, mentions légales & RGPD — ${SITE.name}`,
  description: "Crédits, mentions légales et informations RGPD de ce site.",
};

export default async function LegalPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const settings = data as SiteSettings | null;
  const editorName = settings?.site_name ?? SITE.name;

  return (
      <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-16 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-3">
          <span className="label-eyebrow text-brand-ink-muted">Informations</span>
          <h1 className="font-serif text-4xl text-brand-ink sm:text-5xl">
            Crédits, mentions légales & RGPD
          </h1>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl text-brand-ink">Crédits</h2>
          <div className="flex flex-col gap-3 text-base leading-relaxed text-brand-ink-muted sm:text-[15px]">
            <p>
              Site conçu, développé et maintenu par {DEVELOPER_NAME}, réalisé avec
              Next.js, Supabase et Tailwind CSS.
            </p>
            <p>
              Code source et questions de maintenance technique sur{" "}
              <a
                  href={DEVELOPER_GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-brand-ink"
              >
                GitHub
              </a>
              .
            </p>
            <p>
              Les photographies et visuels présentés sur ce portfolio sont la propriété
              de leur auteur·ice et ne peuvent être réutilisés sans autorisation
              préalable.
            </p>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl text-brand-ink">Mentions légales</h2>
          <div className="flex flex-col gap-3 text-base leading-relaxed text-brand-ink-muted sm:text-[15px]">
            <p>
              <strong className="text-brand-ink">Éditeur du site : </strong>
              {editorName}
              {CONTACT.email && <> — {CONTACT.email}</>}.
            </p>
            <p>
              <strong className="text-brand-ink">Hébergement : </strong>
              [à compléter — raison sociale, adresse et contact de l’hébergeur].
            </p>
            <p>
              <strong className="text-brand-ink">Directeur de la publication : </strong>
              {editorName}.
            </p>
            <p>
              Ce site est un portfolio personnel. Toute reproduction, même partielle, de
              son contenu (textes, images, mise en page) est interdite sans autorisation
              écrite préalable.
            </p>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl text-brand-ink">
            Protection des données (RGPD)
          </h2>
          <div className="flex flex-col gap-3 text-base leading-relaxed text-brand-ink-muted sm:text-[15px]">
            <p>
              Ce site ne collecte aucune donnée personnelle à des fins commerciales. Les
              seules données susceptibles d’être traitées sont celles transmises
              volontairement via le formulaire ou l’adresse de contact, dans le seul but
              d’échanger au sujet d’un projet.
            </p>
            <p>
              Conformément au Règlement général sur la protection des données (RGPD) et à
              la loi Informatique et Libertés, vous disposez d’un droit d’accès, de
              rectification et de suppression des données vous concernant. Pour l’exercer,
              contactez {CONTACT.email || "l’adresse indiquée sur la page contact"}.
            </p>
            <p>Ce site n’utilise pas de cookies de suivi ni de traceurs publicitaires tiers.</p>
          </div>
        </section>
      </div>
  );
}