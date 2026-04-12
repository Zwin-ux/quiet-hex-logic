import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useAchievements } from '@/hooks/useAchievements';
import { useRatingHistory } from '@/hooks/useRatingHistory';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Trophy,
  Target,
  Clock,
  Grid3x3,
  Palette,
  TrendingUp,
  Settings,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { boardSkins } from '@/lib/boardSkins';
import { toast } from 'sonner';
import { RatingHistoryChart } from '@/components/RatingHistoryChart';
import WorldIDWidget from '@/components/WorldID';
import { BaseWalletSectionLazy } from '@/components/Base';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import { NavBar } from '@/components/NavBar';
import { AuthConnectionsSection } from '@/components/AuthConnectionsSection';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface ProfileData {
  username: string;
  avatar_color: string;
  bio: string;
  discord_id?: string | null;
  discord_username?: string | null;
  elo_rating?: number | null;
  is_verified_human?: boolean | null;
}

const Profile = () => {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { achievements, loading: achievementsLoading } = useAchievements(user?.id);
  const { history: ratingHistory, loading: ratingHistoryLoading } = useRatingHistory(user?.id, 30);
  const { discordUser, isDiscordEnvironment } = useDiscord();
  const navigate = useNavigate();
  const [selectedSkin, setSelectedSkin] = useState('classic');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_color, bio, board_skin, discord_id, discord_username, elo_rating, is_verified_human')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data as ProfileData);
      setSelectedSkin(data.board_skin || 'classic');
    }
  };

  if (statsLoading || achievementsLoading || ratingHistoryLoading) {
    return <ProfileSkeleton />;
  }

  const winRate = stats ? Math.round((stats.wins / stats.total_games) * 100) : 0;
  const earnedAchievements = achievements.filter(a => a.earned);

  const handleSkinChange = async (skinId: string) => {
    setSelectedSkin(skinId);
    setSaving(true);
    try {
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
    <div className="min-h-screen">
      <NavBar />
      <div className="relative bg-gradient-to-br from-indigo/10 via-background to-ochre/10 border-b border-border/50 overflow-hidden pt-14">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[10%] text-6xl opacity-5 animate-float">⬡</div>
          <div className="absolute top-40 right-[15%] text-8xl opacity-5 animate-float" style={{ animationDelay: '1s' }}>⬡</div>
          <div className="absolute bottom-20 left-[20%] text-7xl opacity-5 animate-float" style={{ animationDelay: '2s' }}>⬡</div>
        </div>

        <div className="relative max-w-5xl mx-auto p-4 md:p-8 pb-12">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo to-ochre rounded-full blur-xl opacity-30 animate-gentle-pulse"></div>
                <UserAvatar
                  username={profile?.username || 'User'}
                  color={profile?.discord_id ? 'discord' : (profile?.avatar_color || 'indigo')}
                  size="xl"
                  className="relative"
                  discordId={profile?.discord_id || discordUser?.id}
                  discordAvatar={discordUser?.avatar}
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="font-body text-5xl md:text-6xl font-bold bg-gradient-to-br from-indigo via-indigo/80 to-ochre bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {profile?.username || 'Your Profile'}
                  </h1>
                  {profile?.is_verified_human && (
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500 gap-1 shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                {profile?.discord_username && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2] font-mono">
                      <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      @{profile.discord_username}
                    </Badge>
                  </div>
                )}
                {profile?.bio && (
                  <p className="text-muted-foreground font-mono text-lg max-w-md">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/profile/edit')}
              className="gap-2 hover:bg-indigo/10 hover:border-indigo/50 hover:scale-105 transition-all group"
            >
              <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-8">
          <Card className="relative p-6 bg-gradient-to-br from-indigo/5 to-background hover:from-indigo/10 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_30px_-5px_hsl(var(--indigo)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-50 group overflow-hidden col-span-1 md:col-span-2 lg:col-span-4">
            <div className="absolute top-0 right-0 text-8xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⭐</div>
            <div className="relative flex flex-col items-center justify-center py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
                  <Trophy className="h-8 w-8 text-indigo" />
                </div>
                <span className="text-lg text-muted-foreground font-mono font-medium tracking-wide">Competitive Rating</span>
              </div>
              <p className="text-7xl font-bold tabular-nums tracking-tighter bg-gradient-to-br from-indigo via-purple-500 to-indigo bg-clip-text text-transparent">
                {profile?.elo_rating ?? 1200}
              </p>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Global rank: <span className="text-foreground">Unranked</span>
              </p>
            </div>
          </Card>

          <Card className="relative p-6 bg-gradient-to-br from-indigo/5 to-background hover:from-indigo/10 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_30px_-5px_hsl(var(--indigo)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 group overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⬡</div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
                  <Target className="h-6 w-6 text-indigo" />
                </div>
                <span className="text-sm text-muted-foreground font-mono font-medium">Games Played</span>
              </div>
              <p className="text-5xl font-bold tabular-nums">{stats?.total_games || 0}</p>
            </div>
          </Card>

          <Card className="relative p-6 bg-gradient-to-br from-ochre/5 to-background hover:from-ochre/10 border-ochre/20 hover:border-ochre/40 hover:shadow-[0_0_30px_-5px_hsl(var(--ochre)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 group overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">🏆</div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-ochre/10 group-hover:bg-ochre/20 group-hover:scale-110 transition-all duration-300">
                  <Trophy className="h-6 w-6 text-ochre" />
                </div>
                <span className="text-sm text-muted-foreground font-mono font-medium">Victories</span>
              </div>
              <p className="text-5xl font-bold tabular-nums mb-2">{stats?.wins || 0}</p>
              {stats && stats.total_games > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500 animate-gentle-pulse" />
                  <span className="text-sm font-bold text-emerald-500">
                    {winRate}% win rate
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="relative p-6 bg-gradient-to-br from-muted/30 to-background hover:from-muted/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 group overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⏱️</div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/70 group-hover:scale-110 transition-all duration-300">
                  <Clock className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-sm text-muted-foreground font-mono font-medium">Avg Game</span>
              </div>
              <p className="text-5xl font-bold tabular-nums">
                {stats?.avg_game_length_minutes || 0}
                <span className="text-2xl text-muted-foreground ml-2">min</span>
              </p>
            </div>
          </Card>

          <Card className="relative p-6 bg-gradient-to-br from-muted/30 to-background hover:from-muted/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms] group overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">📐</div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/70 group-hover:scale-110 transition-all duration-300">
                  <Grid3x3 className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-sm text-muted-foreground font-mono font-medium">Favorite Size</span>
              </div>
              <p className="text-5xl font-bold tabular-nums">
                {stats?.favorite_board_size ? `${stats.favorite_board_size}×${stats.favorite_board_size}` : '—'}
              </p>
            </div>
          </Card>
        </div>

        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[450ms]">
          <RatingHistoryChart
            history={ratingHistory}
            currentRating={profile?.elo_rating ?? 1200}
          />
        </div>

        <Card className="relative p-8 mb-12 bg-gradient-to-br from-indigo/5 via-background to-ochre/5 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_40px_-10px_hsl(var(--indigo)/0.2)] transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-500 group overflow-hidden">
          <div className="absolute top-4 right-4 text-8xl opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-500">🎨</div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
                <Palette className="h-7 w-7 text-indigo" />
              </div>
              <h2 className="font-body text-3xl font-bold bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent">
                Board Theme
              </h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {boardSkins.map((skin, index) => (
                  <button
                    key={skin.id}
                    onClick={() => handleSkinChange(skin.id)}
                    disabled={saving}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 group/skin animate-in fade-in slide-in-from-bottom-4 ${selectedSkin === skin.id
                      ? 'border-indigo bg-gradient-to-br from-indigo/10 to-ochre/10 shadow-[0_0_20px_hsl(var(--indigo)/0.3)]'
                      : 'border-border hover:border-indigo/30 hover:bg-indigo/5'
                      }`}
                    style={{ animationDelay: `${550 + index * 50}ms` }}
                  >
                    <div className="text-5xl mb-3 group-hover/skin:scale-110 transition-transform">
                      {skin.preview}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-base mb-1">{skin.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{skin.description}</p>
                    </div>
                    {selectedSkin === skin.id && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-br from-indigo to-ochre rounded-full p-1.5 animate-in zoom-in duration-200 shadow-lg">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <AuthConnectionsSection />

        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[550ms]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo/10">
              <ShieldCheck className="h-7 w-7 text-indigo" />
            </div>
            <h2 className="font-body text-3xl font-bold bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent">
              Identity Verification
            </h2>
          </div>
          <div className="space-y-4">
            <WorldIDWidget />
            <BaseWalletSectionLazy />
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[600ms]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-ochre/20 to-ochre/10 animate-gentle-pulse">
                <Trophy className="h-8 w-8 text-ochre" />
              </div>
              <h2 className="font-body text-4xl font-bold bg-gradient-to-br from-ochre via-ochre/80 to-indigo bg-clip-text text-transparent">
                Achievements
              </h2>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-lg px-5 py-2.5 bg-gradient-to-br from-ochre/10 to-background border-ochre/30 hover:border-ochre/50 transition-all"
            >
              {earnedAchievements.length} / {achievements.length}
            </Badge>
          </div>

          {achievements.length === 0 ? (
            <Card className="relative p-20 text-center bg-gradient-to-br from-muted/30 to-background overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-ochre/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="text-9xl mb-8 opacity-10 group-hover:scale-110 transition-transform duration-500">🏆</div>
                <p className="text-2xl text-muted-foreground font-body">Play to unlock achievements</p>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {achievements.map((achievement, idx) => (
                <Card
                  key={achievement.id}
                  className={`relative p-7 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group overflow-hidden ${achievement.earned
                    ? 'border-2 border-ochre/50 bg-gradient-to-br from-ochre/10 via-ochre/5 to-background hover:shadow-[0_0_40px_-10px_hsl(var(--ochre)/0.4)] hover:-translate-y-1 hover:border-ochre/70'
                    : 'opacity-40 hover:opacity-60 border-border/50'
                    }`}
                  style={{ animationDelay: `${700 + idx * 50}ms` }}
                >
                  <div className="relative flex items-start gap-5">
                    <div className={`text-6xl ${achievement.earned ? 'group-hover:scale-110 transition-transform duration-300' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-body font-bold text-xl">{achievement.name}</h3>
                        {achievement.earned && (
                          <Badge className="bg-gradient-to-br from-ochre to-ochre/80 text-primary-foreground border-0 px-3 py-1 animate-gentle-pulse">
                            ✓ Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {achievement.description}
                      </p>
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
};

export default Profile;
