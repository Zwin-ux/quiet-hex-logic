import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useAchievements } from '@/hooks/useAchievements';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Target, Clock, Grid3x3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { achievements, loading: achievementsLoading } = useAchievements(user?.id);
  const navigate = useNavigate();

  if (statsLoading || achievementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-gentle-pulse text-4xl mb-4">⬡</div>
          <p className="font-mono text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const winRate = stats ? Math.round((stats.wins / stats.total_games) * 100) : 0;
  const earnedAchievements = achievements.filter(a => a.earned);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/lobby')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lobby
          </Button>
          <h1 className="font-body text-4xl font-semibold mb-2">Your Profile</h1>
          <p className="text-muted-foreground font-mono">
            {user?.user_metadata?.username || 'Anonymous Player'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-indigo" />
              <span className="text-sm text-muted-foreground font-mono">Games Played</span>
            </div>
            <p className="text-3xl font-bold">{stats?.total_games || 0}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-ochre" />
              <span className="text-sm text-muted-foreground font-mono">Wins</span>
            </div>
            <p className="text-3xl font-bold">{stats?.wins || 0}</p>
            {stats && stats.total_games > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {winRate}% win rate
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">Avg Game</span>
            </div>
            <p className="text-3xl font-bold">
              {stats?.avg_game_length_minutes || 0}
              <span className="text-lg text-muted-foreground ml-1">min</span>
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Grid3x3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">Favorite Size</span>
            </div>
            <p className="text-3xl font-bold">
              {stats?.favorite_board_size ? `${stats.favorite_board_size}×${stats.favorite_board_size}` : '—'}
            </p>
          </Card>
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-body text-2xl font-semibold">Achievements</h2>
            <Badge variant="outline" className="font-mono">
              {earnedAchievements.length} / {achievements.length}
            </Badge>
          </div>

          {achievements.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4 opacity-20">🏆</div>
              <p className="text-muted-foreground">No achievements yet</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <Card
                  key={achievement.id}
                  className={`p-6 transition-all ${
                    achievement.earned
                      ? 'border-2 border-ochre/50 bg-ochre/5'
                      : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{achievement.name}</h3>
                        {achievement.earned && (
                          <Badge className="bg-ochre text-primary-foreground">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                      {achievement.earned && achievement.earned_at && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
