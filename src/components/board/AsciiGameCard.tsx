import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { StateTag } from "@/components/board/StateTag";
import { getGameMeta } from "@/lib/gameMetadata";
import { getAsciiGamePreview } from "@/lib/asciiGames";
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
  titleBarEyebrow = "Ascii board",
}: AsciiGameCardProps) {
  const preview = getAsciiGamePreview(gameKey);
  const meta = getGameMeta(gameKey);
  const Icon = meta.icon;
  const prefersReducedMotion = useReducedMotion();
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || preview.frames.length <= 1) return;

    const id = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % preview.frames.length);
    }, preview.speedMs);

    return () => window.clearInterval(id);
  }, [prefersReducedMotion, preview.frames.length, preview.speedMs]);

  const frame = preview.frames[frameIndex] ?? preview.frames[0];
  const isFeature = size === "feature";

  return (
    <section className={cn("retro-window", className)}>
      <div className="retro-window__titlebar">
        <div className="min-w-0">
          <p className="retro-window__eyebrow">{titleBarEyebrow}</p>
          <div className="mt-1 flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-white" />
            <div className="retro-window__title">{preview.label}</div>
          </div>
        </div>
        <div className="shrink-0">
          <StateTag tone="success">{preview.status}</StateTag>
        </div>
      </div>

      <div className="retro-window__body retro-window__body--shell">
        <div className="ascii-monitor">
          <div className="ascii-monitor__hud">
            <span>demo</span>
            <span>{preview.note}</span>
            <span>{prefersReducedMotion ? "static" : `frame ${frameIndex + 1}`}</span>
          </div>
          <pre
            className={cn(
              "ascii-monitor__pre",
              isFeature ? "ascii-monitor__pre--feature" : "ascii-monitor__pre--compact",
            )}
            aria-label={`${preview.label} animated ascii board preview`}
          >
            {frame}
          </pre>
          <div className="ascii-monitor__scanline" aria-hidden="true" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="board-meta-chip text-[#00aa00]">{meta.tagline}</span>
          <span className="board-meta-chip text-black/55">system {preview.label.toLowerCase()}</span>
        </div>
      </div>
    </section>
  );
}
