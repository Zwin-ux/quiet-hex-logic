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
        <section ref={ref} className={cn("border-y border-black/10 bg-transparent py-20", className)} {...props}>
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12 max-w-3xl">
              <p className="board-rail-label">Built around live primitives</p>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.08em] text-[#0a0a0a] md:text-5xl">
                BOARD communicates through rooms, rails, and live systems.
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#555]">
                The product advantage is not more pages. It is stronger primitives,
                calmer event surfaces, and host-owned places that feel real.
              </p>
            </div>

            <div className="grid gap-0 border-y border-black/10 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="relative min-h-[260px] border-b border-black/10 md:border-b-0 md:border-r md:border-black/10 xl:last:border-r-0"
                >
                  <div className="flex h-full flex-col justify-between px-6 py-7 md:px-7">
                    <div className="flex items-center justify-between border-b border-black/10 pb-4">
                      <p className="board-rail-label text-[10px]">{feature.id}</p>
                  <div className="h-px w-14 bg-black/10" />
                    </div>

                    <div className="pt-8">
                      <p className="text-2xl font-bold tracking-[-0.05em] text-[#0a0a0a]">
                        {feature.label}
                      </p>
                      <p className="mt-4 max-w-sm text-base leading-7 text-[#5c5c5c]">
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
