import type { ProjectWithImages } from "@/lib/types";
import { ProjectCard } from "@/components/project-card";

export function ProjectGrid({ projects }: { projects: ProjectWithImages[] }) {
  if (projects.length === 0) {
    return (
      <p className="label-eyebrow px-6 py-16 text-center text-brand-ink-muted">
        Aucun projet à afficher pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="columns-1 gap-4 px-4 pb-10 pt-6 sm:columns-2 sm:gap-6 sm:px-8 sm:pt-8 lg:columns-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
