import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useAchievements } from '@/hooks/useAchievements';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Trophy, Target, Clock, Grid3x3, Palette, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { boardSkins } from '@/lib/boardSkins';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { achievements, loading: achievementsLoading } = useAchievements(user?.id);
  const navigate = useNavigate();
  const [selectedSkin, setSelectedSkin] = useState('classic');
  const [saving, setSaving] = useState(false);

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

  const handleSkinChange = async (skinId: string) => {
    setSelectedSkin(skinId);
    setSaving(true);
    try {
      // Save to profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ board_skin: skinId } as any)
        .eq('id', user?.id);
      if (error) throw error;
      toast.success('Board theme saved!');
    } catch (error) {
      toast.error('Failed to save theme');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate('/lobby')}
            className="mb-6 gap-2 hover:gap-3 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-body text-5xl font-bold mb-3 bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
                {user?.user_metadata?.username || 'Your Profile'}
              </h1>
              <p className="text-muted-foreground font-mono text-lg">
                Track your journey, customize your experience
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid with animations */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo/10 group-hover:bg-indigo/20 transition-colors">
                <Target className="h-6 w-6 text-indigo" />
              </div>
              <span className="text-sm text-muted-foreground font-mono font-medium">Games Played</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">{stats?.total_games || 0}</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-ochre/10 group-hover:bg-ochre/20 transition-colors">
                <Trophy className="h-6 w-6 text-ochre" />
              </div>
              <span className="text-sm text-muted-foreground font-mono font-medium">Victories</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">{stats?.wins || 0}</p>
            {stats && stats.total_games > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-500">
                  {winRate}% win rate
                </span>
              </div>
            )}
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
                <Clock className="h-6 w-6 text-foreground" />
              </div>
              <span className="text-sm text-muted-foreground font-mono font-medium">Avg Game</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">
              {stats?.avg_game_length_minutes || 0}
              <span className="text-xl text-muted-foreground ml-2">min</span>
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms] group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
                <Grid3x3 className="h-6 w-6 text-foreground" />
              </div>
              <span className="text-sm text-muted-foreground font-mono font-medium">Favorite</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">
              {stats?.favorite_board_size ? `${stats.favorite_board_size}×${stats.favorite_board_size}` : '—'}
            </p>
          </Card>
        </div>

        {/* Board Theme Selector */}
        <Card className="p-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-6 w-6 text-indigo" />
            <h2 className="font-body text-2xl font-semibold">Board Theme</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="skin-select" className="text-base mb-2 block">Choose your style</Label>
              <Select value={selectedSkin} onValueChange={handleSkinChange} disabled={saving}>
                <SelectTrigger id="skin-select" className="w-full md:w-96">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {boardSkins.map((skin) => (
                    <SelectItem key={skin.id} value={skin.id}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{skin.preview}</span>
                        <div>
                          <p className="font-semibold">{skin.name}</p>
                          <p className="text-xs text-muted-foreground">{skin.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Your theme will apply to all game boards
            </p>
          </div>
        </Card>

        {/* Achievements */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[600ms]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-body text-3xl font-semibold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-ochre" />
              Achievements
            </h2>
            <Badge variant="outline" className="font-mono text-lg px-4 py-2">
              {earnedAchievements.length} / {achievements.length}
            </Badge>
          </div>

          {achievements.length === 0 ? (
            <Card className="p-16 text-center">
              <div className="text-8xl mb-6 opacity-10">🏆</div>
              <p className="text-xl text-muted-foreground font-body">Play to unlock achievements</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {achievements.map((achievement, idx) => (
                <Card
                  key={achievement.id}
                  className={`p-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                    achievement.earned
                      ? 'border-2 border-ochre/50 bg-gradient-to-br from-ochre/5 to-transparent hover:shadow-xl hover:scale-[1.02]'
                      : 'opacity-50 hover:opacity-70'
                  }`}
                  style={{ animationDelay: `${700 + idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-5xl ${achievement.earned ? 'animate-bounce' : ''}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-body font-semibold text-lg">{achievement.name}</h3>
                        {achievement.earned && (
                          <Badge className="bg-ochre text-primary-foreground">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {achievement.description}
                      </p>
                      {achievement.earned && achievement.earned_at && (
                        <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {new Date(achievement.earned_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
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
