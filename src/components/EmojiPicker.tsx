import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Image as ImageIcon, Smile, Link2 } from "lucide-react";

const CURATED = [
  "📘",
  "📗",
  "📕",
  "📙",
  "📚",
  "🎓",
  "🧠",
  "💡",
  "🚀",
  "🔭",
  "💻",
  "🖥️",
  "📱",
  "⌨️",
  "🖱️",
  "🌐",
  "🔐",
  "🛡️",
  "🤖",
  "☁️",
  "🎨",
  "🖌️",
  "✏️",
  "📝",
  "📐",
  "📊",
  "📈",
  "🧮",
  "⚗️",
  "🔬",
  "🧪",
  "🛠️",
  "⚙️",
  "🔧",
  "🏗️",
  "🎬",
  "🎵",
  "🎮",
  "📷",
  "🎙️",
  "💰",
  "💼",
  "📦",
  "🌱",
  "⚡",
  "🔥",
  "🏆",
  "⭐",
  "🎯",
  "🧭",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "url">("emoji");
  const [imgError, setImgError] = useState(false);

  const isUrl =
    value &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/") ||
      value.startsWith("data:"));

  return (
    <div className="flex items-center gap-2 max-w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 flex items-center gap-2 max-w-full overflow-hidden border-border/80 hover:bg-secondary/60"
          >
            {isUrl && !imgError ? (
              <img
                src={value}
                alt="Icon"
                className="h-6 w-6 rounded object-cover shrink-0 border border-border/40"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-xl shrink-0 leading-none">{!isUrl ? value || "📘" : "📘"}</span>
            )}
            <span className="text-xs truncate font-medium max-w-[140px] text-left">
              {isUrl ? "Custom Image URL" : value ? `Emoji (${value})` : "Select Icon"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3 space-y-3 shadow-xl" align="start">
          <div className="grid grid-cols-2 rounded-lg bg-secondary/50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab("emoji")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition ${
                tab === "emoji"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smile className="h-3.5 w-3.5" />
              Emoji Presets
            </button>
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition ${
                tab === "url"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Image URL
            </button>
          </div>

          {tab === "emoji" ? (
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 border rounded-lg border-border/40 bg-secondary/10">
              {CURATED.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setImgError(false);
                    onChange(e);
                    setOpen(false);
                  }}
                  className={`h-8 w-8 grid place-items-center rounded-md text-lg hover:bg-secondary transition ${
                    value === e ? "bg-primary/20 ring-1 ring-primary" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={value}
                  onChange={(e) => {
                    setImgError(false);
                    onChange(e.target.value);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="pl-8 text-xs h-9 bg-secondary/30"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Paste an image URL or choose from emoji presets above.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
