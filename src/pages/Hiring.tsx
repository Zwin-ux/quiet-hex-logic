import { motion } from "framer-motion";
import { Hammer, Mail } from "lucide-react";
import { SupportFrame } from "@/components/support/SupportFrame";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { BOARD_CONTACT_EMAIL, BOARD_HIRING_GMAIL_URL, FIRST_TOURNAMENT } from "@/lib/launchAnnouncements";

export default function Hiring() {
  useDocumentTitle("Hiring");

  return (
    <SupportFrame contentClassName="pt-24">
      <div className="mx-auto flex min-h-[72vh] max-w-[860px] items-center justify-center px-4 py-12 md:px-6">
        <motion.section
          initial={{ opacity: 0, y: 36, rotate: -4, scale: 0.94 }}
          animate={{
            opacity: 1,
            y: 0,
            rotate: [0.4, -0.7, 0.5, 0.2],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.45, ease: "easeOut" },
            y: { duration: 0.45, ease: "easeOut" },
            scale: { duration: 0.45, ease: "easeOut" },
            rotate: {
              duration: 3.8,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
          className="wood-note relative w-full max-w-[620px] p-5 md:p-7"
        >
          <div className="wood-note__grain absolute inset-0 pointer-events-none" />
          <div className="relative border border-black/28 bg-[rgba(64,35,16,0.12)] p-5 md:p-6">
            <p className="support-mini-label text-black/65">Hiring / event crew</p>
            <h1 className="mt-5 max-w-[12ch] text-[clamp(2.7rem,6vw,4.9rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#1e130a]">
              Need event coordinators.
            </h1>
            <div className="mt-5 space-y-2 text-[17px] leading-8 text-[#2e1b0b]">
              <p>Work the {FIRST_TOURNAMENT.fullDate} opener.</p>
              <p>Run check-in. Seat players. Move rounds.</p>
            </div>

            <div className="mt-8 grid gap-3 border-t border-black/18 pt-5 md:grid-cols-[120px_minmax(0,1fr)]">
              <div>
                <p className="support-mini-label text-black/55">Date</p>
                <p className="mt-2 text-[2.4rem] font-black leading-none tracking-[-0.08em] text-[#1e130a]">
                  {FIRST_TOURNAMENT.shortDate}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-black/14 bg-white/24 px-4 py-4">
                  <p className="support-mini-label text-black/55">Start</p>
                  <p className="mt-2 text-[15px] font-semibold leading-7 text-[#1e130a]">
                    {FIRST_TOURNAMENT.time}
                  </p>
                </div>
                <div className="border border-black/14 bg-white/24 px-4 py-4">
                  <p className="support-mini-label text-black/55">Contact</p>
                  <p className="mt-2 break-all text-[15px] font-semibold leading-7 text-[#1e130a]">
                    {BOARD_CONTACT_EMAIL}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Button asChild variant="supportOutline" size="lg" className="w-full justify-between border-[#2b1708] bg-[#2b1708] hover:border-[#402310] hover:bg-[#402310]">
                <a href={BOARD_HIRING_GMAIL_URL} target="_blank" rel="noreferrer">
                  <span>Email Mazen</span>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm leading-7 text-[#2e1b0b]/72">
              <Hammer className="h-4 w-4" />
              <span>Name. Timezone. Event background.</span>
            </div>
          </div>
        </motion.section>
      </div>
    </SupportFrame>
  );
}
