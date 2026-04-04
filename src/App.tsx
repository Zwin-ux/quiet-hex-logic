import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AchievementToast } from "@/components/AchievementToast";
import { DeploymentConfigScreen } from "@/components/DeploymentConfigScreen";
import { DiscordProvider } from "@/lib/discord/DiscordContext";
import { DiscordActivityWrapper } from "@/components/DiscordActivityWrapper";
import { BaseProvider } from "@/lib/base/BaseProvider";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { EnvSanityBanner } from "@/components/EnvSanityBanner";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageTransition } from "@/components/PageTransition";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Eager: primary entry points
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Lobby from "./pages/Lobby";
import Match from "./pages/Match";

// Lazy: secondary pages
const Friends = lazy(() => import("./pages/Friends"));
const History = lazy(() => import("./pages/History"));
const Replay = lazy(() => import("./pages/Replay"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const LobbyView = lazy(() => import("./pages/LobbyView"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentView = lazy(() => import("./pages/TournamentView"));
const Premium = lazy(() => import("./pages/Premium"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Puzzles = lazy(() => import("./pages/Puzzles"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const Mods = lazy(() => import("./pages/Mods"));
const Arena = lazy(() => import("./pages/Arena"));
const Workbench = lazy(() => import("./pages/Workbench"));
const Docs = lazy(() => import("./pages/Docs"));
const BotProfile = lazy(() => import("./pages/BotProfile"));
const Debug = lazy(() => import("./pages/Debug"));

const queryClient = new QueryClient();
const supabaseConfigError = getSupabaseConfigError();

// Prefetch auth session on app load for faster Quick Play
function AuthPrefetcher() {
  useEffect(() => {
    supabase.auth.getSession();
  }, []);
  return null;
}

const App = () => {
  const allowDebugRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/debug');

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
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Loading…</div></div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/tutorial" element={<Tutorial />} />
                <Route path="/lobby" element={<RouteErrorBoundary fallbackTitle="Lobby failed to load"><Lobby /></RouteErrorBoundary>} />
                <Route path="/lobby/:lobbyId" element={<RouteErrorBoundary fallbackTitle="Lobby failed to load"><LobbyView /></RouteErrorBoundary>} />
                <Route path="/match/:matchId" element={<RouteErrorBoundary fallbackTitle="Match failed to load"><Match /></RouteErrorBoundary>} />
                <Route path="/tournaments" element={<RouteErrorBoundary fallbackTitle="Tournaments failed to load"><Tournaments /></RouteErrorBoundary>} />
                <Route path="/tournament/:tournamentId" element={<RouteErrorBoundary fallbackTitle="Tournament failed to load"><TournamentView /></RouteErrorBoundary>} />
                <Route path="/friends" element={<RouteErrorBoundary fallbackTitle="Friends failed to load"><Friends /></RouteErrorBoundary>} />
                <Route path="/history" element={<RouteErrorBoundary fallbackTitle="History failed to load"><History /></RouteErrorBoundary>} />
                <Route path="/replay/:matchId" element={<RouteErrorBoundary fallbackTitle="Replay failed to load"><Replay /></RouteErrorBoundary>} />
                <Route path="/profile" element={<RouteErrorBoundary fallbackTitle="Profile failed to load"><Profile /></RouteErrorBoundary>} />
                <Route path="/profile/:userId" element={<RouteErrorBoundary fallbackTitle="Profile failed to load"><Profile /></RouteErrorBoundary>} />
                <Route path="/profile/edit" element={<RouteErrorBoundary fallbackTitle="Edit Profile failed to load"><EditProfile /></RouteErrorBoundary>} />
                <Route path="/premium" element={<RouteErrorBoundary fallbackTitle="Premium failed to load"><Premium /></RouteErrorBoundary>} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/puzzles" element={<RouteErrorBoundary fallbackTitle="Puzzles failed to load"><Puzzles /></RouteErrorBoundary>} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/support" element={<Support />} />
                <Route path="/mods" element={<RouteErrorBoundary fallbackTitle="Mods failed to load"><Mods /></RouteErrorBoundary>} />
                <Route path="/arena" element={<RouteErrorBoundary fallbackTitle="Arena failed to load"><Arena /></RouteErrorBoundary>} />
                <Route path="/bot/:botId" element={<RouteErrorBoundary fallbackTitle="Bot page failed to load"><BotProfile /></RouteErrorBoundary>} />
                <Route path="/workbench" element={<RouteErrorBoundary fallbackTitle="Workbench failed to load"><Workbench /></RouteErrorBoundary>} />
                <Route path="/docs" element={<RouteErrorBoundary fallbackTitle="Docs failed to load"><Docs /></RouteErrorBoundary>} />
                <Route path="/debug" element={<RouteErrorBoundary fallbackTitle="Debug failed to load"><Debug /></RouteErrorBoundary>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
