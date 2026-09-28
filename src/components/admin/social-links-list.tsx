"use client";

import { PlusIcon, Trash2Icon, ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SocialIcon } from "@/components/social-icon";
import type { SocialLink } from "@/lib/types";

/** Add/remove/reorder editor for the social links shown as icons in the
 *  contact block of the About card. Free-form {label, url} pairs rather
 *  than a fixed set of platforms: Instagram, LinkedIn, TikTok and
 *  Pinterest get their own icon (detected from the URL, see
 *  social-icon.tsx), anything else falls back to a globe. */
export function SocialLinksList({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  function update(index: number, patch: Partial<SocialLink>) {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function remove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([...links, { label: "", url: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {links.map((link, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 border border-border p-3 sm:flex-row sm:items-start"
        >
          <SocialIcon
            url={link.url}
            label={link.label}
            className="hidden h-5 w-5 shrink-0 self-center text-brand-ink-muted sm:block"
          />
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Plateforme (ex. Instagram)"
              value={link.label}
              onChange={(e) => update(index, { label: e.target.value })}
              aria-label="Plateforme"
            />
            <Input
              placeholder="https://..."
              value={link.url}
              onChange={(e) => update(index, { url: e.target.value })}
              aria-label="Lien"
            />
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="Monter"
            >
              <ChevronUpIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => move(index, 1)}
              disabled={index === links.length - 1}
              aria-label="Descendre"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Supprimer ce lien"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={add}>
        <PlusIcon className="h-4 w-4" />
        Ajouter un lien
      </Button>
    </div>
  );
}
