import { memo } from "react";
import { Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StateTag } from "@/components/board/StateTag";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

interface PlayerPanelProps {
  username: string;
  color: 1 | 2;
  isCurrentTurn: boolean;
  timeRemaining?: number;
  isAI?: boolean;
  avatarColor?: string;
  isPremium?: boolean;
  isVerifiedHuman?: boolean;
  discordAvatarUrl?: string;
  elo?: number;
  compact?: boolean;
}

const seatLabel = (color: 1 | 2) => (color === 1 ? "Seat A" : "Seat B");

const PlayerPanelComponent = ({
  username,
  color,
  isCurrentTurn,
  timeRemaining,
  isAI = false,
  avatarColor = "indigo",
  isVerifiedHuman = false,
  discordAvatarUrl,
  elo,
  compact = false,
}: PlayerPanelProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timerTone =
    timeRemaining === undefined
      ? "normal"
      : timeRemaining <= 10
        ? "critical"
        : timeRemaining <= 30
          ? "warning"
          : "success";

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="retro-inset bg-white px-3 py-3">
        <div className="flex items-start gap-3">
          {discordAvatarUrl ? (
            <Avatar className="h-10 w-10 shrink-0 border-2 border-black">
              <AvatarImage src={discordAvatarUrl} alt={username} />
              <AvatarFallback className="bg-[#efede4] text-[11px] font-bold text-black">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserAvatar username={username} color={avatarColor} size={compact ? "sm" : "lg"} />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={cn("truncate font-bold uppercase tracking-[-0.03em] text-black", compact ? "text-lg" : "text-xl")}>
                {username}
              </h3>
              {isVerifiedHuman ? <VerifiedBadge size={compact ? "xs" : "sm"} /> : null}
              {isAI ? <Badge variant="outline">AI</Badge> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StateTag>{seatLabel(color)}</StateTag>
              {elo !== undefined ? <StateTag>ELO {elo}</StateTag> : null}
              {isCurrentTurn ? <StateTag tone="success">To move</StateTag> : null}
            </div>
          </div>
        </div>
      </div>

      {timeRemaining !== undefined ? (
        <div className="retro-status-strip justify-between bg-white">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Clock</span>
          </div>
          <StateTag tone={timerTone}>{formatTime(timeRemaining)}</StateTag>
        </div>
      ) : null}
    </div>
  );
};

export const PlayerPanel = memo(PlayerPanelComponent);
