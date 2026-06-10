import { memo, forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const LandingHero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();
    const ease = [0.22, 1, 0.36, 1] as const;

    return (
      <section
        ref={ref}
        className="relative overflow-hidden px-4 pt-16 md:pt-24"
        {...props}
      >
        <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
            className="mb-8"
          >
            <BoardWordmark
              size="hero"
              className="inline-block text-[#090909]"
            />
          </motion.div>

          <motion.h1
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.06, ease }}
            className="max-w-[14ch] text-balance text-[clamp(2.2rem,5vw,4.8rem)] font-bold leading-[0.92] tracking-[-0.04em] text-[#090909]"
          >
            A host-owned board game venue
          </motion.h1>

          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease }}
            className="mt-6 max-w-[42ch] text-balance text-[1.05rem] leading-[1.6] text-[#5c5750] md:text-[1.15rem]"
          >
            Quickplay any game in seconds. No sign-up, no lobby wait. Just pick a board and play.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18, ease }}
            className="mt-10 flex items-center gap-4"
          >
            <Button
              variant="hero"
              className="h-12 rounded-none border-2 border-[#090909] bg-[#090909] px-8 text-[0.95rem] font-semibold tracking-tight text-white transition-colors hover:bg-[#23252B]"
              onClick={() => navigate("/play")}
            >
              Start playing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-12 rounded-none border-2 border-transparent px-6 text-[0.95rem] font-semibold tracking-tight text-[#5c5750] transition-colors hover:border-[#D5D0C5] hover:text-[#090909]"
              onClick={() => navigate("/events")}
            >
              Events
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }),
);

LandingHero.displayName = "LandingHero";

export default LandingHero;
