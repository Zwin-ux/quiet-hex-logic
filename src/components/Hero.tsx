import { memo, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Hero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();

      const scrollToGames = () => {
        document.getElementById("games")?.scrollIntoView({ behavior: "smooth" });
      };

      return (
        <section
          ref={ref}
          className={cn(
            "relative overflow-hidden border-b border-black/8 bg-[#f5f4ef]",
            className,
          )}
          {...props}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(10,10,10,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.65),transparent)]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-28 md:pb-20 md:pt-32">
            <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.85fr]">
              <div className="max-w-3xl">
                <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.32em] text-[#6b6b6b]">
                  BOARD / Quiet Hex Logic
                </p>
                <h1 className="max-w-4xl text-5xl font-black tracking-[-0.08em] text-[#0a0a0a] sm:text-6xl md:text-7xl lg:text-[5.5rem] lg:leading-[0.96]">
                  Host your own board game world.
                </h1>
                <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#4a4a4a] md:text-2xl md:leading-10">
                  BOARD gives clubs, local organizers, and creators their own live
                  competition server: worlds, rulesets, rooms, and events under
                  their control.
                </p>
                <p className="mt-4 max-w-xl text-sm font-semibold uppercase tracking-[0.22em] text-[#7b7b7b]">
                  Chess first. Built to grow past chess.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-14 rounded-full bg-[#0a0a0a] px-8 text-base font-bold text-white shadow-none hover:bg-[#1b1b1b]"
                    onClick={() => navigate("/lobby")}
                  >
                    View Live Worlds
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-full border-black/10 bg-white px-8 text-base font-bold text-black shadow-none hover:bg-black/5"
                    onClick={scrollToGames}
                  >
                    Start Practice
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-black/10 bg-[#0a0a0a] p-5 text-white shadow-[0_16px_50px_rgba(0,0,0,0.08)]">
                <div className="mb-5 flex items-center justify-between rounded-[1.3rem] border border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">
                      Live world
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.05em]">
                      Northside Club Open
                    </p>
                  </div>
                  <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/72">
                    online
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    {
                      label: "Instance",
                      value: "Final board / arbiter present / 16 spectating",
                    },
                    {
                      label: "Ruleset",
                      value: "Classical chess / 90+30 / verified seats",
                    },
                    {
                      label: "Presence",
                      value: "42 in venue / 14 spectating / 2 commentators",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/48">
                        {row.label}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-7 text-white/90">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-14 grid gap-4 border-t border-black/8 pt-8 sm:grid-cols-3">
              {[
                [
                  "World",
                  "A host-owned space with members, branding, and recurring identity.",
                ],
                [
                  "Instance",
                  "A live room, not a page. Finals board, lesson room, challenge room, or analysis table.",
                ],
                [
                  "Event",
                  "Pairings, standings, rounds, and scheduling that orchestrate many live instances.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="max-w-sm">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0a0a0a]">
                    {title}
                  </p>
                  <p className="mt-2 text-base font-medium leading-7 text-[#5a5a5a]">
                    {body}
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

Hero.displayName = "Hero";

export default Hero;
