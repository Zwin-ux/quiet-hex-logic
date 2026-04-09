import { Button } from '@/components/ui/button';
import { MusicControls } from '@/components/MusicControls';
import { ArrowLeft, BookOpen, Eye, EyeOff, Flag, Handshake, RotateCcw, Sparkles } from 'lucide-react';
import type { MatchData, Player } from '@/hooks/useMatchState';

function matchDims(match: MatchData): string {
  const gameKey = ((match as any)?.game_key ?? 'hex') as string;
  const size = Number((match as any)?.size ?? 0) || 0;
  if (gameKey === 'connect4') return `${size}x6`;
  return `${size}x${size}`;
}

function variantLabel(match: MatchData): string | null {
  const rules = (match as any)?.rules ?? null;
  const gameKey = ((match as any)?.game_key ?? 'hex') as string;
  const preset = typeof rules?.presetKey === 'string' ? rules.presetKey : null;
  if (preset) return preset;
  if (gameKey === 'ttt' && rules?.misere === true) return 'Misere';
  if (gameKey === 'connect4' && Number.isInteger(rules?.connect) && Number(rules.connect) !== 4) return `Connect ${Number(rules.connect)}`;
  if (gameKey === 'checkers' && rules?.mandatoryCapture === false) return 'No forced capture';
  if (gameKey === 'chess' && typeof rules?.startFen === 'string' && rules.startFen.trim()) return 'Custom FEN';
  if (gameKey === 'hex' && typeof rules?.pieRule === 'boolean' && rules.pieRule === false) return 'No swap';
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
    match.status === 'finished'
      ? match.result === 'draw'
        ? 'draw'
        : match.winner === userPlayer?.color
          ? 'victory'
          : 'finished'
      : isAIMatch
        ? 'practice'
        : 'live';

  return (
    <div className="board-panel board-panel-cut mb-6 overflow-hidden bg-white/94 p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 border border-black/10 bg-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="board-rail-label">Live instance</p>
          </div>

          <div className="mt-4">
            <h1 className="text-4xl font-black tracking-[-0.08em] text-foreground md:text-5xl">
              {isAIMatch ? 'Practice board' : 'Match room'}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                {String(((match as any)?.game_key ?? 'hex')).toUpperCase()}
              </span>
              <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                {matchDims(match)}
              </span>
              {variantLabel(match) ? (
                <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                  {variantLabel(match)}
                </span>
              ) : null}
              <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {match.status === 'finished' && !isAIMatch && isPlayer && !isLocalMatch ? (
            <Button variant="outline" size="sm" onClick={onRematch} disabled={requestingRematch}>
              <RotateCcw className="h-4 w-4" />
              Rematch
            </Button>
          ) : null}

          {match.status === 'active' && isPlayer && !isAIMatch && !isLocalMatch ? (
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
            <Button variant={isSpectating ? 'default' : 'outline'} size="sm" onClick={onToggleSpectate}>
              {isSpectating ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isSpectating ? 'Leave watch' : 'Watch room'}
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

          {isAIMatch && match.ai_difficulty === 'expert' && aiReasoning ? (
            <Button variant={showAIReasoning ? 'default' : 'outline'} size="sm" onClick={onToggleAIReasoning}>
              <Sparkles className="h-4 w-4" />
              {showAIReasoning ? 'Hide reasoning' : 'Show reasoning'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
