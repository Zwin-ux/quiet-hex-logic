import { ArrowLeft, BookOpen, Eye, EyeOff, Flag, Handshake, RotateCcw, Sparkles } from "lucide-react";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SystemScreen, UtilityPill, UtilityStrip } from "@/components/board/SystemSurface";
import { MusicControls } from "@/components/MusicControls";
import { Button } from "@/components/ui/button";
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
  const gameKey = (((match as any)?.game_key ?? "hex") as string) as BoardSceneKey;
  const title = isAIMatch ? "Practice board" : `Room ${match.id.slice(0, 4).toUpperCase()}`;
  const subtitle = isAIMatch
    ? `${matchDims(match)} / local AI`
    : `${matchDims(match)} / ${spectatorCount} watching`;
  const activeState =
    match.status === "active" ? "live" : match.result === "draw" ? "draw" : "closed";
  const activeVariant = variantLabel(match);

  return (
    <SystemScreen
      compact
      label={modeLabel}
      title={
        <span className="inline-flex items-center gap-3">
          <BoardScene
            game={gameKey}
            state={match.status === "active" ? "idle" : match.result === "draw" ? "static" : "success"}
            decorative
            className="h-8 w-8 text-[#090909]"
          />
          <span>{title}</span>
        </span>
      }
      description={subtitle}
      actions={
        <>
          <Button variant="ghost" size="icon" className="h-11 w-11 border-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {match.status === "finished" && !isAIMatch && isPlayer && !isLocalMatch ? (
            <Button variant="ghost" className="border-0" onClick={onRematch} disabled={requestingRematch}>
              <RotateCcw className="h-4 w-4" />
              Rematch
            </Button>
          ) : null}

          {match.status === "active" && isPlayer && !isAIMatch && !isLocalMatch ? (
            <>
              <Button variant="ghost" className="border-0" onClick={onForfeit}>
                <Flag className="h-4 w-4" />
                Forfeit
              </Button>
              {drawOfferedBy == null ? (
                <Button variant="ghost" className="border-0" onClick={onOfferDraw}>
                  <Handshake className="h-4 w-4" />
                  Offer draw
                </Button>
              ) : null}
              {drawOfferedBy != null && drawOfferedBy !== userPlayer?.color ? (
                <>
                  <Button variant="hero" className="border-0" onClick={onAcceptDraw}>
                    <Handshake className="h-4 w-4" />
                    Accept draw
                  </Button>
                  <Button variant="ghost" className="border-0" onClick={onDeclineDraw}>
                    Decline
                  </Button>
                </>
              ) : null}
            </>
          ) : null}

          {!isAIMatch && !isPlayer && !isLocalMatch ? (
            <Button variant={isSpectating ? "hero" : "ghost"} className="border-0" onClick={onToggleSpectate}>
              {isSpectating ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isSpectating ? "Leave watch" : "Watch room"}
            </Button>
          ) : null}

          <Button variant="ghost" className="border-0" onClick={onShowTutorial}>
            <BookOpen className="h-4 w-4" />
            Rules
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
            <Button variant={showAIReasoning ? "hero" : "ghost"} className="border-0" onClick={onToggleAIReasoning}>
              <Sparkles className="h-4 w-4" />
              {showAIReasoning ? "Hide reasoning" : "Show reasoning"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BoardWordmark className="text-[28px] md:text-[32px]" />
        </div>
        <UtilityStrip>
          <UtilityPill strong={match.status !== "finished" || match.result !== "draw"}>{activeState}</UtilityPill>
          {!isAIMatch ? <UtilityPill>{spectatorCount} watching</UtilityPill> : null}
          <UtilityPill>{matchDims(match)}</UtilityPill>
          {activeVariant ? <UtilityPill>{activeVariant}</UtilityPill> : null}
        </UtilityStrip>
        {drawOfferedBy != null && match.status === "active" ? (
          <p className="system-inline-note">Draw offer waiting on response.</p>
        ) : null}
      </div>
    </SystemScreen>
  );
}
