import { cn } from "@/lib/utils";

type VenueStageObjectProps = {
  className?: string;
  compact?: boolean;
};

export function VenueStageObject({ className, compact = false }: VenueStageObjectProps) {
  return (
    <div
      className={cn(
        "relative border-2 border-[#0e0e0f] bg-transparent",
        compact ? "h-[180px] w-full max-w-[312px]" : "h-[308px] w-full max-w-[532px]",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute border border-[#0e0e0f] bg-[#fbfaf8]",
          compact
            ? "left-[8%] top-[16%] h-[138px] w-[77%] rotate-[6deg]"
            : "left-[9%] top-[16%] h-[236px] w-[77%] rotate-[6deg]",
        )}
      />
      <div
        className={cn(
          "absolute bg-[#0e0e0f]",
          compact
            ? "left-[20%] top-[28%] h-[82px] w-[82px] [clip-path:polygon(25%_0,75%_14%,100%_56%,57%_100%,13%_84%,0_34%)]"
            : "left-[18%] top-[28%] h-[140px] w-[140px] [clip-path:polygon(25%_0,75%_14%,100%_56%,57%_100%,13%_84%,0_34%)]",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full border-2 border-[#0e0e0f] bg-transparent",
          compact ? "left-[48%] top-[42%] h-[60px] w-[60px]" : "left-[50%] top-[40%] h-[104px] w-[104px]",
        )}
      />
      <div
        className={cn(
          "absolute rotate-[22deg] bg-[#0e0e0f]",
          compact ? "left-[67%] top-[26%] h-[34px] w-[82px]" : "left-[65%] top-[22%] h-[42px] w-[128px]",
        )}
      />
      <div
        className={cn(
          "absolute border-t-2 border-[#0e0e0f]",
          compact ? "left-[36%] top-[82%] w-[52%]" : "left-[36%] top-[86%] w-[55%]",
        )}
      />
    </div>
  );
}
