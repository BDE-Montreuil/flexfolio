# Portfolio

Portfolio modulaire — Next.js 16 (App Router) + Supabase + Tailwind CSS v4,
avec galerie de projets, panel admin (upload multi-images, positionnement
au pixel, disposition de galerie, contenu About/CV) et direction
artistique éditoriale (hero asymétrique, page About, CV card).

## Stack

- Next.js 16 + TypeScript, App Router, Server Actions
- Supabase : Postgres + Storage + Auth
- Tailwind CSS v4 (tokens définis dans `src/app/globals.css` via `@theme`)
- Composants UI façon shadcn/ui (écrits localement, voir note plus bas)
- `@dnd-kit` pour le réordonnancement des images à la souris

## Mise en route

### 1. Créer le projet Supabase

Sur [supabase.com](https://supabase.com), crée un nouveau projet.

### 2. Variables d'environnement

```bash
cp .env .env.local
```

Remplis `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(Project Settings → API dans le dashboard Supabase).

### 3. Schéma de base de données

Dans le SQL Editor de Supabase, exécute le contenu de
`supabase/schema.sql`. Le script est idempotent : il fonctionne sur un
projet vierge comme sur une base déjà créée avec les anciennes migrations
(il ajoute ce qui manque sans rien supprimer). Ça crée :

- `projects`, `project_images`, `site_settings`
- la contrainte "une seule image featured par projet"
- les colonnes `site_settings` pour l'identité, le contenu About, la
  disposition de galerie, le CV en PDF, le contact, les réseaux sociaux,
  la palette et la typographie — voir « Contenu à personnaliser » plus bas
- le bucket de storage public `project-images` (20 Mo max par fichier,
  images + PDF) + ses policies RLS

### 4. Compte admin

Il n'y a volontairement pas de page d'inscription publique. Crée le compte
admin depuis Authentication → Users → Add user dans le dashboard Supabase
(email + mot de passe).

### 5. Lancer en local

```bash
npm install
npm run dev
```

Connecte-toi sur `/admin/login`, crée un premier projet, puis va dans
`/admin/parametres` pour uploader les photos (hero + profil) et renseigner
ton nom, ton rôle, le texte About et ton CV.

### 6. Déploiement (Vercel)

Connecte le repo à Vercel, ajoute les deux variables d'environnement
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les
Project Settings du projet Vercel — celles de `.env`/`.env.local` ne sont
pas reprises automatiquement — puis déploie.

**Si le build échoue :** ce repo tourne sur Next.js 16 (voir « Décisions
techniques » plus bas), qui exige Node.js ≥ 20.9. `package.json` fixe
`engines.node` à `24.x`, ce qui prend le pas sur le réglage Node.js Version
des Project Settings, quelle que soit sa valeur actuelle. Si un déploiement
échoue quand même, va voir le message d'erreur exact dans les build logs
Vercel — les causes les plus fréquentes sont les deux variables
d'environnement manquantes (ci-dessus) ou une erreur de build spécifique
qu'il vaut mieux lire telle quelle que deviner.

### 7. Nettoyage du storage

`npm run cleanup:storage` liste les fichiers du bucket `project-images`
qu'aucune ligne de la base ne référence plus (photos hero/profil et CV
remplacés, images d'un projet jamais enregistré, etc.) et la place qu'ils
occupent. Par défaut c'est une simulation ; pour supprimer vraiment :

```bash
npm run cleanup:storage -- --apply
```

Les fichiers de moins de 24 h sont conservés (upload en cours dans un
formulaire pas encore enregistré) — réglable avec `--min-age-hours=N`.
Le script a besoin de `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
dans `.env.local`, jamais dans `.env` : cette clé contourne la RLS.

### 8. Recompression des images existantes

Les nouveaux uploads sont compressés dans le navigateur (WebP, 2560 px
max). Pour appliquer la même chose aux images uploadées avant :

```bash
npm run recompress:storage             # simulation : affiche le gain estimé
npm run recompress:storage -- --apply  # remplace vraiment
```

Chaque image est réencodée sous un nouveau nom, la base est mise à jour,
puis l'ancien fichier est supprimé (tout est annulé pour l'image si la
mise à jour échoue). Les images qui gagneraient moins de 10 % sont
laissées telles quelles (`--min-saving=N` pour changer le seuil), les
GIF/WebP animés, SVG et PDF ne sont pas touchés. Même clé
`SUPABASE_SERVICE_ROLE_KEY` que le nettoyage ; lance le nettoyage
d'abord, seules les images référencées en base sont recompressées.

## Contenu à personnaliser

Tout se fait depuis `/admin/parametres`, en base (table `site_settings`) :

- **Photos** — hero (accueil) et profil (About)
- **Identité** — Prénom Nom, rôle, wordmark, les deux labels du hero
- **About** — titre, texte (un paragraphe par bloc), texte du lien de
  retour vers le portfolio
- **Disposition de galerie** — 3×2 (vignettes 3:2) ou 3×3 (vignettes
  carrées), 3 colonnes dans les deux cas ; s'applique à la galerie de
  chaque page projet
- **CV** — un PDF téléversé (le nom et le rôle affichés sur la carte CV
  reprennent ceux du bloc Identité)
- **Contact** — e-mail, téléphone, réseaux sociaux ; affichés sur la carte
  CV/About, laisser vide pour ne rien afficher
- **Palette de couleurs** — fond, texte, carte, accent (4 couleurs en
  hex) ; s'applique à tout le site
- **Typographie** — police des titres et police du corps de texte,
  chacune au choix entre deux options préchargées (voir « Décisions
  techniques »)

`src/lib/site-config.ts` ne reste que comme valeurs de repli si jamais la
base n'est pas encore initialisée (`supabase/schema.sql`) ou une lecture échoue ; l'éditer ne
change plus rien une fois que `site_settings` est renseigné. Les liens de
nav (`NAV_LINKS`, dans le même fichier) restent en dur — pas demandés
comme éditables.

Le contenu par défaut est un placeholder générique ("Prénom Nom",
`[Nom du studio]`) : les images de référence fournies montraient un
portfolio réel en ligne, traité ici uniquement comme référence de style
(mise en page, palette, typo), pas comme contenu à reproduire.

## Décisions techniques (là où le brief laissait le choix)

- **Next.js 16** (16.3.3 au moment d'écrire ceci) — la génération initiale
  avait pinné la 15.5.x volontairement (le brief demandait du 15,
  `create-next-app` proposait la 16 par défaut). Le repo a depuis été
  mis à jour vers la 16 (`package.json`/`package-lock.json` le confirment)
  sans que ce README suive, ce qui a fini par désynchroniser `engines`/
  Node côté Vercel — voir « Déploiement (Vercel) » plus haut. Revenir à
  la 15 aurait été plus risqué que d'assumer la 16 : le code utilisait
  déjà les conventions Next 16 (`params` en `Promise`, `proxy.ts` plutôt
  que `middleware.ts`), donc rester sur 16 et corriger la config Node/
  Vercel est le chemin le moins perturbateur.
- **Composants UI "shadcn"** écrits à la main (Radix + CVA + Tailwind,
  mêmes conventions que le CLI) plutôt que générés par `npx shadcn init` —
  son registre distant n'était pas joignable depuis l'environnement où
  j'ai construit le projet. Aucun impact une fois le repo chez toi.
- **Rendu dynamique** (`export const dynamic = "force-dynamic"`) sur les
  pages qui lisent Supabase, plutôt que du SSG — les données restent
  toujours à jour et le build ne dépend pas d'un projet Supabase déjà
  configuré.
- **Upload d'images** : un UUID de projet est généré côté client dès
  l'ouverture du formulaire "nouveau projet", pour pouvoir uploader vers
  `projects/{id}/...` avant le tout premier enregistrement. Le formulaire
  (infos + images) est validé et sauvegardé en un seul submit.
- **Suppression d'image** : immédiate (storage + ligne DB supprimés au
  clic), indépendante du bouton "Enregistrer".
- **Galerie de la page projet** : grille à 3 colonnes (au lieu d'un
  empilement plein cadre) avec un `aspect-*` fixe par vignette plutôt
  qu'un plafond — pour la même raison que l'ancienne version en `max-h` :
  sans hauteur qui force un dépassement réel, `object-position` n'a aucun
  effet visible, ce qui rendrait la grille de positionnement 3×3
  (recadrage) inopérante. Clic sur une vignette → lightbox en
  `object-contain` (image complète, non recadrée).
- **Disposition "3×2" / "3×3"** (choix admin, `site_settings.gallery_layout`) :
  3 colonnes dans les deux cas ; interprété comme le *format* de vignette
  plutôt qu'un nombre de lignes figé — "3×2" = ratio 3:2 (format photo
  classique), "3×3" = carré. Une galerie affiche donc toutes ses images,
  disposées 3 par ligne, quel que soit le nombre total ; le nom de chaque
  disposition vient du nombre de photos qui tiennent à l'écran sans
  scroller (6 pour un ratio 3:2, 9 pour un carré), pas d'un total figé.
- **Police "titres" / "corps de texte"** (choix admin,
  `site_settings.font_title` / `font_body`) : next/font/google charge et
  auto-héberge chaque police au build, il ne peut donc pas aller chercher
  un nom de police arbitraire à l'exécution — même contrainte que pour la
  disposition de galerie ci-dessus, donc même solution : deux options
  préchargées par rôle (Playfair Display / Give You Glory pour les
  titres, Inter / Quicksand pour le corps), choisies dans `layout.tsx` et
  aliasées à `--font-display`/`--font-body` via le même mécanisme
  d'override inline sur `<html>` que la palette de couleurs. Le
  prénom/nom du hero suit délibérément le corps de texte, pas les
  titres — seul le wordmark ("Portfolio") reste sur la police de titre.
- **`display_order`** existe en base (tri secondaire de la home) mais
  n'a pas de champ dans le formulaire admin — non demandé dans le brief.
  Reste à `0` sauf modification manuelle en SQL.
- **`tailwind.config.ts`** est présent mais Tailwind v4 lit en réalité ses
  tokens dans `globals.css` (bloc `@theme`) — le fichier config sert de
  miroir typé pour l'éditeur/outillage, pas de source de vérité.

## Historique : incident `next lint`

`eslint-config-next` était resté sur `^15.5.24` alors que `next` tournait
déjà en 16.x (même désynchronisation que le point Next.js 16 ci-dessus) :
`next lint` plantait sur une résolution de plugin ESLint. Corrigé en
alignant `eslint-config-next` sur `^16.3.3` — son export map a changé
entre les deux versions (`eslint-config-next/core-web-vitals` sans
extension `.js`, `eslint.config.mjs` mis à jour en conséquence).
`next build` et `next dev` n'avaient jamais été affectés.
