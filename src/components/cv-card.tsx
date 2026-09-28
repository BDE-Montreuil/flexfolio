import { DownloadIcon, MailIcon, PhoneIcon } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import type { SocialLink } from "@/lib/types";

export function CVCard({
  name,
  subtitle,
  contactEmail,
  contactPhone,
  socialLinks,
  cvPdfUrl,
}: {
  name: string;
  subtitle: string;
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: SocialLink[];
  cvPdfUrl: string | null;
}) {
  const links = socialLinks.filter((link) => link.url.trim());

  return (
    <div className="flex flex-col gap-6 bg-brand-card p-6 text-brand-card-foreground sm:p-8">
      <div>
        <p className="font-serif text-2xl leading-tight">{name}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.1em] text-brand-card-foreground/80">
          {subtitle}
        </p>
      </div>

      {(contactEmail || contactPhone || links.length > 0) && (
        <div className="flex flex-col gap-2 text-[12px] leading-[1.5]">
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-2 text-brand-card-foreground/90 hover:text-brand-card-foreground"
            >
              <MailIcon className="h-3.5 w-3.5 shrink-0" />
              {contactEmail}
            </a>
          )}
          {contactPhone && (
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-2 text-brand-card-foreground/90 hover:text-brand-card-foreground"
            >
              <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
              {contactPhone}
            </a>
          )}
          {links.length > 0 && (
            <ul className="mt-1 flex flex-wrap items-center gap-3">
              {links.map((link, index) => (
                <li key={`${link.label}-${index}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label || link.url}
                    title={link.label || undefined}
                    className="block text-brand-card-foreground/80 transition-colors hover:text-brand-card-foreground"
                  >
                    <SocialIcon url={link.url} label={link.label} className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {cvPdfUrl && (
        <a
          href={cvPdfUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 flex w-fit items-center gap-2 border border-brand-card-foreground/40 px-4 py-2 font-sans text-xs uppercase tracking-[0.1em] text-brand-card-foreground transition-colors hover:border-brand-card-foreground hover:bg-brand-card-foreground/10"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Télécharger le CV
        </a>
      )}
    </div>
  );
}
