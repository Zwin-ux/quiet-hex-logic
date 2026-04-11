import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SkeletalBoardSceneProps = {
  className?: string;
  variant?: "hero" | "compact";
};

export function SkeletalBoardScene({
  className,
  variant = "hero",
}: SkeletalBoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "perspective-stage relative isolate overflow-hidden rounded-[2rem] border border-black/10 bg-[#f9f8f3]",
        isHero ? "min-h-[420px] md:min-h-[560px]" : "min-h-[280px]",
        className,
      )}
    >
      <div className="absolute inset-0 board-grid opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.95),transparent_42%),linear-gradient(to_bottom,transparent,rgba(17,17,17,0.03))]" />

      <motion.div
        className="absolute inset-x-[8%] top-[10%] h-[70%]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src="/board/board-stage-frame.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain opacity-[0.92]"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  rotateX: [0, 3, 0],
                  rotateY: [0, -4, 0],
                  y: [0, -10, 0],
                }
          }
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
        />
      </motion.div>

      <motion.img
        src="/board/board-piece-cluster.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 top-[16%] z-[2] -translate-x-1/2 object-contain",
          isHero ? "w-[88%]" : "top-[20%] w-[82%]",
        )}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 36, scale: 0.94 }}
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : {
                opacity: 1,
                y: [0, -8, 0],
                rotateZ: [0, -0.8, 0.6, 0],
                scale: [1, 1.01, 1],
              }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0.6 }
            : {
                opacity: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                y: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                rotateZ: { duration: 11, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
              }
        }
      />

      <motion.img
        src="/board/board-seat-trace.svg"
        alt=""
        aria-hidden="true"
        className="absolute bottom-[7%] left-1/2 z-[1] w-[72%] -translate-x-1/2 opacity-50"
        animate={prefersReducedMotion ? undefined : { y: [0, -6, 0], opacity: [0.35, 0.72, 0.35] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute left-[14%] top-[18%] h-5 w-5 rounded-full border border-black/20 bg-white/90"
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.75, 0.2] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-[18%] top-[32%] h-3 w-24 border-t border-black/20"
            animate={{ x: [-12, 16, -12], opacity: [0.2, 0.65, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[18%] left-[22%] h-20 w-20 rounded-full border border-black/10"
            animate={{ scale: [0.94, 1.05, 0.94], opacity: [0.18, 0.45, 0.18] }}
            transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}
