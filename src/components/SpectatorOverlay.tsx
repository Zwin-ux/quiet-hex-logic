import { Eye, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SpectatorOverlayProps {
  player1: { username: string; elo?: number; color: number };
  player2: { username: string; elo?: number; color: number };
  currentTurn: number; // 1 or 2
  moveCount: number;
  matchStatus: string;
  onLeave: () => void;
}

export function SpectatorOverlay({
  player1,
  player2,
  currentTurn,
  moveCount,
  matchStatus,
  onLeave,
}: SpectatorOverlayProps) {
  const isLive = matchStatus === "in_progress";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between h-12 px-3 max-w-screen-xl mx-auto gap-2">
        {/* Leave button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeave}
          className="shrink-0 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>

        {/* Spectating badge */}
        <Badge
          variant="outline"
          className="shrink-0 gap-1.5 border-muted-foreground/30 text-muted-foreground"
        >
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
          <Eye className="h-3 w-3" />
          SPECTATING
        </Badge>

        {/* Player info & turn indicator */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-center">
          {/* Player 1 */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 min-w-0 transition-opacity ${
              currentTurn === 1 ? "opacity-100" : "opacity-50"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 bg-indigo ${
                currentTurn === 1 ? "ring-2 ring-indigo/50" : ""
              }`}
            />
            <span className="truncate text-sm font-medium text-indigo">
              {player1.username}
            </span>
            {player1.elo != null && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                ({player1.elo})
              </span>
            )}
          </div>

          <span className="text-xs text-muted-foreground shrink-0">vs</span>

          {/* Player 2 */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 min-w-0 transition-opacity ${
              currentTurn === 2 ? "opacity-100" : "opacity-50"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 bg-ochre ${
                currentTurn === 2 ? "ring-2 ring-ochre/50" : ""
              }`}
            />
            <span className="truncate text-sm font-medium text-ochre">
              {player2.username}
            </span>
            {player2.elo != null && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                ({player2.elo})
              </span>
            )}
          </div>
        </div>

        {/* Move count */}
        <Badge
          variant="secondary"
          className="shrink-0 text-xs tabular-nums"
        >
          Move {moveCount}
        </Badge>
      </div>
    </div>
  );
}
