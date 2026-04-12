import { cn } from "@/lib/utils";

type RetroTickerProps = {
  items: string[];
  className?: string;
};

export function RetroTicker({ items, className }: RetroTickerProps) {
  const normalizedItems = items.filter(Boolean);

  if (normalizedItems.length === 0) return null;

  const renderGroup = (ariaHidden?: boolean) => (
    <div className="retro-ticker__group" aria-hidden={ariaHidden}>
      {normalizedItems.map((item) => (
        <span key={`${ariaHidden ? "copy" : "live"}-${item}`} className="retro-ticker__item">
          {item}
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("retro-ticker", className)} aria-label="Status ticker">
      <div className="retro-ticker__track">
        {renderGroup()}
        {renderGroup(true)}
      </div>
    </div>
  );
}
