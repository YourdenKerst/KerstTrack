"use client";

import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadFoodImage } from "@/lib/storage";

export function ImageUploadField({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFoodImage(userId, file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element -- gebruikersfoto via Supabase Storage, geen build-time optimalisatie nodig */}
        <img src={value} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Verwijder afbeelding"
          className="absolute -right-2 -top-2 rounded-full bg-surface p-1 text-muted-foreground shadow-sm active:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors active:border-primary active:text-primary disabled:opacity-50"
    >
      <Camera size={20} />
      <span className="text-[10px] font-medium">{uploading ? "Bezig…" : "Afbeelding"}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </button>
  );
}
