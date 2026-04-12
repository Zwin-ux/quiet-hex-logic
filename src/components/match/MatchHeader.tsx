import { ArrowLeft, BookOpen, Eye, EyeOff, Flag, Handshake, RotateCcw, Sparkles } from "lucide-react";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { StateTag } from "@/components/board/StateTag";
import { Button } from "@/components/ui/button";
import { MusicControls } from "@/components/MusicControls";
import type { MatchData, Player } from "@/hooks/useMatchState";

function matchDims(match: MatchData): string {
  const gameKey = ((match as any)?.game_key ?? "hex") as string;
  const size = Number((match as any)?.size ?? 0) || 0;
  if (gameKey === "connect4") return `${size}x6`;
  return `${size}x${size}`;
}

function variantLabel(match: MatchData): string | null {
  const rules = (match as any)?.rules ?? null;
  const gameKey = ((match as any)?.game_key ?? "hex") as string;
  const preset = typeof rules?.presetKey === "string" ? rules.presetKey : null;
  if (preset) return preset;
  if (gameKey === "ttt" && rules?.misere === true) return "Misere";
  if (gameKey === "connect4" && Number.isInteger(rules?.connect) && Number(rules.connect) !== 4) {
    return `Connect ${Number(rules.connect)}`;
  }
  if (gameKey === "checkers" && rules?.mandatoryCapture === false) return "No forced capture";
  if (gameKey === "chess" && typeof rules?.startFen === "string" && rules.startFen.trim()) return "Custom FEN";
  if (gameKey === "hex" && typeof rules?.pieRule === "boolean" && rules.pieRule === false) return "No swap";
  return null;
}

interface MatchHeaderProps {
  match: MatchData;
  isAIMatch: boolean;
  isPlayer: boolean;
  isSpectating: boolean;
  isLocalMatch: boolean;
  userPlayer: Player | undefined;
  showAIReasoning: boolean;
  aiReasoning: string;
  requestingRematch: boolean;
  drawOfferedBy?: number | null;
  spectatorCount?: number;
  musicControls: {
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    toggleMusic: () => void;
    toggleMute: () => void;
    updateVolume: (v: number) => void;
  };
  onBack: () => void;
  onRematch: () => void;
  onForfeit: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
  onToggleSpectate: () => void;
  onShowTutorial: () => void;
  onToggleAIReasoning: () => void;
}

export function MatchHeader({
  match,
  isAIMatch,
  isPlayer,
  isSpectating,
  isLocalMatch,
  userPlayer,
  showAIReasoning,
  aiReasoning,
  requestingRematch,
  drawOfferedBy,
  spectatorCount = 0,
  musicControls,
  onBack,
  onRematch,
  onForfeit,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onToggleSpectate,
  onShowTutorial,
  onToggleAIReasoning,
}: MatchHeaderProps) {
  const modeLabel = isAIMatch ? "practice" : isLocalMatch ? "local" : "network";
  const title =
    isAIMatch
      ? "Practice surface"
      : `Room ${match.id.slice(0, 4).toUpperCase()} · ${matchDims(match)}`;
  const subtitle = isAIMatch
    ? "Single-board practice with full room chrome."
    : "A live surface should answer what room this is, who owns it, and what state it is in before the user even looks at the moves.";

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-5">
          <BoardWordmark className="text-[42px] md:text-[56px]" />

          <div className="retro-status-strip w-fit flex-wrap gap-3 bg-white px-4 py-4">
            <StateTag>{`room ${match.id.slice(0, 4).toUpperCase()}`}</StateTag>
            <StateTag tone={match.status === "active" ? "success" : match.result === "draw" ? "warning" : "critical"}>
              {match.status === "active" ? "live" : match.result === "draw" ? "draw" : "closed"}
            </StateTag>
            {!isAIMatch ? <StateTag>{spectatorCount} watching</StateTag> : null}
            <StateTag>{modeLabel}</StateTag>
            {variantLabel(match) ? <StateTag>{variantLabel(match)}</StateTag> : null}
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="board-page-title max-w-[720px] text-[3rem] leading-[0.94] md:text-[4rem]">
              {title}
            </h1>
            <p className="board-copy max-w-[620px] text-[17px] leading-8 text-black/68">{subtitle}</p>
          </div>

          {drawOfferedBy != null && match.status === "active" ? (
            <div className="retro-warning-strip">Draw offer waiting on response.</div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 xl:max-w-[460px] xl:justify-end">
          <Button variant="outline" size="icon" className="h-12 w-12" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {match.status === "finished" && !isAIMatch && isPlayer && !isLocalMatch ? (
            <Button variant="outline" onClick={onRematch} disabled={requestingRematch}>
              <RotateCcw className="h-4 w-4" />
              Rematch
            </Button>
          ) : null}

          {match.status === "active" && isPlayer && !isAIMatch && !isLocalMatch ? (
            <>
              <Button variant="outline" onClick={onForfeit}>
                <Flag className="h-4 w-4" />
                Forfeit
              </Button>
              {drawOfferedBy == null ? (
                <Button variant="outline" onClick={onOfferDraw}>
                  <Handshake className="h-4 w-4" />
                  Offer draw
                </Button>
              ) : null}
              {drawOfferedBy != null && drawOfferedBy !== userPlayer?.color ? (
                <>
                  <Button onClick={onAcceptDraw}>
                    <Handshake className="h-4 w-4" />
                    Accept draw
                  </Button>
                  <Button variant="outline" onClick={onDeclineDraw}>
                    Decline
                  </Button>
                </>
              ) : null}
            </>
          ) : null}

          {!isAIMatch && !isPlayer && !isLocalMatch ? (
            <Button variant={isSpectating ? "hero" : "outline"} onClick={onToggleSpectate}>
              {isSpectating ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isSpectating ? "Leave watch" : "Watch room"}
            </Button>
          ) : null}

          <Button variant="outline" onClick={onShowTutorial}>
            <BookOpen className="h-4 w-4" />
            How to play
          </Button>

          <MusicControls
            isPlaying={musicControls.isPlaying}
            volume={musicControls.volume}
            isMuted={musicControls.isMuted}
            onToggleMusic={musicControls.toggleMusic}
            onToggleMute={musicControls.toggleMute}
            onVolumeChange={musicControls.updateVolume}
          />

          {isAIMatch && match.ai_difficulty === "expert" && aiReasoning ? (
            <Button variant={showAIReasoning ? "hero" : "outline"} onClick={onToggleAIReasoning}>
              <Sparkles className="h-4 w-4" />
              {showAIReasoning ? "Hide reasoning" : "Show reasoning"}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
