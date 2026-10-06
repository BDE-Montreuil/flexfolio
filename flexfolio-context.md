# Flexfolio Project Context

## 📌 Overview
**Flexfolio** is a modular, highly customizable portfolio website. It consists of a public-facing showcase and a private admin panel that allows the owner to manage projects, site identity, and overall artistic direction without touching the code.

## 🛠 Tech Stack
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (using `@theme` tokens in `globals.css`), [Radix UI](https://www.radix-ui.com/), [CVA](https://cva.style/)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **Key Libraries:**
  - `@dnd-kit`: For drag-and-drop reordering of project images.
  - `lucide-react`: For iconography.
  - `sonner`: For toast notifications.

## 🏗 Architecture & Structure

### 📁 Directory Layout
- `src/app`: Next.js App Router pages.
  - `(public)`: Home page, `/about`, and `/projets/[slug]`.
  - `/admin`: Private admin panel (Login, Dashboard, Settings).
- `src/actions`: Server actions for interacting with Supabase (Auth, Projects, Site Settings).
- `src/components`:
  - `ui/`: Low-level primitive components (Buttons, Inputs, etc., styled like shadcn/ui).
  - `admin/`: Components specific to the admin panel (Image uploaders, settings forms).
  - `about-section.tsx`, `hero-section.tsx`, etc.: High-level layout components.
- `src/lib`:
  - `supabase/`: Client and server-side Supabase configuration.
  - `types.ts`: Centralized TypeScript interfaces for the data model.
  - `site-config.ts`: Fallback configuration for site settings.
- `supabase/init.sql`: idempotent SQL for Flexfolio's tables, RLS and storage bucket, applied after flexstaff's `supabase/init.sql` (suite rights).

### 🗄 Data Model
- **`Project`**: Core project details (title, slug, description, tech stack, visibility).
- **`ProjectImage`**: Images linked to a project, including:
  - `is_featured`: Whether the image is the main showcase image.
  - `image_position`: Positioning for the 3x3 cropping grid (`top-left`, `center`, etc.).
  - `image_orientation`: `portrait` or `landscape`.
- **`SiteSettings`**: A singleton table containing global configurations:
  - **Identity:** Name, role, wordmark.
  - **About:** Custom text paragraphs and profile image.
  - **Appearance:** 4-color palette (background, ink, card, accent) and font pairings (Title/Body).
  - **Gallery Layout:** Choice between `3x2` (3:2 ratio) and `3x3` (square) for project galleries.
  - **Contact & CV:** Email, phone, social links, and a CV PDF URL.

## 🚀 Key Features & Logic

### 🎨 Dynamic Artistic Direction
The site's look and feel are driven by the database. Palette and typography choices are applied as CSS variables on the `<html>` element, allowing real-time updates from the admin panel without rebuilding the app.

### 🖼 Project Image Management
- **Admin Upload:** Images are uploaded to Supabase Storage under `projects/{project_id}/`.
- **Custom Cropping:** Project gallery thumbnails use a fixed aspect ratio and `object-position` (based on the `image_position` field) to allow precise framing of the image.
- **Lightbox:** Clicking a thumbnail opens the full image in a lightbox using `object-contain`.

### 🔐 Admin Security
- No public registration. Admin accounts must be created directly via the Supabase dashboard.
- The admin section is protected by Supabase Auth.

## ⚙️ Technical Decisions
- **Dynamic Rendering:** Pages reading from Supabase use `export const dynamic = "force-dynamic"` to ensure content is always fresh.
- **Next.js 16:** Uses latest conventions (e.g., `params` as a Promise).
- **Tailwind v4:** Tokens are defined in CSS rather than a JS config file for the primary source of truth.
