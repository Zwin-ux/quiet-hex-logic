import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SystemVariant = "default" | "world";

type SystemScreenProps = {
  label?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  utility?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  variant?: SystemVariant;
};

export function SystemScreen({
  label,
  title,
  description,
  actions,
  utility,
  children,
  className,
  compact = false,
  variant = "default",
}: SystemScreenProps) {
  return (
    <section
      className={cn("system-screen", compact && "system-screen--compact", className)}
      data-system-variant={variant}
    >
      <div className="system-screen__head">
        <div className="system-screen__copy">
          {label ? <p className="system-screen__label">{label}</p> : null}
          <h1 className="system-screen__title">{title}</h1>
          {description ? <p className="system-screen__description">{description}</p> : null}
        </div>
        {actions ? <div className="system-screen__actions">{actions}</div> : null}
      </div>
      {utility ? <div className="system-screen__utility">{utility}</div> : null}
      {children}
    </section>
  );
}

type SystemSectionProps = {
  label?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  utility?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: SystemVariant;
};

export function SystemSection({
  label,
  title,
  description,
  actions,
  utility,
  children,
  className,
  variant = "default",
}: SystemSectionProps) {
  return (
    <section className={cn("system-section", className)} data-system-variant={variant}>
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
      {utility ? <div className="system-section__utility">{utility}</div> : null}
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

export function SystemSegmented({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("system-segmented", className)} {...props}>
      {children}
    </div>
  );
}

type SystemSegmentedItemProps = {
  selected?: boolean;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function SystemSegmentedItem({
  selected = false,
  children,
  className,
  ...props
}: SystemSegmentedItemProps) {
  return (
    <button
      type={props.type ?? "button"}
      className={cn("system-segmented__item", selected && "is-selected", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function SystemMetaGrid({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("system-meta-grid", className)} {...props}>
      {children}
    </div>
  );
}

type SystemMetaItemProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  strong?: boolean;
};

export function SystemMetaItem({
  label,
  value,
  note,
  strong = false,
  className,
  ...props
}: SystemMetaItemProps) {
  return (
    <div className={cn("system-meta-item", strong && "system-meta-item--strong", className)} {...props}>
      <p className="system-meta-item__label">{label}</p>
      <p className="system-meta-item__value">{value}</p>
      {note ? <p className="system-meta-item__note">{note}</p> : null}
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
