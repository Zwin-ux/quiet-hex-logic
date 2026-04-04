import { memo, forwardRef } from "react";
import { Blocks, Rows3, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Blocks,
    label: "Worlds",
    description:
      "A recurring host-owned space with branding, roles, moderation, and room identity.",
  },
  {
    icon: Rows3,
    label: "Instances",
    description:
      "Games are live rooms. Finals boards, analysis tables, and lessons should all feel like venue objects.",
  },
  {
    icon: Trophy,
    label: "Events",
    description:
      "Pairings, standings, rounds, and scheduling should sit on top of those rooms without turning the product into bracket sludge.",
  },
  {
    icon: Users,
    label: "Presence",
    description:
      "Hosts, players, spectators, and commentators should feel visibly present in the same live environment.",
  },
] as const;

export const FeaturesShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      return (
        <section
          ref={ref}
          className={cn("border-b border-black/8 bg-[#f8f7f3] px-6 py-20", className)}
          {...props}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-3xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#737373]">
                Built Around Host Control
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.08em] text-[#0a0a0a] md:text-5xl">
                BOARD should feel like a venue system, not a game portal.
              </h2>
              <p className="mt-4 text-lg font-medium leading-8 text-[#555]">
                The product advantage is not more pages. It is stronger primitives,
                cleaner room logic, and calmer event surfaces.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-[1.75rem] border border-black/10 bg-white p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-[#f3f3f1]">
                    <feature.icon className="h-5 w-5 text-[#0a0a0a]" />
                  </div>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#0a0a0a]">
                    {feature.label}
                  </p>
                  <p className="mt-3 text-base font-medium leading-7 text-[#5c5c5c]">
                    {feature.description}
                  </p>
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
