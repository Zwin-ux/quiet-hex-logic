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
  ArrowLeft,
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
import { BaseWalletSection } from '@/components/Base';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';

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
      <div className="relative bg-gradient-to-br from-indigo/10 via-background to-ochre/10 border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[10%] text-6xl opacity-5 animate-float">⬡</div>
          <div className="absolute top-40 right-[15%] text-8xl opacity-5 animate-float" style={{ animationDelay: '1s' }}>⬡</div>
          <div className="absolute bottom-20 left-[20%] text-7xl opacity-5 animate-float" style={{ animationDelay: '2s' }}>⬡</div>
        </div>

        <div className="relative max-w-5xl mx-auto p-4 md:p-8 pb-12">
          <Button
            variant="ghost"
            onClick={() => navigate('/lobby')}
            className="mb-8 gap-2 hover:gap-3 transition-all hover:bg-background/60 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </Button>

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
156:                       </svg>
157:                       @{profile.discord_username}
158:                     </Badge>
159:                   </div>
160:                 )}
161:                 {profile?.bio && (
162:                   <p className="text-muted-foreground font-mono text-lg max-w-md">
163:                     {profile.bio}
164:                   </p>
165:                 )}
166:               </div>
167:             </div>
168:             <Button
169:               variant="outline"
170:               onClick={() => navigate('/profile/edit')}
171:               className="gap-2 hover:bg-indigo/10 hover:border-indigo/50 hover:scale-105 transition-all group"
172:             >
173:               <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
174:               Edit Profile
175:             </Button>
176:           </div>
177:         </div>
178:       </div>
179: 
180:       <div className="max-w-5xl mx-auto p-4 md:p-8">
181:         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-8">
182:           <Card className="relative p-6 bg-gradient-to-br from-indigo/5 to-background hover:from-indigo/10 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_30px_-5px_hsl(var(--indigo)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-50 group overflow-hidden col-span-1 md:col-span-2 lg:col-span-4">
183:             <div className="absolute top-0 right-0 text-8xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⭐</div>
184:             <div className="relative flex flex-col items-center justify-center py-4">
185:               <div className="flex items-center gap-3 mb-2">
186:                 <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
187:                   <Trophy className="h-8 w-8 text-indigo" />
188:                 </div>
189:                 <span className="text-lg text-muted-foreground font-mono font-medium tracking-wide">Competitive Rating</span>
190:               </div>
191:               <p className="text-7xl font-bold tabular-nums tracking-tighter bg-gradient-to-br from-indigo via-purple-500 to-indigo bg-clip-text text-transparent">
192:                 {profile?.elo_rating ?? 1200}
193:               </p>
194:               <p className="text-sm text-muted-foreground mt-2 font-medium">
195:                 Global rank: <span className="text-foreground">Unranked</span>
196:               </p>
197:             </div>
198:           </Card>
199: 
200:           <Card className="relative p-6 bg-gradient-to-br from-indigo/5 to-background hover:from-indigo/10 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_30px_-5px_hsl(var(--indigo)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 group overflow-hidden">
201:             <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⬡</div>
202:             <div className="relative">
203:               <div className="flex items-center gap-3 mb-4">
204:                 <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
205:                   <Target className="h-6 w-6 text-indigo" />
206:                 </div>
207:                 <span className="text-sm text-muted-foreground font-mono font-medium">Games Played</span>
208:               </div>
209:               <p className="text-5xl font-bold tabular-nums">{stats?.total_games || 0}</p>
210:             </div>
211:           </Card>
212: 
213:           <Card className="relative p-6 bg-gradient-to-br from-ochre/5 to-background hover:from-ochre/10 border-ochre/20 hover:border-ochre/40 hover:shadow-[0_0_30px_-5px_hsl(var(--ochre)/0.3)] transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 group overflow-hidden">
214:             <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">🏆</div>
215:             <div className="relative">
216:               <div className="flex items-center gap-3 mb-4">
217:                 <div className="p-3 rounded-xl bg-ochre/10 group-hover:bg-ochre/20 group-hover:scale-110 transition-all duration-300">
218:                   <Trophy className="h-6 w-6 text-ochre" />
219:                 </div>
220:                 <span className="text-sm text-muted-foreground font-mono font-medium">Victories</span>
221:               </div>
222:               <p className="text-5xl font-bold tabular-nums mb-2">{stats?.wins || 0}</p>
223:               {stats && stats.total_games > 0 && (
224:                 <div className="flex items-center gap-2">
225:                   <TrendingUp className="h-4 w-4 text-emerald-500 animate-gentle-pulse" />
226:                   <span className="text-sm font-bold text-emerald-500">
227:                     {winRate}% win rate
228:                   </span>
229:                 </div>
230:               )}
231:             </div>
232:           </Card>
233: 
234:           <Card className="relative p-6 bg-gradient-to-br from-muted/30 to-background hover:from-muted/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 group overflow-hidden">
235:             <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">⏱️</div>
236:             <div className="relative">
237:               <div className="flex items-center gap-3 mb-4">
238:                 <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/70 group-hover:scale-110 transition-all duration-300">
239:                   <Clock className="h-6 w-6 text-foreground" />
240:                 </div>
241:                 <span className="text-sm text-muted-foreground font-mono font-medium">Avg Game</span>
242:               </div>
243:               <p className="text-5xl font-bold tabular-nums">
244:                 {stats?.avg_game_length_minutes || 0}
245:                 <span className="text-2xl text-muted-foreground ml-2">min</span>
246:               </p>
247:             </div>
248:           </Card>
249: 
250:           <Card className="relative p-6 bg-gradient-to-br from-muted/30 to-background hover:from-muted/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms] group overflow-hidden">
251:             <div className="absolute top-0 right-0 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">📐</div>
252:             <div className="relative">
253:               <div className="flex items-center gap-3 mb-4">
254:                 <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/70 group-hover:scale-110 transition-all duration-300">
255:                   <Grid3x3 className="h-6 w-6 text-foreground" />
256:                 </div>
257:                 <span className="text-sm text-muted-foreground font-mono font-medium">Favorite Size</span>
258:               </div>
259:               <p className="text-5xl font-bold tabular-nums">
260:                 {stats?.favorite_board_size ? `${stats.favorite_board_size}×${stats.favorite_board_size}` : '—'}
261:               </p>
262:             </div>
263:           </Card>
264:         </div>
265: 
266:         <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[450ms]">
267:           <RatingHistoryChart
268:             history={ratingHistory}
269:             currentRating={profile?.elo_rating ?? 1200}
270:           />
271:         </div>
272: 
273:         <Card className="relative p-8 mb-12 bg-gradient-to-br from-indigo/5 via-background to-ochre/5 border-indigo/20 hover:border-indigo/40 hover:shadow-[0_0_40px_-10px_hsl(var(--indigo)/0.2)] transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-500 group overflow-hidden">
274:           <div className="absolute top-4 right-4 text-8xl opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-500">🎨</div>
275:           <div className="relative">
276:             <div className="flex items-center gap-3 mb-8">
277:               <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 group-hover:scale-110 transition-all duration-300">
278:                 <Palette className="h-7 w-7 text-indigo" />
279:               </div>
280:               <h2 className="font-body text-3xl font-bold bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent">
281:                 Board Theme
282:               </h2>
283:             </div>
284:             <div className="space-y-6">
285:               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
286:                 {boardSkins.map((skin, index) => (
287:                   <button
288:                     key={skin.id}
289:                     onClick={() => handleSkinChange(skin.id)}
290:                     disabled={saving}
291:                     className={`relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 group/skin animate-in fade-in slide-in-from-bottom-4 ${selectedSkin === skin.id
292:                       ? 'border-indigo bg-gradient-to-br from-indigo/10 to-ochre/10 shadow-[0_0_20px_hsl(var(--indigo)/0.3)]'
293:                       : 'border-border hover:border-indigo/30 hover:bg-indigo/5'
294:                       }`}
295:                     style={{ animationDelay: `${550 + index * 50}ms` }}
296:                   >
297:                     <div className="text-5xl mb-3 group-hover/skin:scale-110 transition-transform">
304:                       {skin.preview}
305:                     </div>
306:                     <div className="text-left">
307:                       <p className="font-semibold text-base mb-1">{skin.name}</p>
308:                       <p className="text-xs text-muted-foreground line-clamp-2">{skin.description}</p>
309:                     </div>
310:                     {selectedSkin === skin.id && (
311:                       <div className="absolute -top-2 -right-2 bg-gradient-to-br from-indigo to-ochre rounded-full p-1.5 animate-in zoom-in duration-200 shadow-lg">
312:                         <Check className="h-4 w-4 text-white" />
313:                       </div>
314:                     )}
315:                   </button>
316:                 ))}
317:               </div>
318:             </div>
319:           </div>
320:         </Card>
321: 
322:         <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[550ms]">
323:           <div className="flex items-center gap-3 mb-6">
324:             <div className="p-3 rounded-xl bg-indigo/10">
325:               <ShieldCheck className="h-7 w-7 text-indigo" />
326:             </div>
327:             <h2 className="font-body text-3xl font-bold bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent">
328:               Identity Verification
329:             </h2>
330:           </div>
331:           <div className="space-y-4">
332:             <WorldIDWidget />
333:             <BaseWalletSection />
334:           </div>
335:         </div>
336: 
337:         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[600ms]">
338:           <div className="flex items-center justify-between mb-10">
339:             <div className="flex items-center gap-4">
340:               <div className="p-3 rounded-xl bg-gradient-to-br from-ochre/20 to-ochre/10 animate-gentle-pulse">
341:                 <Trophy className="h-8 w-8 text-ochre" />
342:               </div>
343:               <h2 className="font-body text-4xl font-bold bg-gradient-to-br from-ochre via-ochre/80 to-indigo bg-clip-text text-transparent">
344:                 Achievements
345:               </h2>
346:             </div>
347:             <Badge
348:               variant="outline"
349:               className="font-mono text-lg px-5 py-2.5 bg-gradient-to-br from-ochre/10 to-background border-ochre/30 hover:border-ochre/50 transition-all"
350:             >
351:               {earnedAchievements.length} / {achievements.length}
352:             </Badge>
353:           </div>
354: 
355:           {achievements.length === 0 ? (
356:             <Card className="relative p-20 text-center bg-gradient-to-br from-muted/30 to-background overflow-hidden group">
357:               <div className="absolute inset-0 bg-gradient-to-br from-ochre/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
358:               <div className="relative">
359:                 <div className="text-9xl mb-8 opacity-10 group-hover:scale-110 transition-transform duration-500">🏆</div>
360:                 <p className="text-2xl text-muted-foreground font-body">Play to unlock achievements</p>
361:               </div>
362:             </Card>
363:           ) : (
364:             <div className="grid md:grid-cols-2 gap-6">
365:               {achievements.map((achievement, idx) => (
366:                 <Card
367:                   key={achievement.id}
368:                   className={`relative p-7 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group overflow-hidden ${achievement.earned
369:                     ? 'border-2 border-ochre/50 bg-gradient-to-br from-ochre/10 via-ochre/5 to-background hover:shadow-[0_0_40px_-10px_hsl(var(--ochre)/0.4)] hover:-translate-y-1 hover:border-ochre/70'
370:                     : 'opacity-40 hover:opacity-60 border-border/50'
371:                     }`}
372:                   style={{ animationDelay: `${700 + idx * 50}ms` }}
373:                 >
374:                   <div className="relative flex items-start gap-5">
375:                     <div className={`text-6xl ${achievement.earned ? 'group-hover:scale-110 transition-transform duration-300' : 'grayscale'}`}>
376:                       {achievement.icon}
377:                     </div>
378:                     <div className="flex-1">
379:                       <div className="flex items-center justify-between mb-3">
380:                         <h3 className="font-body font-bold text-xl">{achievement.name}</h3>
381:                         {achievement.earned && (
382:                           <Badge className="bg-gradient-to-br from-ochre to-ochre/80 text-primary-foreground border-0 px-3 py-1 animate-gentle-pulse">
383:                             ✓ Earned
384:                           </Badge>
385:                         )}
386:                       </div>
387:                       <p className="text-sm text-muted-foreground leading-relaxed mb-3">
388:                         {achievement.description}
389:                       </p>
390:                     </div>
391:                   </div>
392:                 </Card>
393:               ))}
394:             </div>
395:           )}
396:         </div>
397:       </div>
398:     </div>
399:   );
400: };
401: 
402: export default Profile;
403: 
