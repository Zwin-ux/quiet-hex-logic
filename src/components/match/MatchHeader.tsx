import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MusicControls } from '@/components/MusicControls';
import { Sparkles, BookOpen, ArrowLeft, Eye, EyeOff, RotateCcw, RefreshCw, Flag, Handshake } from 'lucide-react';
import type { MatchData, Player } from '@/hooks/useMatchState';

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
  match, isAIMatch, isPlayer, isSpectating, isLocalMatch, userPlayer,
  showAIReasoning, aiReasoning, requestingRematch, drawOfferedBy,
  musicControls, onBack, onRematch, onForfeit, onOfferDraw, onAcceptDraw, onDeclineDraw,
  onToggleSpectate, onShowTutorial, onToggleAIReasoning,
}: MatchHeaderProps) {
  return (
    <div className="mb-4 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-10 w-10 p-0 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-body text-xl md:text-3xl font-semibold">
            {isAIMatch ? 'Practice' : 'Match'}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {match.size}x{match.size}
            </Badge>
            {match.status === 'finished' && match.winner && (
              <Badge className={match.winner === userPlayer?.color ? 'bg-green-500/90' : 'bg-red-500/90'}>
                {match.winner === userPlayer?.color ? 'Victory' : 'Defeat'}
              </Badge>
            )}
            {match.status === 'finished' && !match.winner && match.result === 'draw' && (
              <Badge variant="secondary">Draw</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
        {match.status === 'finished' && !isAIMatch && isPlayer && !isLocalMatch && (
          <Button variant="default" size="sm" onClick={onRematch} disabled={requestingRematch} className="shrink-0">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Rematch
          </Button>
        )}
        {match.status === 'active' && isPlayer && !isAIMatch && !isLocalMatch && (
          <>
            <Button variant="destructive" size="sm" onClick={onForfeit} className="shrink-0">
              <Flag className="h-4 w-4 mr-1.5" />
              Forfeit
            </Button>
            {drawOfferedBy == null && (
              <Button variant="outline" size="sm" onClick={onOfferDraw} className="shrink-0">
                <Handshake className="h-4 w-4 mr-1.5" />
                Offer Draw
              </Button>
            )}
            {drawOfferedBy != null && drawOfferedBy === userPlayer?.color && (
              <Badge variant="secondary" className="shrink-0 h-8 px-3 flex items-center gap-1.5">
                <Handshake className="h-3.5 w-3.5" />
                Draw Offered
              </Badge>
            )}
            {drawOfferedBy != null && drawOfferedBy !== userPlayer?.color && (
              <>
                <Button variant="default" size="sm" onClick={onAcceptDraw} className="shrink-0">
                  <Handshake className="h-4 w-4 mr-1.5" />
                  Accept Draw
                </Button>
                <Button variant="outline" size="sm" onClick={onDeclineDraw} className="shrink-0">
                  Decline
                </Button>
              </>
            )}
          </>
        )}
        {!isAIMatch && !isPlayer && !isLocalMatch && (
          <Button variant={isSpectating ? "default" : "outline"} size="sm" onClick={onToggleSpectate} className="shrink-0">
            {isSpectating ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
            {isSpectating ? 'Leave' : 'Watch'}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onShowTutorial} className="shrink-0">
          <BookOpen className="h-4 w-4 md:mr-1.5" />
          <span className="hidden md:inline">How to Play</span>
        </Button>
        <MusicControls
          isPlaying={musicControls.isPlaying}
          volume={musicControls.volume}
          isMuted={musicControls.isMuted}
          onToggleMusic={musicControls.toggleMusic}
          onToggleMute={musicControls.toggleMute}
          onVolumeChange={musicControls.updateVolume}
        />
        {isAIMatch && match.ai_difficulty === 'expert' && aiReasoning && (
          <Button variant={showAIReasoning ? "default" : "outline"} size="sm" onClick={onToggleAIReasoning} className="shrink-0">
            <Sparkles className="h-4 w-4 md:mr-1.5" />
            <span className="hidden md:inline">{showAIReasoning ? 'Hide' : 'Explain'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
