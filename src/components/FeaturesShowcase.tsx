import { memo, forwardRef, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CounterBlock } from "@/components/board/CounterBlock";
import { StateTag } from "@/components/board/StateTag";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FIRST_TOURNAMENT } from "@/lib/launchAnnouncements";
import { cn } from "@/lib/utils";

type FeaturedTournament = {
  id: string;
  name: string;
  status: string;
  competitive_mode: boolean;
  start_time: string | null;
  participant_count: number;
};

const STATUS_ORDER: Record<string, number> = {
  registration: 0,
  seeding: 1,
  active: 2,
  completed: 3,
};

const SCAFFOLD_SNIPPET = `npm run scaffold:game
-- --key centerwin
--name "Center Win"`;

const RUNNER_SNIPPET = `$env:BOARD_BOT_TOKEN=...
node tools/bot-runner/random.mjs`;

const BUILDER_LINKS = [
  { title: "Docs", href: "/docs" },
  { title: "Runner lab", href: "/workbench" },
  { title: "Mods", href: "/mods" },
] as const;

function formatFeaturedDate(startTime: string | null) {
  if (!startTime) {
    return `${FIRST_TOURNAMENT.fullDate} / ${FIRST_TOURNAMENT.time}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startTime));
}

export const CapabilityShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    const [featuredTournament, setFeaturedTournament] = useState<FeaturedTournament | null>(null);
    const [openCount, setOpenCount] = useState<number | null>(null);
    const [liveCount, setLiveCount] = useState<number | null>(null);

    useEffect(() => {
      let active = true;

      const loadFeaturedTournament = async () => {
        try {
          const { data, error } = await supabase
            .from("tournaments")
            .select(
              `
              id,
              name,
              status,
              competitive_mode,
              start_time,
              created_at,
              tournament_participants(count)
            `,
            )
            .order("created_at", { ascending: false })
            .limit(12);

          if (error) throw error;
          if (!active) return;

          const tournaments =
            data?.map((tournament) => ({
              id: tournament.id,
              name: tournament.name,
              status: tournament.status,
              competitive_mode: tournament.competitive_mode,
              start_time: tournament.start_time,
              participant_count: tournament.tournament_participants?.[0]?.count ?? 0,
              created_at: "created_at" in tournament ? (tournament as any).created_at : null,
            })) ?? [];

          const sorted = tournaments.sort((a, b) => {
            const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
            if (statusDiff !== 0) return statusDiff;

            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });

          setFeaturedTournament(
            sorted[0]
              ? {
                  id: sorted[0].id,
                  name: sorted[0].name,
                  status: sorted[0].status,
                  competitive_mode: sorted[0].competitive_mode,
                  start_time: sorted[0].start_time,
                  participant_count: sorted[0].participant_count,
                }
              : null,
          );
          setOpenCount(
            tournaments.filter((tournament) => tournament.status === "registration").length,
          );
          setLiveCount(
            tournaments.filter(
              (tournament) =>
                tournament.status === "active" || tournament.status === "seeding",
            ).length,
          );
        } catch (error) {
          console.error("Failed to load featured home tournament:", error);
          if (!active) return;
          setFeaturedTournament(null);
          setOpenCount(null);
          setLiveCount(null);
        }
      };

      void loadFeaturedTournament();

      return () => {
        active = false;
      };
    }, []);

    const featuredDate = useMemo(
      () => formatFeaturedDate(featuredTournament?.start_time ?? null),
      [featuredTournament?.start_time],
    );

    return (
      <section
        ref={ref}
        className={cn("board-public-section py-16 md:py-20", className)}
        {...props}
      >
        <div className="board-page-width board-public mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_400px]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="border border-[#090909] bg-[#090909] px-5 py-5 text-[#f3efe6] md:px-6 md:py-6"
            >
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="board-public-label text-white/56">Engine / modding</p>
                  <h2 className="board-public-display max-w-[11ch] text-[clamp(2.2rem,4vw,4rem)] text-[#f3efe6]">
                    Build new boards.
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border border-white/12 bg-white/[0.03] p-4">
                    <p className="board-public-label text-white/48">Scaffold</p>
                    <pre className="mt-4 overflow-x-auto font-['IBM_Plex_Mono'] text-[0.78rem] font-semibold leading-6 tracking-[0.04em] text-[#f3efe6]">
                      {SCAFFOLD_SNIPPET}
                    </pre>
                  </div>

                  <div className="border border-white/12 bg-white/[0.03] p-4">
                    <p className="board-public-label text-white/48">Runner</p>
                    <pre className="mt-4 overflow-x-auto font-['IBM_Plex_Mono'] text-[0.78rem] font-semibold leading-6 tracking-[0.04em] text-[#f3efe6]">
                      {RUNNER_SNIPPET}
                    </pre>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
                  {BUILDER_LINKS.map((link) => (
                    <Button
                      key={link.href}
                      asChild
                      variant="outline"
                      className="w-full justify-between border-white/14 bg-white/[0.03] text-[#f3efe6] hover:bg-white/[0.08] hover:text-[#f3efe6]"
                    >
                      <Link to={link.href}>
                        <span>{link.title}</span>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <section className="landing-open-poster">
                <p className="landing-open-poster__date">{FIRST_TOURNAMENT.shortDate}</p>
                <div className="space-y-2">
                  <p className="text-[1rem] font-semibold uppercase tracking-[0.12em] text-[#17181c]">
                    {featuredDate}
                  </p>
                  <h2 className="text-[clamp(2rem,4vw,3.15rem)] font-black leading-[0.92] tracking-[-0.07em] text-[#090909]">
                    {featuredTournament?.name || FIRST_TOURNAMENT.title}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StateTag tone={featuredTournament?.competitive_mode ? "warning" : "normal"}>
                    {featuredTournament?.competitive_mode ? "competitive" : "casual"}
                  </StateTag>
                  <StateTag>{featuredTournament?.status || "registration"}</StateTag>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CounterBlock label="open" value={openCount ?? "--"} />
                  <CounterBlock label="live" value={liveCount ?? "--"} />
                  <CounterBlock
                    label="players"
                    value={featuredTournament?.participant_count ?? "--"}
                  />
                </div>

                <div className="landing-open-poster__actions">
                  <Button
                    asChild
                    variant="hero"
                    className="justify-between bg-[#090909] text-[#f3efe6] hover:bg-[#17181c]"
                  >
                    <Link to="/events">
                      <span>Open bracket</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </section>
            </motion.aside>
          </div>
        </div>
      </section>
    );
  }),
);

CapabilityShowcase.displayName = "CapabilityShowcase";
