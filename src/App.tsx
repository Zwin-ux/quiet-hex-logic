import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AchievementToast } from "@/components/AchievementToast";
import { DiscordProvider } from "@/lib/discord/DiscordContext";
import { DiscordActivityWrapper } from "@/components/DiscordActivityWrapper";

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

const queryClient = new QueryClient();

const App = () => (
  <DiscordProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AchievementToast />
        
        <BrowserRouter>
          <DiscordActivityWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/lobby/:lobbyId" element={<LobbyView />} />
              <Route path="/match/:matchId" element={<Match />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournament/:tournamentId" element={<TournamentView />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/history" element={<History />} />
              <Route path="/replay/:matchId" element={<Replay />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/puzzles" element={<Puzzles />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<Support />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DiscordActivityWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </DiscordProvider>
);

export default App;
