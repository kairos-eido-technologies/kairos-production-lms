import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB hard cap for localStorage
const WARN_BYTES = 4 * 1024 * 1024;

export function FileUploadButton({
  accept, label = "Upload", onUpload,
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
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB for local storage.`);
      e.target.value = "";
      return;
    }
    if (file.size > WARN_BYTES) {
      toast.warning(`Large file (${(file.size / 1024 / 1024).toFixed(1)} MB) — may slow the app.`);
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // optionally include ownerId here if available in your app
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = json.url as string;
      if (!url) throw new Error("No url returned");
      onUpload(url, file);
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handle} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        {label}
      </Button>
    </>
  );
}