import { memo, forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BOARD_CONTACT_EMAIL,
  BOARD_HIRING_GMAIL_URL,
  FIRST_TOURNAMENT,
} from "@/lib/launchAnnouncements";
import { cn } from "@/lib/utils";

export const HostWorldThesis = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("board-public-section py-16 md:py-20", className)}
        {...props}
      >
        <div className="board-page-width board-public mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1fr)] lg:gap-8">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="landing-open-poster"
            >
              <p className="board-public-label text-[#5c5750]">Founding open</p>
              <p className="landing-open-poster__date">{FIRST_TOURNAMENT.shortDate}</p>
              <div className="space-y-2">
                <p className="text-[1rem] font-semibold uppercase tracking-[0.12em] text-[#17181c]">
                  {FIRST_TOURNAMENT.fullDate}
                </p>
                <p className="board-public-copy text-[1rem] text-[#23252b]">
                  {FIRST_TOURNAMENT.time} / hex / chess / checkers / finals
                </p>
              </div>

              <div className="landing-open-poster__actions">
                <Button asChild variant="hero" className="justify-between bg-[#090909] text-[#f3efe6] hover:bg-[#17181c]">
                  <Link to="/events">
                    <span>Open bracket</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.section>

            <motion.a
              initial={{ opacity: 0, y: 28, rotate: -4, scale: 0.96 }}
              whileInView={{
                opacity: 1,
                y: 0,
                rotate: [0.6, -0.8, 0.4, 0.2],
                scale: 1,
              }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                opacity: { duration: 0.42, ease: "easeOut" },
                y: { duration: 0.42, ease: "easeOut" },
                scale: { duration: 0.42, ease: "easeOut" },
                rotate: {
                  duration: 4.1,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                },
              }}
              href={BOARD_HIRING_GMAIL_URL}
              target="_blank"
              rel="noreferrer"
              className="wood-note landing-crew-note group relative block p-5 md:p-7"
            >
              <div className="wood-note__grain absolute inset-0 pointer-events-none" />
              <div className="relative grid gap-5 border border-black/24 bg-[rgba(64,35,16,0.12)] p-5 md:grid-cols-[minmax(0,1fr)_180px] md:p-6">
                <div>
                  <p className="board-public-label text-[#24150b]/64">Crew call</p>
                  <h2 className="mt-4 max-w-[12ch] text-[clamp(2.1rem,4vw,3.7rem)] font-black leading-[0.92] tracking-[-0.07em] text-[#1e130a]">
                    Need floor crew.
                  </h2>
                  <div className="mt-4 space-y-1 text-[16px] leading-7 text-[#2e1b0b]">
                    <p>Check-in.</p>
                    <p>Seat players.</p>
                    <p>Move rounds.</p>
                  </div>
                </div>

                <div className="space-y-3 md:text-right">
                  <div>
                    <p className="board-public-label text-[#24150b]/56">Contact</p>
                    <p className="mt-2 break-all text-[15px] font-semibold leading-7 text-[#1e130a]">
                      {BOARD_CONTACT_EMAIL}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 border border-black/24 bg-white/28 px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e130a] transition-transform duration-150 group-hover:-translate-y-0.5">
                    <Mail className="h-4 w-4" />
                    <span>Email Mazen</span>
                  </div>
                </div>
              </div>
            </motion.a>
          </div>
        </div>
      </section>
    );
  }),
);

HostWorldThesis.displayName = "HostWorldThesis";
