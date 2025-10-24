import { supabase } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';

type ToastFunction = (message: string, options?: { description?: string }) => void;

type JoinLobbyParams = {
  code: string;
  userId: string;
  navigate: NavigateFunction;
  toast: {
    success: ToastFunction;
    error: ToastFunction;
    info: ToastFunction;
  };
  retryCount?: number;
};

type JoinLobbyResult = {
  success: boolean;
  lobbyId?: string;
  error?: string;
};

/**
 * Unified helper function to join a lobby by code.
 * Handles errors, retries, and navigation consistently.
 * Used by both JoinLobby component and challenge accept handler.
 */
export async function joinLobbyAndNavigate({
  code,
  userId,
  navigate,
  toast,
  retryCount = 0,
}: JoinLobbyParams): Promise<JoinLobbyResult> {
  if (!code || code.length < 4) {
    toast.error('Please enter a valid lobby code');
    return { success: false, error: 'Invalid code length' };
  }

  if (!userId) {
    toast.error('You must be logged in to join a lobby');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('join-lobby', {
      body: { code: code.toUpperCase() },
    });

    if (error) throw error;

    if (data?.error) {
      // Provide specific error messages for common failures
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('not found') || errorMsg.includes('already started')) {
        throw new Error('Invalid code or lobby already started');
      } else if (errorMsg.includes('full')) {
        throw new Error('This lobby already has 2 players');
      } else {
        throw new Error(data.error);
      }
    }

    if (!data?.lobby?.id) {
      throw new Error('Invalid response from server');
    }

    toast.success('Joined lobby!');

    // Ensure navigation happens
    navigate(`/lobby/${data.lobby.id}`);

    return { success: true, lobbyId: data.lobby.id };
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown error occurred';

    // Check if it's a network error and retry
    if (
      retryCount < 2 &&
      (errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout'))
    ) {
      // Exponential backoff: 500ms, 1000ms
      const delay = 500 * Math.pow(2, retryCount);
      toast.info(`Connection issue, retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));

      return joinLobbyAndNavigate({
        code,
        userId,
        navigate,
        toast,
        retryCount: retryCount + 1,
      });
    }

    // Show user-friendly error
    toast.error('Failed to join lobby', {
      description: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Helper to format error messages consistently across the app
 */
export function getLobbyErrorMessage(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('not found')) {
    return 'Lobby not found. The code may be invalid or the game has already started.';
  }

  if (errorLower.includes('full')) {
    return 'This lobby is full (2/2 players).';
  }

  if (errorLower.includes('already started')) {
    return 'This game has already started. You cannot join now.';
  }

  if (errorLower.includes('unauthorized') || errorLower.includes('auth')) {
    return 'You must be signed in to join lobbies.';
  }

  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Return original error if no specific match
  return error;
}
