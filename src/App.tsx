import { useEffect, lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AchievementToast } from "@/components/AchievementToast";
import { DeploymentConfigScreen } from "@/components/DeploymentConfigScreen";
import { DiscordActivityWrapper } from "@/components/DiscordActivityWrapper";
import { EnvSanityBanner } from "@/components/EnvSanityBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/PageTransition";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { WebSurfaceGate } from "@/components/surfaces/WebSurfaceGate";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseProvider } from "@/lib/base/BaseProvider";
import { DiscordProvider } from "@/lib/discord/DiscordContext";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Auth = lazy(() => import("./pages/Auth"));
const Lobby = lazy(() => import("./pages/Lobby"));
const Match = lazy(() => import("./pages/Match"));
const Friends = lazy(() => import("./pages/Friends"));
const History = lazy(() => import("./pages/History"));
const Replay = lazy(() => import("./pages/Replay"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Worlds = lazy(() => import("./pages/Worlds.tsx"));
const WorldView = lazy(() => import("./pages/WorldView.tsx"));
const WorldSettings = lazy(() => import("./pages/WorldSettings"));
const WorldVariants = lazy(() => import("./pages/WorldVariants"));
const LobbyView = lazy(() => import("./pages/LobbyView"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentView = lazy(() => import("./pages/TournamentView"));
const Premium = lazy(() => import("./pages/Premium"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Puzzles = lazy(() => import("./pages/Puzzles"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const Hiring = lazy(() => import("./pages/Hiring"));
const Host = lazy(() => import("./pages/Host"));
const Mods = lazy(() => import("./pages/Mods"));
const Arena = lazy(() => import("./pages/Arena"));
const Workbench = lazy(() => import("./pages/Workbench"));
const Docs = lazy(() => import("./pages/Docs"));
const BotProfile = lazy(() => import("./pages/BotProfile"));
const Debug = lazy(() => import("./pages/Debug"));

const queryClient = new QueryClient();
const supabaseConfigError = getSupabaseConfigError();

function AuthPrefetcher() {
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  return null;
}

const suspenseFallback = (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="board-rail-label animate-pulse text-black/50">Loading...</div>
  </div>
);

function webOnly(
  capability: "editWorldSettings" | "useWorkbench" | "useArena",
  element: ReactNode,
  title: string,
  reason: string,
) {
  return (
    <WebSurfaceGate capability={capability} title={title} reason={reason}>
      {element}
    </WebSurfaceGate>
  );
}

const App = () => {
  const allowDebugRoute =
    typeof window !== "undefined" && window.location.pathname.startsWith("/debug");

  if (supabaseConfigError && !allowDebugRoute) {
    return <DeploymentConfigScreen />;
  }

  return (
    <DiscordProvider>
      <AuthPrefetcher />
      <QueryClientProvider client={queryClient}>
        <BaseProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AchievementToast />
            <EnvSanityBanner />

            <BrowserRouter>
              <ErrorBoundary>
                <DiscordActivityWrapper>
                  <PageTransition>
                    <Suspense fallback={suspenseFallback}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/welcome" element={<Welcome />} />
                        <Route path="/tutorial" element={<Tutorial />} />
                        <Route
                          path="/worlds"
                          element={
                            <RouteErrorBoundary fallbackTitle="Worlds failed to load">
                              <Worlds />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/worlds/:worldId"
                          element={
                            <RouteErrorBoundary fallbackTitle="World failed to load">
                              <WorldView />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/worlds/:worldId/settings"
                          element={webOnly(
                            "editWorldSettings",
                            <RouteErrorBoundary fallbackTitle="World settings failed to load">
                              <WorldSettings />
                            </RouteErrorBoundary>,
                            "World settings live on web.",
                            "Branding, visibility, and venue state stay on the web authoring surface.",
                          )}
                        />
                        <Route
                          path="/worlds/:worldId/variants"
                          element={webOnly(
                            "editWorldSettings",
                            <RouteErrorBoundary fallbackTitle="World variants failed to load">
                              <WorldVariants />
                            </RouteErrorBoundary>,
                            "Variant editing lives on web.",
                            "Surface rules, package uploads, and publishing stay on the web authoring flow.",
                          )}
                        />
                        <Route
                          path="/play"
                          element={
                            <RouteErrorBoundary fallbackTitle="Play failed to load">
                              <Lobby />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/lobby"
                          element={
                            <RouteErrorBoundary fallbackTitle="Lobby failed to load">
                              <Lobby />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/lobby/:lobbyId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Lobby failed to load">
                              <LobbyView />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/match/:matchId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Match failed to load">
                              <Match />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/events"
                          element={
                            <RouteErrorBoundary fallbackTitle="Events failed to load">
                              <Tournaments />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/tournaments"
                          element={
                            <RouteErrorBoundary fallbackTitle="Tournaments failed to load">
                              <Tournaments />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/tournament/:tournamentId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Tournament failed to load">
                              <TournamentView />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/friends"
                          element={
                            <RouteErrorBoundary fallbackTitle="Friends failed to load">
                              <Friends />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/history"
                          element={
                            <RouteErrorBoundary fallbackTitle="History failed to load">
                              <History />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/replay/:matchId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Replay failed to load">
                              <Replay />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <RouteErrorBoundary fallbackTitle="Profile failed to load">
                              <Profile />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/profile/:userId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Profile failed to load">
                              <Profile />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/profile/edit"
                          element={
                            <RouteErrorBoundary fallbackTitle="Edit Profile failed to load">
                              <EditProfile />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/premium"
                          element={
                            <RouteErrorBoundary fallbackTitle="Premium failed to load">
                              <Premium />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route
                          path="/puzzles"
                          element={
                            <RouteErrorBoundary fallbackTitle="Puzzles failed to load">
                              <Puzzles />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/hiring" element={<Hiring />} />
                        <Route path="/support" element={<Support />} />
                        <Route
                          path="/host"
                          element={webOnly(
                            "editWorldSettings",
                            <RouteErrorBoundary fallbackTitle="Host failed to load">
                              <Host />
                            </RouteErrorBoundary>,
                            "Host setup lives on web.",
                            "World creation, venue setup, and publishing stay on the web organizer surface.",
                          )}
                        />
                        <Route
                          path="/mods"
                          element={webOnly(
                            "editWorldSettings",
                            <RouteErrorBoundary fallbackTitle="Mods failed to load">
                              <Mods />
                            </RouteErrorBoundary>,
                            "Mods live on web.",
                            "Package publishing and deeper variant management stay on the web editing flow.",
                          )}
                        />
                        <Route
                          path="/arena"
                          element={webOnly(
                            "useArena",
                            <RouteErrorBoundary fallbackTitle="Arena failed to load">
                              <Arena />
                            </RouteErrorBoundary>,
                            "Arena lives on web.",
                            "The full arena and builder tools are only available on the web surface.",
                          )}
                        />
                        <Route
                          path="/bot/:botId"
                          element={
                            <RouteErrorBoundary fallbackTitle="Bot page failed to load">
                              <BotProfile />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route
                          path="/workbench"
                          element={webOnly(
                            "useWorkbench",
                            <RouteErrorBoundary fallbackTitle="Workbench failed to load">
                              <Workbench />
                            </RouteErrorBoundary>,
                            "Workbench lives on web.",
                            "Builder tools and deeper engine workflows stay on the web surface.",
                          )}
                        />
                        <Route
                          path="/docs"
                          element={webOnly(
                            "useWorkbench",
                            <RouteErrorBoundary fallbackTitle="Docs failed to load">
                              <Docs />
                            </RouteErrorBoundary>,
                            "Docs live on web.",
                            "Manuals and builder references stay on the web editing surface.",
                          )}
                        />
                        <Route
                          path="/debug"
                          element={
                            <RouteErrorBoundary fallbackTitle="Debug failed to load">
                              <Debug />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </PageTransition>
                </DiscordActivityWrapper>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </BaseProvider>
      </QueryClientProvider>
    </DiscordProvider>
  );
};

export default App;
