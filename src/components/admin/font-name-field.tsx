"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleFontsHref } from "@/lib/typography";
import { FONT_SUGGESTIONS } from "@/lib/types";

/** Free-text font picker: the admin can type any Google Fonts family name
 *  (FONT_SUGGESTIONS are just <datalist> hints, not a constraint). Loads
 *  the typed name from Google Fonts client-side (debounced) to preview it
 *  live, since it isn't preloaded via next/font anymore. */
export function FontNameField({
  label,
  value,
  onChange,
  previewText,
  previewClassName = "text-lg",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  previewText: string;
  previewClassName?: string;
}) {
  const datalistId = useId();
  const [previewFont, setPreviewFont] = useState(value);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const timeout = setTimeout(() => setPreviewFont(trimmed), 400);
    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    if (!previewFont) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsHref([previewFont]);
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [previewFont]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={datalistId}>{label}</Label>
      <Input
        id={datalistId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={`${datalistId}-suggestions`}
        placeholder="Ex. Playfair Display"
        autoComplete="off"
      />
      <datalist id={`${datalistId}-suggestions`}>
        {FONT_SUGGESTIONS.map((font) => (
          <option key={font} value={font} />
        ))}
      </datalist>
      <p
        className={`border border-border bg-secondary px-4 py-3 text-brand-ink ${previewClassName}`}
        style={{ fontFamily: `"${previewFont}", sans-serif` }}
      >
        {previewText}
      </p>
    </div>
  );
}
