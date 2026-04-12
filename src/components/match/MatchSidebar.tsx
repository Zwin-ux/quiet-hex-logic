import { Eye } from "lucide-react";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { CounterBlock } from "@/components/board/CounterBlock";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { PlayerPanel } from "@/components/PlayerPanel";
import type { MatchData, Player } from "@/hooks/useMatchState";

interface MatchSidebarProps {
  match: MatchData;
  player1: Player | undefined;
  player2: Player | undefined;
  currentColor: number;
  isAIMatch: boolean;
  aiThinking: boolean;
  timeRemaining: number | null;
  discordAvatarUrl: string | undefined;
  spectators: Array<{ profile_id: string; profiles?: { username?: string } }>;
}

export function MatchSidebar({
  match,
  player1,
  player2,
  currentColor,
  isAIMatch,
  aiThinking,
  timeRemaining,
  discordAvatarUrl,
  spectators,
}: MatchSidebarProps) {
  const seatAState = currentColor === 1 && match.status === "active" ? "success" : "normal";
  const seatBState = currentColor === 2 && match.status === "active" ? "success" : "normal";
  const presencePanel =
    !isAIMatch && spectators.length > 0 ? (
      <VenuePanel
        eyebrow="Presence"
        title={`${spectators.length} watching`}
        titleBarEnd={<StateTag>{spectators.length} attached</StateTag>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CounterBlock label="watchers" value={spectators.length} />
          <CounterBlock label="status" value="live" />
        </div>
        <div className="mt-4 space-y-2 border-t border-black pt-4">
          {spectators.slice(0, 5).map((spectator) => (
            <div key={spectator.profile_id} className="retro-status-strip justify-between bg-[#e8e8e8] px-3 py-2">
              <span>{spectator.profiles?.username || "Anonymous"}</span>
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                watching
              </span>
            </div>
          ))}
          {spectators.length > 5 ? (
            <div className="board-meta-chip">+{spectators.length - 5} more watching</div>
          ) : null}
        </div>
      </VenuePanel>
    ) : null;

  return (
    <>
      <div className="order-1 space-y-4 lg:sticky lg:top-6 lg:block">
        {player1 ? (
          <VenuePanel
            eyebrow="Seat A"
            title="Player"
            state={seatAState}
            titleBarEnd={<StateTag tone={seatAState}>{currentColor === 1 && match.status === "active" ? "to move" : "waiting"}</StateTag>}
          >
            <PlayerPanel
              username={player1.username}
              color={1}
              isCurrentTurn={currentColor === 1 && match.status === "active"}
              timeRemaining={currentColor === 1 && match.status === "active" ? timeRemaining ?? undefined : undefined}
              isAI={player1.is_bot}
              avatarColor={player1.avatar_color}
              discordAvatarUrl={player1.profile_id === "discord-player" ? discordAvatarUrl : undefined}
              elo={player1.elo}
              compact={false}
            />
          </VenuePanel>
        ) : null}

        <div className="lg:hidden">
          {player2 ? (
            <VenuePanel
              eyebrow="Seat B"
              title="Opponent"
              state={seatBState}
              titleBarEnd={<StateTag tone={seatBState}>{currentColor === 2 && match.status === "active" ? "to move" : "holding"}</StateTag>}
            >
              <PlayerPanel
                username={player2.username}
                color={2}
                isCurrentTurn={currentColor === 2 && match.status === "active"}
                timeRemaining={currentColor === 2 && match.status === "active" ? timeRemaining ?? undefined : undefined}
                isAI={player2.is_bot}
                avatarColor={player2.avatar_color}
                discordAvatarUrl={player2.profile_id === "discord-player" ? discordAvatarUrl : undefined}
                elo={player2.elo}
                compact={false}
              />
              {isAIMatch && currentColor === 2 && match.status === "active" ? (
                <div className="mt-4">
                  <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
                </div>
              ) : null}
            </VenuePanel>
          ) : null}

          <div className="lg:hidden">
            {presencePanel}
          </div>
        </div>
      </div>

      <div className="order-3 hidden space-y-4 lg:sticky lg:top-6 lg:block">
        {player2 ? (
          <VenuePanel
            eyebrow="Seat B"
            title="Opponent"
            state={seatBState}
            titleBarEnd={<StateTag tone={seatBState}>{currentColor === 2 && match.status === "active" ? "to move" : "holding"}</StateTag>}
          >
            <PlayerPanel
              username={player2.username}
              color={2}
              isCurrentTurn={currentColor === 2 && match.status === "active"}
              timeRemaining={currentColor === 2 && match.status === "active" ? timeRemaining ?? undefined : undefined}
              isAI={player2.is_bot}
              avatarColor={player2.avatar_color}
              discordAvatarUrl={player2.profile_id === "discord-player" ? discordAvatarUrl : undefined}
              elo={player2.elo}
              compact={false}
            />
            {isAIMatch && currentColor === 2 && match.status === "active" ? (
              <div className="mt-4">
                <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
              </div>
            ) : null}
            </VenuePanel>
          ) : null}

        {presencePanel}
      </div>
    </>
  );
}
