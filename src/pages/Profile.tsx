import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Palette, Settings, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthConnectionsSection } from "@/components/AuthConnectionsSection";
import { BaseWalletSectionLazy } from "@/components/Base";
import WorldIDWidget from "@/components/WorldID";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SectionRail } from "@/components/board/SectionRail";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { RatingHistoryChart } from "@/components/RatingHistoryChart";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
import { useAuthConnections } from "@/hooks/useAuthConnections";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDiscord } from "@/lib/discord/DiscordContext";
import { boardSkins } from "@/lib/boardSkins";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { useUserStats } from "@/hooks/useUserStats";
import { toast } from "sonner";

interface ProfileData {
  username: string;
  avatar_color: string;
  bio: string;
  board_skin?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  elo_rating?: number | null;
  is_verified_human?: boolean | null;
}

export default function Profile() {
  useDocumentTitle("Profile");

  const { user } = useAuth();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { achievements, loading: achievementsLoading } = useAchievements(user?.id);
  const { history: ratingHistory, loading: ratingHistoryLoading } = useRatingHistory(user?.id, 30);
  const { discordUser } = useDiscord();
  const { connections } = useAuthConnections();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedSkin, setSelectedSkin] = useState("classic");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const googleConnection = connections.find((connection) => connection.provider === "google");

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (location.hash !== "#identity") return;

    const timer = window.setTimeout(() => {
      document.getElementById("identity")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  async function loadProfile() {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_color, bio, board_skin, discord_id, discord_username, elo_rating, is_verified_human")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data as ProfileData);
      setSelectedSkin(data.board_skin || "classic");
    }
  }

  const handleSkinChange = async (skinId: string) => {
    setSelectedSkin(skinId);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ board_skin: skinId } as never)
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Board theme saved");
    } catch (error) {
      toast.error("Failed to save theme");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (statsLoading || achievementsLoading || ratingHistoryLoading) {
    return <ProfileSkeleton />;
  }

  const winRate = stats?.total_games ? Math.round((stats.wins / stats.total_games) * 100) : 0;
  const earnedAchievements = achievements.filter((achievement) => achievement.earned);
  const linkedProviderCount = Math.max(connections.length + (user?.email ? 1 : 0), 1);
  const trustLabel = profile?.is_verified_human ? "competitive ready" : "casual only";

  return (
    <SiteFrame>
      <div className="space-y-8">
        <SectionRail
          eyebrow="Identity"
          title={
            <div className="flex flex-wrap items-center gap-3">
              <span>{profile?.username || "Profile"}</span>
              {profile?.is_verified_human ? <StateTag tone="success">verified human</StateTag> : null}
            </div>
          }
          description={
            profile?.bio
              ? profile.bio
              : "This page is the durable account rail. Connections, trust state, and recovery live here before cosmetic profile systems."
          }
          actions={
            <Button variant="outline" onClick={() => navigate("/profile/edit")}>
              <Settings className="h-4 w-4" />
              Edit profile
            </Button>
          }
          meta={
            <>
              <CounterBlock label="rating" value={profile?.elo_rating ?? 1200} />
              <CounterBlock label="games" value={stats?.total_games || 0} />
              <CounterBlock label="win rate" value={`${winRate}%`} />
              <CounterBlock label="methods" value={linkedProviderCount} />
            </>
          }
          status={
            <UserAvatar
              username={profile?.username || "User"}
              color={profile?.discord_id ? "discord" : (profile?.avatar_color || "indigo")}
              size="lg"
              imageUrl={profile?.discord_id || discordUser?.id ? null : (googleConnection?.avatarUrl ?? null)}
              discordId={profile?.discord_id || discordUser?.id}
              discordAvatar={discordUser?.avatar}
            />
          }
        />

        <div id="identity" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <VenuePanel
            eyebrow="Account Connections"
            title="One identity, multiple doors."
            description="Google and email get people into BOARD fast. Extra providers are recovery and convenience, not separate accounts."
          >
            <AuthConnectionsSection />
          </VenuePanel>

          <VenuePanel
            eyebrow="Trust & Verification"
            title={profile?.is_verified_human ? "Competitive ready" : "Competitive gate still open"}
            description="World ID is the trust upgrade. Competitive queues and competitive events require it. Casual hosting and local practice do not."
            titleBarEnd={<StateTag tone={profile?.is_verified_human ? "success" : "warning"}>{trustLabel}</StateTag>}
          >
            <div className="space-y-4">
              <WorldIDWidget />
              <div className="border border-black bg-[#fbfaf8] px-4 py-4">
                <p className="board-rail-label text-black/55">Wallet / Base</p>
                <div className="mt-4">
                  <BaseWalletSectionLazy />
                </div>
              </div>
            </div>
          </VenuePanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <VenuePanel
            eyebrow="Competitive rating"
            title="Current form"
            description="This surface is intentionally subordinate to identity and trust. Rating matters, but it should not drown the account model."
          >
            <RatingHistoryChart
              history={ratingHistory}
              currentRating={profile?.elo_rating ?? 1200}
            />
          </VenuePanel>

          <VenuePanel
            eyebrow="Board theme"
            title="Choose the board skin"
            description="Cosmetic choices stay below the trust rail. Keep the identity path clear first."
          >
            <div className="grid gap-3">
              {boardSkins.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => handleSkinChange(skin.id)}
                  disabled={saving}
                  className={`border px-4 py-4 text-left transition-colors ${
                    selectedSkin === skin.id
                      ? "border-black bg-[#efebe3]"
                      : "border-black/16 bg-white hover:bg-[#efebe3]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-black">{skin.name}</p>
                      <p className="mt-1 text-sm leading-6 text-black/62">{skin.description}</p>
                    </div>
                    <div className="text-3xl">{skin.preview}</div>
                  </div>
                </button>
              ))}
            </div>
          </VenuePanel>
        </div>

        <VenuePanel
          eyebrow="Achievements"
          title={`${earnedAchievements.length}/${achievements.length} earned`}
          description="Progress remains visible, but it no longer competes with identity, recovery, and trust."
          titleBarEnd={
            <div className="retro-status-strip">
              <span>profile</span>
              <span>history</span>
            </div>
          }
        >
          {achievements.length === 0 ? (
            <div className="border border-dashed border-black/20 bg-white px-4 py-6 text-sm leading-7 text-black/62">
              Play matches and events to start filling this archive.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`border px-4 py-4 ${
                    achievement.earned ? "border-black bg-white" : "border-black/16 bg-[#fbfaf8] opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-black">{achievement.name}</p>
                        {achievement.earned ? <StateTag tone="success">earned</StateTag> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/62">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}
