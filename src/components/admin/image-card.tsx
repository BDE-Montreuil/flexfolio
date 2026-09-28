"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { PositionGrid } from "@/components/admin/position-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { positionToObjectPosition } from "@/lib/image-position";
import { cn } from "@/lib/utils";
import type { EditableImage, ImageOrientation, ImagePosition } from "@/lib/types";

export function ImageCard({
  image,
  position,
  onPatch,
  onSetFeatured,
  onRemove,
}: {
  image: EditableImage;
  position: number;
  onPatch: (key: string, patch: Partial<EditableImage>) => void;
  onSetFeatured: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-full flex-col gap-3 border border-border bg-card p-3",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none text-brand-ink-muted active:cursor-grabbing"
          aria-label="Réordonner"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
        <span className="flex-1 truncate text-xs text-brand-ink-muted" title={image.fileName}>
          {image.fileName}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRemove(image.key)}
          aria-label="Supprimer l'image"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative h-40 w-full overflow-hidden bg-secondary">
        <Image
          src={image.publicUrl}
          alt=""
          fill
          unoptimized
          style={{ objectPosition: positionToObjectPosition(image.position) }}
          className="object-cover"
        />
        <span
          className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center bg-black/70 text-[11px] font-medium text-white"
          title={`Position ${position} dans la grille publique`}
        >
          {position}
        </span>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="radio"
          name="featured-image"
          checked={image.isFeatured}
          onChange={() => onSetFeatured(image.key)}
          className="accent-brand-accent"
        />
        Image featured
      </label>

      <div className="flex gap-1">
        {(["landscape", "portrait"] as ImageOrientation[]).map((orientation) => (
          <button
            key={orientation}
            type="button"
            onClick={() => onPatch(image.key, { orientation })}
            className={cn(
              "flex-1 border border-border py-1 text-xs capitalize transition-colors",
              image.orientation === orientation
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary",
            )}
          >
            {orientation === "landscape" ? "Paysage" : "Portrait"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-brand-ink-muted">Position</Label>
        <PositionGrid
          value={image.position}
          onChange={(position: ImagePosition) => onPatch(image.key, { position })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`caption-${image.key}`} className="text-xs text-brand-ink-muted">
          Légende
        </Label>
        <Input
          id={`caption-${image.key}`}
          value={image.caption}
          onChange={(e) => onPatch(image.key, { caption: e.target.value })}
          placeholder="Optionnelle"
        />
      </div>
    </div>
  );
}
