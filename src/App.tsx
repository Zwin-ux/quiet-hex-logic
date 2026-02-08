import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AchievementToast } from "@/components/AchievementToast";
import { DiscordProvider } from "@/lib/discord/DiscordContext";
import { DiscordActivityWrapper } from "@/components/DiscordActivityWrapper";
import { BaseProvider } from "@/lib/base/BaseProvider";
import { supabase } from "@/integrations/supabase/client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageTransition } from "@/components/PageTransition";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Lobby from "./pages/Lobby";
import Match from "./pages/Match";
import Friends from "./pages/Friends";
import History from "./pages/History";
import Replay from "./pages/Replay";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Tutorial from "./pages/Tutorial";
import LobbyView from "./pages/LobbyView";
import Tournaments from "./pages/Tournaments";
import TournamentView from "./pages/TournamentView";
import Premium from "./pages/Premium";
import Leaderboard from "./pages/Leaderboard";
import Puzzles from "./pages/Puzzles";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import Mods from "./pages/Mods";

const queryClient = new QueryClient();

// Prefetch auth session on app load for faster Quick Play
function AuthPrefetcher() {
  useEffect(() => {
    supabase.auth.getSession();
  }, []);
  return null;
}

const App = () => (
  <DiscordProvider>
    <AuthPrefetcher />
    <QueryClientProvider client={queryClient}>
      <BaseProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AchievementToast />
          
          <BrowserRouter>
            <ErrorBoundary>
            <DiscordActivityWrapper>
              <PageTransition>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </PageTransition>
            </DiscordActivityWrapper>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </BaseProvider>
    </QueryClientProvider>
  </DiscordProvider>
);

export default App;
