import { StateTag } from "@/components/board/StateTag";
import { getGameMeta } from "@/lib/gameMetadata";
import { getAsciiGamePreview } from "@/lib/asciiGames.ts";
import { cn } from "@/lib/utils";

type AsciiGameCardProps = {
  gameKey: string;
  className?: string;
  size?: "compact" | "feature";
  titleBarEyebrow?: string;
};

export function AsciiGameCard({
  gameKey,
  className,
  size = "compact",
  titleBarEyebrow = "Board specimen",
}: AsciiGameCardProps) {
  const preview = getAsciiGamePreview(gameKey);
  const meta = getGameMeta(gameKey);
  const Icon = meta.icon;
  const isFeature = size === "feature";
  const previewFrame = preview.frames[Math.min(2, preview.frames.length - 1)] ?? preview.frames[0];

  return (
    <section className={cn("retro-window", className)}>
      <div className="retro-window__titlebar">
        <div className="min-w-0">
          <p className="retro-window__eyebrow">{titleBarEyebrow}</p>
          <div className="mt-1 flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", meta.accentClass)} />
            <div className="retro-window__title">{preview.label}</div>
          </div>
        </div>
        <div className="shrink-0">
          <StateTag tone="normal">{preview.status}</StateTag>
        </div>
      </div>

      <div className="retro-window__body retro-window__body--shell">
        <div className="overflow-hidden border border-black/12 bg-[#121316] text-[#f5f1e8]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-3 py-2">
            <span className="board-rail-label text-[#d8d1c2]">{preview.label}</span>
            <span className="board-rail-label text-[#8e8a80]">frame 03</span>
          </div>
          <pre
            aria-label={`${preview.label} board specimen.`}
            className={cn(
              "m-0 overflow-x-auto px-3 py-4 font-['IBM_Plex_Mono'] font-semibold leading-[1.16] tracking-[0.04em] text-[#f5f1e8]",
              isFeature ? "min-h-[13.8rem] text-[0.72rem]" : "min-h-[11.6rem] text-[0.64rem]",
            )}
          >
            {previewFrame}
          </pre>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-3 py-2">
            <span className="board-rail-label text-[#d8d1c2]">{preview.note}</span>
            <span className="board-rail-label text-[#8e8a80]">static</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="board-meta-chip">{meta.tagline}</span>
        </div>
      </div>
    </section>
  );
}
