import { AsciiGameCard } from "@/components/board/AsciiGameCard";
import { ASCII_GAME_ORDER } from "@/lib/asciiGames";
import { cn } from "@/lib/utils";

type AsciiGameDeckProps = {
  className?: string;
};

export function AsciiGameDeck({ className }: AsciiGameDeckProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {ASCII_GAME_ORDER.map((gameKey, index) => (
        <AsciiGameCard
          key={gameKey}
          gameKey={gameKey}
          size={index === 0 ? "feature" : "compact"}
          className={index === 0 ? "sm:col-span-2" : ""}
          titleBarEyebrow={index === 0 ? "Featured board" : "Ascii board"}
        />
      ))}
    </div>
  );
}
