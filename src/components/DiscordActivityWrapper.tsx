import React from 'react';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface DiscordActivityWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides Discord-specific UI enhancements
 * when the app is running as a Discord Activity.
 */
export const DiscordActivityWrapper: React.FC<DiscordActivityWrapperProps> = ({ children }) => {
  const { 
    isDiscordEnvironment, 
    isReady, 
    isAuthenticated, 
    discordUser,
    participants,
    error 
  } = useDiscord();

  // If not in Discord, just render children normally
  if (!isDiscordEnvironment) {
    return <>{children}</>;
  }

  // Show loading state while SDK initializes
  if (!isReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-gentle-pulse text-6xl">⬡</div>
          <p className="text-muted-foreground">Connecting to Discord...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Connection Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Try restarting the activity or check the Discord Activity settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Discord Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`gap-1.5 ${isAuthenticated ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'}`}
            >
              {isAuthenticated ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isAuthenticated ? 'Connected' : 'Connecting...'}
            </Badge>
            
            {discordUser && (
              <span className="text-sm text-muted-foreground">
                Playing as <span className="font-medium text-foreground">{discordUser.global_name || discordUser.username}</span>
              </span>
            )}
          </div>

          {participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {participants.length} in channel
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content with padding for status bar */}
      <div className="pt-12">
        {children}
      </div>
    </div>
  );
};
