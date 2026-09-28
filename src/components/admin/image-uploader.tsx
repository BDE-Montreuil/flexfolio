"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { UploadCloudIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { IMMUTABLE_CACHE_CONTROL, prepareImageForUpload } from "@/lib/compress-image";
import { safeFileName } from "@/lib/storage-path";
import type { EditableImage } from "@/lib/types";

const BUCKET = "project-images";

export function ImageUploader({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded: (image: EditableImage) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const supabase = createClient();
    setIsUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const { file: prepared, orientation } = await prepareImageForUpload(file);
      const path = `projects/${projectId}/${crypto.randomUUID()}-${safeFileName(prepared.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, prepared, {
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        contentType: prepared.type,
      });

      if (error) {
        toast.error(`Échec de l'upload de ${file.name} : ${error.message}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      onUploaded({
        key: crypto.randomUUID(),
        storagePath: path,
        publicUrl,
        fileName: prepared.name,
        caption: "",
        isFeatured: false,
        orientation: orientation ?? "landscape",
        position: "center",
      });
    }

    setIsUploading(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-6 py-10 text-center transition-colors",
        isDragging && "border-brand-accent bg-secondary",
      )}
    >
      <UploadCloudIcon className="h-6 w-6 text-brand-ink-muted" />
      <p className="text-sm text-brand-ink-muted">
        {isUploading
          ? "Envoi en cours..."
          : "Glisse des images ici, ou clique pour en choisir"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
