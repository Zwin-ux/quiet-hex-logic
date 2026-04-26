import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AuthConnectionsSection } from "@/components/AuthConnectionsSection";
import { BaseWalletSectionLazy } from "@/components/Base";
import WorldIDWidget from "@/components/WorldID";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const { user, deleteAccount } = useAuth();
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
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const googleConnection = connections.find((connection) => connection.provider === "google");

  const loadProfile = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [loadProfile, user]);

  useEffect(() => {
    if (location.hash !== "#identity") return;

    const timer = window.setTimeout(() => {
      document.getElementById("identity")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

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

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);

    try {
      const { error } = await deleteAccount();

      if (error) {
        throw error;
      }

      toast.success("Account deleted", {
        description: "BOARD signed this device out.",
      });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error("Failed to delete account", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setDeletingAccount(false);
      setDeleteConfirmValue("");
    }
  };

  if (statsLoading || achievementsLoading || ratingHistoryLoading) {
    return <ProfileSkeleton />;
  }

  const winRate = stats?.total_games ? Math.round((stats.wins / stats.total_games) * 100) : 0;
  const earnedAchievements = achievements.filter((achievement) => achievement.earned);
  const linkedProviderCount = Math.max(connections.length + (user?.email ? 1 : 0), 1);
  const trustLabel = profile?.is_verified_human ? "ranked ready" : "casual only";
  const profileDescription = profile?.bio || "Link logins. Verify for ranked.";

  return (
    <SupportFrame contentClassName="pt-24">
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-start">
          <SupportPanel
            tone="dark"
            eyebrow="Identity / account"
            className="px-2 md:px-3"
            description={profileDescription}
            motionIndex={0}
            motionVariant="hero"
          >
            <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <BoardWordmark className="text-white" />
                <h1 className="mt-6 text-[clamp(2.8rem,5vw,4.8rem)] font-black leading-[0.9] tracking-[-0.07em] text-white">
                  {profile?.username || "Profile"}
                </h1>
              </div>

              <UserAvatar
                username={profile?.username || "User"}
                color={profile?.discord_id ? "discord" : (profile?.avatar_color || "indigo")}
                size="lg"
                imageUrl={profile?.discord_id || discordUser?.id ? null : (googleConnection?.avatarUrl ?? null)}
                discordId={profile?.discord_id || discordUser?.id}
                discordAvatar={discordUser?.avatar}
              />
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="support-grid-stat">
                <p className="support-mini-label text-white/58">login rule</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-white">
                  One account.
                </p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-white/58">ranked</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-white">
                  {profile?.is_verified_human ? "Ready now." : "Verify before entry."}
                </p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-white/58">recovery</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-white">
                  {user?.email ? "Email on file." : "Add email next."}
                </p>
              </div>
            </div>
          </SupportPanel>

          <SupportPanel tone="paper" motionIndex={1} motionVariant="aside">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="support-mini-label text-black/55">Account state</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="support-chip support-chip--paper">{trustLabel}</span>
                  <span className="support-chip support-chip--paper">{linkedProviderCount} methods</span>
                </div>
              </div>
              <Button variant="supportOutline" onClick={() => navigate("/profile/edit")}>
                <Settings className="h-4 w-4" />
                Edit
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">rating</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-black">{profile?.elo_rating ?? 1200}</p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">games</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-black">{stats?.total_games || 0}</p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">win rate</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-black">{winRate}%</p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">methods</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-black">{linkedProviderCount}</p>
              </div>
            </div>
          </SupportPanel>
        </div>

        <div id="identity" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SupportPanel
            tone="light"
            eyebrow="Account Connections"
            title="Link login methods"
            description="Add backups."
            motionIndex={2}
          >
            <AuthConnectionsSection variant="support" />
          </SupportPanel>

          <SupportPanel
            tone="paper"
            eyebrow="Trust & Verification"
            title={profile?.is_verified_human ? "Ranked ready" : "Verify for ranked"}
            description="World ID required for competitive."
            titleBarEnd={<span className="support-chip support-chip--paper">{trustLabel}</span>}
            motionIndex={3}
          >
            <div className="space-y-4">
              <WorldIDWidget variant="support" />
              <div className="support-inline-card support-inline-card--paper">
                <p className="support-mini-label text-black/55">Wallet / Base</p>
                <div className="mt-4">
                  <BaseWalletSectionLazy />
                </div>
              </div>
            </div>
          </SupportPanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SupportPanel
            tone="light"
            eyebrow="Competitive rating"
            title="Rating"
            description="Recent games."
            motionIndex={4}
          >
            <RatingHistoryChart
              history={ratingHistory}
              currentRating={profile?.elo_rating ?? 1200}
            />
          </SupportPanel>

          <SupportPanel
            tone="paper"
            eyebrow="Board theme"
            title="Pick board skin"
            description="Pick tiles."
            motionIndex={5}
          >
            <div className="grid gap-3">
              {boardSkins.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => handleSkinChange(skin.id)}
                  disabled={saving}
                  className={`rounded-[24px] border-[3px] px-4 py-4 text-left transition-colors ${
                    selectedSkin === skin.id
                      ? "border-[#ff6b35] bg-white"
                      : "border-black/16 bg-white/75 hover:bg-white"
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
          </SupportPanel>
        </div>

        <SupportPanel
          tone="paper"
          eyebrow="Account control"
          title="Delete account"
          description="Removes this BOARD profile and signs out this device."
          motionIndex={6}
        >
          <div className="space-y-4">
            <div className="support-note">
              Cancel paid plans first. Hosted venue billing and active support tiers should be closed before deletion.
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-500/30 text-red-700 hover:bg-red-50 hover:text-red-800">
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-black bg-[#fbfaf6]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this BOARD account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the profile, linked sessions, and player-facing account data. Type DELETE to continue.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <p className="board-rail-label text-black/55">Confirmation</p>
                  <Input
                    value={deleteConfirmValue}
                    onChange={(event) => setDeleteConfirmValue(event.target.value)}
                    placeholder="DELETE"
                    className="h-11 border-black/10 bg-white"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmValue("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteAccount();
                    }}
                    className="bg-[#0e0e0f] text-[#f6f4f0] hover:bg-[#202124]"
                    disabled={deleteConfirmValue !== "DELETE" || deletingAccount}
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SupportPanel>

        <SupportPanel
          tone="light"
          eyebrow="Achievements"
          title={`${earnedAchievements.length}/${achievements.length} unlocked`}
          description="Marks earned."
          motionIndex={7}
          motionVariant="hero"
          titleBarEnd={
            <div className="flex flex-wrap gap-2">
              <span className="support-chip support-chip--light">history</span>
            </div>
          }
        >
          {achievements.length === 0 ? (
            <div className="support-note">
              Play games. Unlock marks.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-[24px] border-[3px] px-4 py-4 ${
                    achievement.earned ? "border-[#00f5d4] bg-white/10" : "border-white/14 bg-white/6 opacity-72"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{achievement.name}</p>
                        {achievement.earned ? <span className="support-chip support-chip--light">unlocked</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/68">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SupportPanel>
      </div>
    </SupportFrame>
  );
}
