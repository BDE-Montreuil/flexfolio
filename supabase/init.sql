-- =====================================================================
-- Flexfolio : portfolio (projects, project_images, site_settings, bucket project-images)
-- Idempotent : relançable tel quel, sur une base vierge comme sur la production existante (rien n'est
-- perdu : ce qui manque est ajouté, les règles de sécurité sont remises à leur version actuelle).
-- Toute évolution du schéma de l'appli se fait dans ce fichier.
--
-- À appliquer APRÈS supabase/init.sql du dépôt flexstaff (droits de la suite) :
--   En local      : npm run db:setup (base en place) ou npm run db:reset (base vierge), dans flexstaff
--   En production : SQL Editor de Supabase, flexstaff d'abord, puis ce fichier
-- =====================================================================

do $$
begin
  if to_regprocedure('public.suite_has_app_role(text, text[])') is null then
    raise exception 'Appliquer d''abord supabase/init.sql du dépôt flexstaff (droits de la suite).';
  end if;
end
$$;

-- Inscription dans la suite : ses admins et son staff se gèrent dans app_roles (Flexstaff)
insert into public.suite_apps (app, name) values ('flexfolio', 'Flexfolio') on conflict (app) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Seuls ses admins (app_roles flexfolio/admin) et les super admins modifient le portfolio ou voient
-- les projets masqués.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description_short text,
  description_full text,
  github_url text,
  live_url text,
  tech_stack text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_visible boolean not null default true,
  display_order int not null default 0
);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_type where typname = 'image_orientation') then
    create type public.image_orientation as enum ('portrait', 'landscape');
  end if;
end
$$;

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  is_featured boolean not null default false,
  image_orientation public.image_orientation not null default 'landscape',
  image_position text not null default 'center'
    check (image_position in (
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    )),
  created_at timestamptz not null default now()
);

-- Règle métier : au plus une image "featured" par projet.
create unique index if not exists one_featured_image_per_project
  on public.project_images (project_id)
  where is_featured;

create index if not exists project_images_project_id_sort_order_idx
  on public.project_images (project_id, sort_order);

-- site_settings : ligne unique (id = 1) : identité, About, contact, palette, typographie, galerie
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  profile_image_url text,
  hero_image_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings
  add column if not exists site_name text not null default 'Prénom Nom',
  add column if not exists site_role text not null default 'Styliste Photo & Direction Artistique',
  add column if not exists label_top_left text not null default 'Direction artistique',
  add column if not exists label_top_right text not null default 'Scénographie',
  add column if not exists wordmark text not null default 'Portfolio',
  add column if not exists about_heading text not null default 'Salut !',
  add column if not exists about_cta_label text not null default 'Voir le portfolio →',
  add column if not exists gallery_layout text not null default '3x3'
    check (gallery_layout in ('3x2', '3x3'));

alter table public.site_settings
  add column if not exists about_paragraphs jsonb not null default $json$["Styliste photo et directrice artistique, je construis des ambiances avant de construire des images. Chaque projet démarre par une question simple : quelle histoire cet objet, ce vêtement, ce lieu a-t-il envie de raconter ?","Mon travail se situe à la croisée du styling, de la scénographie et de la direction artistique — je pense la composition, la matière et la lumière comme un tout, du brief jusqu'au dernier réglage sur le plateau.","Les pages qui suivent rassemblent une sélection de projets récents, entre commandes éditoriales et collaborations plus personnelles."]$json$::jsonb;

-- CV (PDF) et contact. social_links : tableau de {label, url} — les icônes Instagram / LinkedIn /
-- TikTok / Pinterest sont déduites de l'URL côté front (src/components/social-icon.tsx).
alter table public.site_settings
  add column if not exists cv_pdf_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists social_links jsonb not null default '[]'::jsonb;

-- Palette (4 couleurs hex, aussi validées dans src/lib/palette.ts)
alter table public.site_settings
  add column if not exists palette_bg text not null default '#f5f5f0'
    check (palette_bg ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists palette_ink text not null default '#1a1a1a'
    check (palette_ink ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists palette_card text not null default '#3d2b2b'
    check (palette_card ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists palette_accent text not null default '#8b4513'
    check (palette_accent ~ '^#[0-9a-fA-F]{6}$');

-- Typographie : n'importe quel nom de famille Google Fonts (chargée au runtime, voir src/lib/typography.ts).
alter table public.site_settings
  add column if not exists font_title text not null default 'Give You Glory',
  add column if not exists font_body text not null default 'Quicksand';

-- Bases d'avant la typographie libre : slugs -> vrais noms de police, et retrait de la contrainte
-- qui n'autorisait que ces deux slugs.
update public.site_settings set font_title = 'Playfair Display' where font_title = 'playfair-display';
update public.site_settings set font_title = 'Give You Glory'   where font_title = 'give-you-glory';
update public.site_settings set font_body  = 'Inter'            where font_body  = 'inter';
update public.site_settings set font_body  = 'Quicksand'        where font_body  = 'quicksand';

alter table public.site_settings
  drop constraint if exists site_settings_font_title_check,
  drop constraint if exists site_settings_font_body_check,
  drop constraint if exists site_settings_font_title_not_blank,
  drop constraint if exists site_settings_font_body_not_blank;

alter table public.site_settings
  alter column font_title set default 'Give You Glory',
  alter column font_body set default 'Quicksand',
  add constraint site_settings_font_title_not_blank check (length(trim(font_title)) > 0),
  add constraint site_settings_font_body_not_blank check (length(trim(font_body)) > 0);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Note : les colonnes cv_experience / cv_education / cv_skills / cv_software / cv_languages (très
-- ancien schéma) ne sont plus utilisées par l'app et ne sont plus créées. Sur une base qui les a encore,
-- elles restent en place ; pour les supprimer (perte définitive de leur contenu) :
--
--   alter table public.site_settings
--     drop column if exists cv_experience,
--     drop column if exists cv_education,
--     drop column if exists cv_skills,
--     drop column if exists cv_software,
--     drop column if exists cv_languages;

-- ---------------------------------------------------------------------
-- Sécurité par ligne
-- ---------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.site_settings enable row level security;

-- projects : le public voit les projets visibles, l'admin tout
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (is_visible = true or (select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated with check ((select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated
  using ((select public.suite_has_app_role('flexfolio', array['admin'])))
  with check ((select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated using ((select public.suite_has_app_role('flexfolio', array['admin'])));

-- project_images : suit la visibilité du projet parent
drop policy if exists "project_images_select" on public.project_images;
create policy "project_images_select" on public.project_images
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and (p.is_visible = true or (select public.suite_has_app_role('flexfolio', array['admin'])))
    )
  );

drop policy if exists "project_images_insert" on public.project_images;
create policy "project_images_insert" on public.project_images
  for insert to authenticated with check ((select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "project_images_update" on public.project_images;
create policy "project_images_update" on public.project_images
  for update to authenticated
  using ((select public.suite_has_app_role('flexfolio', array['admin'])))
  with check ((select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "project_images_delete" on public.project_images;
create policy "project_images_delete" on public.project_images
  for delete to authenticated using ((select public.suite_has_app_role('flexfolio', array['admin'])));

-- site_settings : lecture publique (Flexfolio public), écriture admin
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings
  for select using (true);

drop policy if exists "site_settings_update" on public.site_settings;
create policy "site_settings_update" on public.site_settings
  for update to authenticated
  using ((select public.suite_has_app_role('flexfolio', array['admin'])))
  with check ((select public.suite_has_app_role('flexfolio', array['admin'])));

-- ---------------------------------------------------------------------
-- Stockage : bucket public pour les images projets, photos du site et le CV PDF
-- ---------------------------------------------------------------------
-- Garde-fous côté serveur : 20 Mo max par fichier, images + PDF uniquement. Les images sont de toute
-- façon compressées en WebP <= 2560 px avant l'envoi (src/lib/compress-image.ts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  20971520,
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique du bucket, écriture admin
drop policy if exists "project_images_bucket_public_read" on storage.objects;
create policy "project_images_bucket_public_read" on storage.objects
  for select using (bucket_id = 'project-images');

drop policy if exists "project_images_bucket_auth_insert" on storage.objects;
create policy "project_images_bucket_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and (select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "project_images_bucket_auth_update" on storage.objects;
create policy "project_images_bucket_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and (select public.suite_has_app_role('flexfolio', array['admin'])));

drop policy if exists "project_images_bucket_auth_delete" on storage.objects;
create policy "project_images_bucket_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and (select public.suite_has_app_role('flexfolio', array['admin'])));
