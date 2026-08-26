"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "food-images";

/** Uploadt een productfoto en geeft de publieke URL terug. */
export async function uploadFoodImage(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
