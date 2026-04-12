import { ArrowLeft, BookOpen, Eye, EyeOff, Flag, Handshake, RotateCcw, Sparkles } from "lucide-react";
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
  const statusLabel =
    match.status === "finished"
      ? match.result === "draw"
        ? "draw"
        : match.winner === userPlayer?.color
          ? "victory"
          : "finished"
      : isAIMatch
        ? "practice"
        : "live";

  const statusTone =
    drawOfferedBy != null && match.status === "active"
      ? "warning"
      : statusLabel === "victory"
        ? "success"
        : match.status === "finished" && statusLabel !== "draw"
          ? "critical"
          : "normal";

  return (
    <section className="retro-window mb-6">
      <div className={`retro-window__titlebar ${statusTone === "warning" ? "retro-window__titlebar--warning" : statusTone === "critical" ? "retro-window__titlebar--critical" : ""}`}>
        <div className="flex items-center gap-3">
          <Button variant="quiet" size="icon" onClick={onBack} className="h-9 w-9 bg-[#c0c0c0] text-black">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="retro-window__eyebrow">Match room</p>
            <h1 className="retro-window__title mt-1">
              {isAIMatch ? "Practice board" : "Live instance"}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <StateTag tone={statusTone}>{statusLabel}</StateTag>
          <StateTag>{String(((match as any)?.game_key ?? "hex")).toUpperCase()}</StateTag>
          <StateTag>{matchDims(match)}</StateTag>
          {variantLabel(match) ? <StateTag>{variantLabel(match)}</StateTag> : null}
        </div>
      </div>

      <div className="retro-window__body">
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <p className="board-copy max-w-2xl">
                {isAIMatch
                  ? "Single-board practice surface with full room chrome."
                  : "Live room state, room actions, and watch controls stay outside the board so turn clarity stays intact."}
              </p>
              {drawOfferedBy != null && match.status === "active" ? (
                <div className="retro-warning-strip">
                  Draw offer waiting on response
                </div>
              ) : null}
            </div>
            <div className="retro-status-strip justify-between gap-3 bg-[#e8e8e8]">
              <span>Room state</span>
              <span>{match.status}</span>
            </div>
          </div>

          <div className="retro-command-rail">
            {match.status === "finished" && !isAIMatch && isPlayer && !isLocalMatch ? (
              <Button variant="outline" size="sm" onClick={onRematch} disabled={requestingRematch}>
                <RotateCcw className="h-4 w-4" />
                Rematch
              </Button>
            ) : null}

            {match.status === "active" && isPlayer && !isAIMatch && !isLocalMatch ? (
              <>
                <Button variant="outline" size="sm" onClick={onForfeit}>
                  <Flag className="h-4 w-4" />
                  Forfeit
                </Button>
                {drawOfferedBy == null ? (
                  <Button variant="outline" size="sm" onClick={onOfferDraw}>
                    <Handshake className="h-4 w-4" />
                    Offer draw
                  </Button>
                ) : null}
                {drawOfferedBy != null && drawOfferedBy !== userPlayer?.color ? (
                  <>
                    <Button size="sm" onClick={onAcceptDraw}>
                      <Handshake className="h-4 w-4" />
                      Accept draw
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeclineDraw}>
                      Decline
                    </Button>
                  </>
                ) : null}
              </>
            ) : null}

            {!isAIMatch && !isPlayer && !isLocalMatch ? (
              <Button variant={isSpectating ? "hero" : "outline"} size="sm" onClick={onToggleSpectate}>
                {isSpectating ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isSpectating ? "Leave watch" : "Watch room"}
              </Button>
            ) : null}

            <Button variant="outline" size="sm" onClick={onShowTutorial}>
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
              <Button variant={showAIReasoning ? "hero" : "outline"} size="sm" onClick={onToggleAIReasoning}>
                <Sparkles className="h-4 w-4" />
                {showAIReasoning ? "Hide reasoning" : "Show reasoning"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
