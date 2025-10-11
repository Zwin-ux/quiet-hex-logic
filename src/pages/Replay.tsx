import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { HexBoard } from '@/components/HexBoard';
import { Hex } from '@/lib/hex/engine';

type Move = {
  ply: number;
  cell: number | null;
  color: number;
};

type MatchData = {
  size: number;
  winner: number | null;
  players: Array<{
    color: number;
    profile: { username: string };
    is_bot: boolean;
  }>;
};

export default function Replay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [game, setGame] = useState<Hex | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!matchId) return;
    fetchMatchData();
  }, [matchId]);

  useEffect(() => {
    if (!match || moves.length === 0) return;
    
    const newGame = new Hex(match.size);
    for (let i = 0; i < currentPly && i < moves.length; i++) {
      newGame.play(moves[i].cell);
    }
    setGame(newGame);
  }, [currentPly, match, moves]);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setCurrentPly(prev => {
        if (prev >= moves.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playing, moves.length]);

  const fetchMatchData = async () => {
    if (!matchId) return;

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          size,
          winner,
          players:match_players(
            color,
            is_bot,
            profile:profiles(username)
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      const { data: movesData, error: movesError } = await supabase
        .from('moves')
        .select('*')
        .eq('match_id', matchId)
        .order('ply', { ascending: true });

      if (movesError) throw movesError;

      setMatch(matchData);
      setMoves(movesData || []);
    } catch (error: any) {
      toast.error('Failed to load replay', { description: error.message });
      navigate('/history');
    }
  };

  const handlePlayPause = () => {
    if (currentPly >= moves.length) {
      setCurrentPly(0);
    }
    setPlaying(!playing);
  };

  const handleSliderChange = (value: number[]) => {
    setCurrentPly(value[0]);
    setPlaying(false);
  };

  if (authLoading || !match || !game) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const player1 = match.players.find(p => p.color === 1);
  const player2 = match.players.find(p => p.color === 2);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/history')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Board */}
          <div>
            <Card className="p-6 shadow-paper border-2">
              <HexBoard
                size={match.size}
                board={game.board}
                onCellClick={() => {}}
                disabled={true}
                winningPath={match.winner ? game.getWinningPath() : undefined}
              />
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Card className="p-6 shadow-paper border-2">
              <div className="mb-6">
                <h2 className="font-body text-2xl font-semibold mb-4">Match Replay</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Board Size:</span>
                    <Badge className="font-mono">{match.size}×{match.size}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Indigo:</span>
                    <span className="font-body font-semibold">
                      {player1?.is_bot ? 'AI' : player1?.profile.username}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ochre:</span>
                    <span className="font-body font-semibold">
                      {player2?.is_bot ? 'AI' : player2?.profile.username}
                    </span>
                  </div>
                  {match.winner && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Winner:</span>
                      <Badge className={match.winner === 1 ? 'bg-indigo' : 'bg-ochre'}>
                        {match.winner === 1 ? 'Indigo' : 'Ochre'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPly(0)}
                    disabled={currentPly === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePlayPause}
                    disabled={currentPly >= moves.length && !playing}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPly(moves.length)}
                    disabled={currentPly >= moves.length}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto text-sm text-muted-foreground font-mono">
                    Move {currentPly} / {moves.length}
                  </span>
                </div>

                <Slider
                  value={[currentPly]}
                  onValueChange={handleSliderChange}
                  max={moves.length}
                  step={1}
                  className="w-full"
                />
              </div>
            </Card>

            {/* Move List */}
            <Card className="p-6 shadow-paper border-2 max-h-96 overflow-y-auto">
              <h3 className="font-body text-lg font-semibold mb-4">Move History</h3>
              <div className="space-y-2">
                {moves.map((move, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded ${
                      idx < currentPly ? 'bg-accent' : 'opacity-40'
                    } ${idx === currentPly - 1 ? 'ring-2 ring-indigo' : ''}`}
                  >
                    <span className="font-mono text-sm">
                      {idx + 1}. {move.cell === null ? 'Swap' : `Cell ${move.cell}`}
                    </span>
                    <Badge variant="outline" className={move.color === 1 ? 'border-indigo' : 'border-ochre'}>
                      {move.color === 1 ? 'Indigo' : 'Ochre'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
