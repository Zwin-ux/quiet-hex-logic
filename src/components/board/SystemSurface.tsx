import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SystemScreenProps = {
  label?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export function SystemScreen({
  label,
  title,
  description,
  actions,
  children,
  className,
  compact = false,
}: SystemScreenProps) {
  return (
    <section className={cn("system-screen", compact && "system-screen--compact", className)}>
      <div className="system-screen__head">
        <div className="system-screen__copy">
          {label ? <p className="system-screen__label">{label}</p> : null}
          <h1 className="system-screen__title">{title}</h1>
          {description ? <p className="system-screen__description">{description}</p> : null}
        </div>
        {actions ? <div className="system-screen__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

type SystemSectionProps = {
  label?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SystemSection({
  label,
  title,
  description,
  actions,
  children,
  className,
}: SystemSectionProps) {
  return (
    <section className={cn("system-section", className)}>
      {(label || title || description || actions) ? (
        <div className="system-section__head">
          <div className="system-section__copy">
            {label ? <p className="system-section__label">{label}</p> : null}
            {title ? <h2 className="system-section__title">{title}</h2> : null}
            {description ? <p className="system-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="system-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function UtilityStrip({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("utility-strip", className)} {...props}>
      {children}
    </div>
  );
}

export function UtilityPill({
  className,
  children,
  strong = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { strong?: boolean }) {
  return (
    <span className={cn("utility-pill", strong && "utility-pill--strong", className)} {...props}>
      {children}
    </span>
  );
}

export function DecisionLane({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("decision-lane", className)} {...props}>
      {children}
    </div>
  );
}

type DecisionEntryProps = {
  selected?: boolean;
  children: ReactNode;
  className?: string;
} & (
  | ({ as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ as: "div" } & HTMLAttributes<HTMLDivElement>)
);

export function DecisionEntry({
  as = "button",
  selected = false,
  children,
  className,
  ...props
}: DecisionEntryProps) {
  if (as === "div") {
    const divProps = props as HTMLAttributes<HTMLDivElement>;
    return (
      <div className={cn("decision-entry", selected && "is-selected", className)} {...divProps}>
        {children}
      </div>
    );
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? "button"}
      className={cn("decision-entry", selected && "is-selected", className)}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export function DecisionEntryFocus({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("decision-entry__focus", className)} {...props}>
      {children}
    </div>
  );
}

type LiveSurfaceProps = {
  header: ReactNode;
  board: ReactNode;
  rail?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function LiveSurface({
  header,
  board,
  rail,
  footer,
  className,
}: LiveSurfaceProps) {
  return (
    <section className={cn("live-surface", className)}>
      <div className="live-surface__header">{header}</div>
      <div className="live-surface__main">
        <div className="live-surface__board">{board}</div>
        {rail ? <aside className="live-surface__rail">{rail}</aside> : null}
      </div>
      {footer ? <div className="live-surface__footer">{footer}</div> : null}
    </section>
  );
}
