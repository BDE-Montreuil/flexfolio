import Image from "next/image";
import Link from "next/link";
import type { ProjectWithImages } from "@/lib/types";
import { formatProjectDate, getFeaturedImage } from "@/lib/project-helpers";
import { positionToObjectPosition } from "@/lib/image-position";

export function ProjectCard({ project }: { project: ProjectWithImages }) {
  const featured = getFeaturedImage(project.project_images);

  return (
    <Link
      href={`/projets/${project.slug}`}
      className="group relative mb-4 block break-inside-avoid overflow-hidden sm:mb-6"
    >
      <div className="relative w-full">
        {featured ? (
          <Image
            src={featured.image_url}
            alt={project.title}
            width={800}
            height={featured.image_orientation === "portrait" ? 1000 : 550}
            style={{ objectPosition: positionToObjectPosition(featured.image_position) }}
            className="w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-secondary">
            <span className="label-eyebrow text-brand-ink-muted">Sans image</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <span className="block text-xs uppercase tracking-[0.1em] text-white">
            {project.title}
          </span>
          <span className="block text-[11px] text-white/80">
            {formatProjectDate(project.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
