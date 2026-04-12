import { memo, forwardRef } from "react";
import { cn } from "@/lib/utils";

const operatingBlocks = [
  {
    label: "World Blueprint",
    title: "A world is the venue layer.",
    body: "Hosts own identity, membership, and recurring access in one place. Rooms and events inherit from that venue instead of resetting every session.",
  },
  {
    label: "Live Surfaces",
    title: "Boards, rooms, and watch lanes stay adjacent.",
    body: "Final boards, open tables, side analysis, and replay sessions should feel like linked spaces in one system, not separate tools.",
  },
  {
    label: "Host Control",
    title: "Operator actions are part of the product.",
    body: "Create rooms, queue events, moderate spectators, and keep the venue coherent without dropping into admin sludge.",
  },
] as const;

export const FeaturesShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("border-t border-[#0e0e0f]/12 py-16 md:py-20", className)}
        {...props}
      >
        <div className="board-page-width mx-auto grid gap-6 xl:grid-cols-3">
          {operatingBlocks.map((block) => (
            <article key={block.label} className="border border-[#0e0e0f] bg-[#fbfaf8] p-6 md:p-7">
              <p className="board-rail-label text-[11px] text-[#525257]">{block.label}</p>
              <h2 className="mt-4 text-[clamp(1.8rem,2.4vw,2.5rem)] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                {block.title}
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-[#525257]">{block.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }),
);

FeaturesShowcase.displayName = "FeaturesShowcase";
