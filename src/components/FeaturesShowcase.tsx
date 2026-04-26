import { memo, forwardRef, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Bot, Hammer, Mail, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { CounterBlock } from "@/components/board/CounterBlock";
import { StateTag } from "@/components/board/StateTag";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  BOARD_CONTACT_EMAIL,
  BOARD_HIRING_GMAIL_URL,
  FIRST_TOURNAMENT,
} from "@/lib/launchAnnouncements";
import { cn } from "@/lib/utils";

type FeaturedTournament = {
  id: string;
  name: string;
  description: string | null;
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

const SAMPLE_MODS = [
  "Misere Tic Tac Toe",
  "Connect 3 Blitz",
  "Endgame Arena",
  "No Pie Rule",
] as const;

const BUILDER_LINKS = [
  { title: "Manual", href: "/docs" },
  { title: "Runner lab", href: "/workbench" },
  { title: "Mods", href: "/mods" },
  { title: "Bot arena", href: "/arena" },
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
              description,
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
              description: tournament.description,
              status: tournament.status,
              competitive_mode: tournament.competitive_mode,
              start_time: tournament.start_time,
              participant_count: tournament.tournament_participants?.[0]?.count ?? 0,
              created_at: "created_at" in tournament ? (tournament as any).created_at : null,
            })) ?? [];

          const sorted = tournaments.sort((a, b) => {
            const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
            if (statusDiff !== 0) return statusDiff;

            const aTime = "created_at" in a && a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = "created_at" in b && b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });

          setFeaturedTournament(
            sorted[0]
              ? {
                  id: sorted[0].id,
                  name: sorted[0].name,
                  description: sorted[0].description,
                  status: sorted[0].status,
                  competitive_mode: sorted[0].competitive_mode,
                  start_time: sorted[0].start_time,
                  participant_count: sorted[0].participant_count,
                }
              : null,
          );
          setOpenCount(tournaments.filter((tournament) => tournament.status === "registration").length);
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
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="board-public-label text-white/56">Engine / modding</p>
                    <h2 className="board-public-display max-w-[13ch] text-[clamp(2.2rem,4vw,4rem)] text-[#f3efe6]">
                      Scaffold. Run. Publish.
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

                  <div className="grid gap-4 border-t border-white/10 pt-5 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="border border-white/12 bg-white/[0.03] p-4">
                      <p className="board-public-label text-white/48">Workshop set</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {SAMPLE_MODS.map((modName) => (
                          <div key={modName} className="border border-white/10 px-3 py-3">
                            <p className="text-[0.95rem] font-semibold leading-6 text-[#f3efe6]">
                              {modName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
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
                </div>

                <div className="border border-white/12 bg-white/[0.03] p-4">
                  <p className="board-public-label text-white/48">Live builder loop</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-start gap-3 border-t border-white/10 pt-4">
                      <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
                      <p className="text-[0.98rem] leading-7 text-white/78">
                        Add a board through the scaffold, not a manual splice.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 border-t border-white/10 pt-4">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
                      <p className="text-[0.98rem] leading-7 text-white/78">
                        Run workers against the same move loop the live tables use.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 border-t border-white/10 pt-4">
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
                      <p className="text-[0.98rem] leading-7 text-white/78">
                        Publish rule sets and pull them into local play or rooms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
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
                  <p className="board-public-copy text-[1rem] text-[#23252b]">
                    {featuredTournament?.description || FIRST_TOURNAMENT.detail}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StateTag tone={featuredTournament?.competitive_mode ? "warning" : "normal"}>
                    {featuredTournament?.competitive_mode ? "competitive" : "casual"}
                  </StateTag>
                  <StateTag>
                    {featuredTournament?.status || "registration"}
                  </StateTag>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CounterBlock label="open" value={openCount ?? "—"} />
                  <CounterBlock label="live" value={liveCount ?? "—"} />
                  <CounterBlock
                    label="players"
                    value={featuredTournament?.participant_count ?? "—"}
                  />
                </div>

                <div className="landing-open-poster__actions">
                  <Button asChild variant="hero" className="justify-between bg-[#090909] text-[#f3efe6] hover:bg-[#17181c]">
                    <Link to="/events">
                      <span>Open bracket</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-between">
                    <Link to="/hiring">
                      <span>Crew call</span>
                      <Hammer className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </section>

              <motion.a
                initial={{ opacity: 0, y: 16, rotate: -2.2, scale: 0.98 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotate: [0.4, -0.5, 0.3, 0.1],
                  scale: 1,
                }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  opacity: { duration: 0.38, ease: "easeOut" },
                  y: { duration: 0.38, ease: "easeOut" },
                  scale: { duration: 0.38, ease: "easeOut" },
                  rotate: {
                    duration: 3.8,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  },
                }}
                href={BOARD_HIRING_GMAIL_URL}
                target="_blank"
                rel="noreferrer"
                className="wood-note landing-crew-note group relative block p-4"
              >
                <div className="wood-note__grain pointer-events-none absolute inset-0" />
                <div className="relative grid gap-4 border border-black/24 bg-[rgba(64,35,16,0.12)] p-4">
                  <div>
                    <p className="board-public-label text-[#2e1b0b]/72">Crew call</p>
                    <h3 className="mt-3 text-[1.9rem] font-black leading-[0.94] tracking-[-0.06em] text-[#1e130a]">
                      Check-in. Seating. Rounds.
                    </h3>
                  </div>

                  <div className="border border-black/14 bg-white/24 px-3 py-3">
                    <p className="break-all text-[14px] font-semibold leading-6 text-[#1e130a]">
                      {BOARD_CONTACT_EMAIL}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 border border-black/24 bg-white/28 px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e130a] transition-transform duration-150 group-hover:-translate-y-0.5">
                    <Mail className="h-4 w-4" />
                    <span>Email Mazen</span>
                  </div>
                </div>
              </motion.a>
            </motion.aside>
          </div>
        </div>
      </section>
    );
  }),
);

CapabilityShowcase.displayName = "CapabilityShowcase";
