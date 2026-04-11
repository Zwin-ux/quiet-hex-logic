import { memo, forwardRef } from "react";
import { cn } from "@/lib/utils";

const features = [
  {
    id: "01",
    label: "Worlds",
    description:
      "A recurring host-owned space with branding, roles, moderation, and room identity.",
  },
  {
    id: "02",
    label: "Instances",
    description:
      "Games are live rooms. Finals boards, analysis tables, and lessons should all feel like venue objects.",
  },
  {
    id: "03",
    label: "Events",
    description:
      "Pairings, standings, rounds, and scheduling should sit on top of those rooms without turning the product into bracket sludge.",
  },
  {
    id: "04",
    label: "Presence",
    description:
      "Hosts, players, spectators, and commentators should feel visibly present in the same live environment.",
  },
] as const;

export const FeaturesShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      return (
        <section ref={ref} className={cn("border-y border-black/10 bg-transparent py-14 md:py-16", className)} {...props}>
          <div className="mx-auto board-page-width">
            <div className="mb-10 max-w-3xl">
              <p className="board-rail-label">Built around live primitives</p>
              <h2 className="board-page-title mt-4 max-w-[12ch] text-[#0a0a0a]">
                BOARD communicates through rooms, rails, and live systems.
              </h2>
              <p className="board-copy-lg mt-4 max-w-2xl">
                The product advantage is not more pages. It is stronger primitives,
                calmer event surfaces, and host-owned places that feel real.
              </p>
            </div>

            <div className="grid gap-0 border-y border-black/10 xl:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="relative border-b border-black/10 px-0 py-0 md:grid md:grid-cols-[72px_minmax(0,1fr)] md:gap-0 xl:block xl:min-h-[220px] xl:border-b-0 xl:border-r xl:border-black/10 xl:last:border-r-0"
                >
                  <div className="h-full px-6 py-6 md:px-7 xl:flex xl:h-full xl:flex-col xl:justify-between">
                    <div className="flex items-center justify-between border-b border-black/10 pb-4">
                      <p className="board-rail-label text-[10px]">{feature.id}</p>
                      <div className="h-px w-14 bg-black/10" />
                    </div>
                    <div className="pt-5 xl:pt-8">
                      <p className="board-section-title text-[#0a0a0a]">
                        {feature.label}
                      </p>
                      <p className="board-copy mt-4 max-w-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
  ),
);

FeaturesShowcase.displayName = "FeaturesShowcase";
