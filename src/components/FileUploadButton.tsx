import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadToSupabaseStorage, isSupabaseConfigured } from "@/lib/supabase";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB limit
const WARN_BYTES = 10 * 1024 * 1024;

export function FileUploadButton({
  accept,
  label = "Upload",
  onUpload,
}: {
  accept: string;
  label?: string;
  onUpload: (url: string, file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max limit is 50 MB.`,
      );
      e.target.value = "";
      return;
    }

    if (file.size > WARN_BYTES) {
      toast.warning(`Large file (${(file.size / 1024 / 1024).toFixed(1)} MB) — uploading...`);
    }

    setBusy(true);

    try {
      let fileUrl = "";

      // 1. Try Supabase Storage direct browser upload first (best for Vercel production)
      if (isSupabaseConfigured) {
        const supaUrl = await uploadToSupabaseStorage(file);
        if (supaUrl) fileUrl = supaUrl;
      }

      // 2. Attempt local server API upload if Supabase is not configured
      if (!fileUrl) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/files", {
            method: "POST",
            body: fd,
            credentials: "same-origin",
          });
          if (res.ok) {
            const json = await res.json();
            if (json.url) fileUrl = json.url as string;
          }
        } catch {
          // Fallback
        }
      }

      // 3. Fallback to FileReader Base64 Data URL
      if (!fileUrl) {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (!fileUrl) throw new Error("Could not process uploaded file");

      onUpload(fileUrl, file);
      toast.success(`Successfully uploaded ${file.name}`);
    } catch (err) {
      console.error("FileUploadButton error:", err);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handle} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="cursor-pointer"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-primary" />
        ) : (
          <Upload className="h-3.5 w-3.5 mr-1.5 text-primary" />
        )}
        {label}
      </Button>
    </>
  );
}
