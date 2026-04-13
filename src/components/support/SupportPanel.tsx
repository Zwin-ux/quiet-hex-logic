import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SupportPanelProps = {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  titleBarEnd?: ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: "dark" | "light" | "paper";
  motionIndex?: number;
  motionVariant?: "hero" | "card" | "aside";
  disableHoverMotion?: boolean;
};

export function SupportPanel({
  eyebrow,
  title,
  description,
  children,
  footer,
  titleBarEnd,
  className,
  bodyClassName,
  tone = "light",
  motionIndex = 0,
  motionVariant = "card",
  disableHoverMotion = false,
}: SupportPanelProps) {
  const reduceMotion = useReducedMotion();
  const motionByVariant = {
    hero: {
      initial: { opacity: 0, y: 34, scale: 0.985 },
      animate: { opacity: 1, y: 0, scale: 1 },
      hover: { y: -5, scale: 1.01 },
    },
    card: {
      initial: { opacity: 0, y: 24, scale: 0.985 },
      animate: { opacity: 1, y: 0, scale: 1 },
      hover: { y: -4, scale: 1.008 },
    },
    aside: {
      initial: { opacity: 0, x: 18, y: 12, scale: 0.985 },
      animate: { opacity: 1, x: 0, y: 0, scale: 1 },
      hover: { y: -3, scale: 1.006 },
    },
  } as const;
  const motionState = motionByVariant[motionVariant];
  const transition = {
    duration: 0.52,
    delay: motionIndex * 0.07,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <motion.section
      initial={reduceMotion ? false : motionState.initial}
      animate={reduceMotion ? undefined : motionState.animate}
      whileHover={reduceMotion || disableHoverMotion ? undefined : motionState.hover}
      transition={reduceMotion ? undefined : transition}
      className={cn("support-panel", `support-panel--${tone}`, className)}
    >
      {(eyebrow || title || titleBarEnd) ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? <p className="support-kicker">{eyebrow}</p> : null}
            {title ? <div className="support-title mt-4">{title}</div> : null}
          </div>
          {titleBarEnd ? <div className="shrink-0">{titleBarEnd}</div> : null}
        </div>
      ) : null}

      {description ? (
        <div className={cn("support-copy mt-5", bodyClassName)}>{description}</div>
      ) : null}

      {children ? <div className={cn(description && "mt-6", bodyClassName)}>{children}</div> : null}

      {footer ? <div className="mt-8">{footer}</div> : null}
    </motion.section>
  );
}
