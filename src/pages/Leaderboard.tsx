import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { UserAvatar } from '@/components/UserAvatar';

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="w-5 text-center text-muted-foreground">{rank}</span>;
  }
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameKey, setGameKey] = useState<'hex' | 'chess' | 'checkers'>('hex');
  const { entries, loading, userRank, fetchUserRank } = useLeaderboard(100, gameKey);

  useEffect(() => {
    if (user?.id) {
      fetchUserRank(user.id);
    }
  }, [user?.id, fetchUserRank]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-2xl pt-14">
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Top ranked players ({gameKey.toUpperCase()})</p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          <Button variant={gameKey === 'hex' ? 'default' : 'outline'} onClick={() => setGameKey('hex')}>
            Hex
          </Button>
          <Button variant={gameKey === 'chess' ? 'default' : 'outline'} onClick={() => setGameKey('chess')}>
            Chess
          </Button>
          <Button variant={gameKey === 'checkers' ? 'default' : 'outline'} onClick={() => setGameKey('checkers')}>
            Checkers
          </Button>
        </div>

        {user && userRank && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="py-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Rank</span>
              <span className="text-2xl font-bold">#{userRank}</span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 100 Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No ranked players yet.</p>
                <p className="text-sm">Play ranked matches to appear here!</p>
              </div>
            ) : (
              <div className="divide-y">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => navigate(`/profile/${entry.id}`)}
                    className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      user?.id === entry.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <UserAvatar
                      username={entry.username}
                      color={entry.avatar_color || 'indigo'}
                      size="sm"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entry.username}</span>
                        {entry.is_verified_human && <VerifiedBadge size="sm" />}
                        {entry.is_premium && <PremiumBadge size="sm" />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {entry.games_rated} games
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-lg font-bold">{entry.elo_rating}</span>
                      <p className="text-xs text-muted-foreground">ELO</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
