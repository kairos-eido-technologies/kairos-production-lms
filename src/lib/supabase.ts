import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://pzmtbnsquhlplakcaezl.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXRibnNxdWhscGxha2NhZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxNzYsImV4cCI6MjEwMjEzNjE3Nn0.ENqDZPXBDuS2FtRJt2Z6pLMHjVm1tqRMDKm-Y1EkM5w";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Direct Browser Upload to Supabase Storage bucket
 * Skips Vercel serverless body size limits (supports 100MB+ files)
 */
export async function uploadToSupabaseStorage(
  file: File,
  bucketName: string = "course-materials"
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${fileId}-${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage upload error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || `/api/files?id=${encodeURIComponent(fileId)}`;
  } catch (err) {
    console.error("uploadToSupabaseStorage exception:", err);
    return null;
  }
}
