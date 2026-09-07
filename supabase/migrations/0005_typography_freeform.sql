-- Lets the admin type any Google Fonts family name for the site's title
-- and body fonts, instead of picking between two preloaded pairs.
-- next/font/google can't fetch an arbitrary font name at runtime (it's a
-- build-time transform), so typography now loads at runtime via the
-- Google Fonts CSS2 stylesheet API instead — see src/lib/typography.ts
-- and src/app/layout.tsx.

-- Migrate the old slug values to their real Google Fonts family names
-- before dropping the constraint that only allowed those two slugs each.
update public.site_settings set font_title = 'Playfair Display' where font_title = 'playfair-display';
update public.site_settings set font_title = 'Give You Glory' where font_title = 'give-you-glory';
update public.site_settings set font_body = 'Inter' where font_body = 'inter';
update public.site_settings set font_body = 'Quicksand' where font_body = 'quicksand';

alter table public.site_settings
  drop constraint if exists site_settings_font_title_check,
  drop constraint if exists site_settings_font_body_check;

alter table public.site_settings
  alter column font_title set default 'Give You Glory',
  alter column font_body set default 'Quicksand',
  add constraint site_settings_font_title_not_blank check (length(trim(font_title)) > 0),
  add constraint site_settings_font_body_not_blank check (length(trim(font_body)) > 0);
