import { GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** lucide-react dropped its brand icons in v1, so the four networks we
 *  care about are inlined here as outline SVGs (same 24px grid and stroke
 *  style as lucide, so they sit naturally next to MailIcon/PhoneIcon). */
export type SocialPlatform = "instagram" | "linkedin" | "tiktok" | "pinterest";

const PLATFORM_MATCHERS: [SocialPlatform, RegExp][] = [
  ["instagram", /instagram|instagr\.am/],
  ["linkedin", /linkedin|lnkd\.in/],
  ["tiktok", /tiktok/],
  ["pinterest", /pinterest|pin\.it/],
];

/** Guesses the network from the link's URL first (most reliable), then
 *  from the free-form label the admin typed. `null` → generic globe icon. */
export function detectPlatform(url: string, label = ""): SocialPlatform | null {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    // Not a valid absolute URL — fall through to the label.
  }
  const haystacks = [host, label.toLowerCase()];
  for (const haystack of haystacks) {
    if (!haystack) continue;
    const match = PLATFORM_MATCHERS.find(([, re]) => re.test(haystack));
    if (match) return match[0];
  }
  return null;
}

const PATHS: Record<SocialPlatform, string[]> = {
  instagram: [
    "M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z",
    "M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
    "M16.5 7.5v.01",
  ],
  linkedin: [
    "M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z",
    "M8 11v5",
    "M8 8v.01",
    "M12 16v-5",
    "M16 16v-3a2 2 0 1 0-4 0",
  ],
  tiktok: [
    "M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2V3h4.083A6.005 6.005 0 0 0 21 7.917z",
  ],
  pinterest: [
    "M8 20l4-9",
    "M10.7 14c.437 1.263 1.43 2 2.55 2c2.071 0 3.75-1.554 3.75-4a5 5 0 1 0-9.7 1.7",
    "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
  ],
};

export function SocialIcon({
  url,
  label,
  className,
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const platform = detectPlatform(url, label);
  if (!platform) return <GlobeIcon className={className} aria-hidden="true" />;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {PATHS[platform].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
