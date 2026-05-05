import type { Session } from '@supabase/supabase-js';
import { worldAppApiJson } from '@/lib/worldApp/api';
import type {
  CompetitiveAccessMode,
  CompetitiveIdentityState,
  WalletProvider,
} from '@/lib/competitiveIdentity';

export type WorldQuickplayMode = 'ranked' | 'ranked-rematch' | 'resume-ranked' | 'room' | 'join-room';

export type WorldQuickplayPayload =
  | {
      mode: 'ranked';
      gameKey: string;
      competitiveAccessMode?: CompetitiveAccessMode;
      walletProvider?: WalletProvider;
    }
  | {
      mode: 'ranked-rematch';
      gameKey?: string;
      matchId?: string;
      competitiveAccessMode?: CompetitiveAccessMode;
      walletProvider?: WalletProvider;
    }
  | {
      mode: 'resume-ranked';
      matchId?: string;
      competitiveAccessMode?: CompetitiveAccessMode;
      walletProvider?: WalletProvider;
    }
  | {
      mode: 'room';
      gameKey: string;
      competitiveAccessMode?: CompetitiveAccessMode;
      walletProvider?: WalletProvider;
    }
  | {
      mode: 'join-room';
      code: string;
    };

export type WorldQuickplayResult = {
  ok: true;
  mode: WorldQuickplayMode;
  gameKey?: string;
  walletProvider?: WalletProvider | null;
  competitiveAccessMode?: CompetitiveAccessMode;
  matchId?: string;
  rematchOf?: string | null;
  status?: string;
  lobby?: {
    id: string;
    code?: string | null;
    [key: string]: unknown;
  };
  code?: string | null;
  destination: string;
  joined?: boolean;
  waiting?: boolean;
};

export type WorldQuickplayState = {
  ok: true;
  profile: {
    username: string | null;
    world_username: string | null;
    profile_picture_url: string | null;
    world_app_bound_at: string | null;
    is_verified_human: boolean;
  } | null;
  identity: {
    profile_id: string;
    world_username: string | null;
    profile_picture_url: string | null;
    wallet_auth_at: string | null;
    idkit_verified_at: string | null;
  } | null;
  gates: {
    walletBound: boolean;
    humanVerified: boolean;
    canOpenRoom: boolean;
    canEnterRanked: boolean;
  };
  competitiveIdentity: CompetitiveIdentityState | null;
  rooms: Array<{
    id: string;
    code: string;
    game_key: string | null;
    board_size: number;
    status: string;
    created_at: string;
    world_id: string | null;
    playerCount: number;
  }>;
  events: Array<{
    id: string;
    name: string;
    status: string;
    competitive_mode: boolean | null;
    start_time: string | null;
    max_players: number | null;
  }>;
  worlds: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    visibility: string;
    createdAt: string;
    updatedAt: string;
    instanceCount: number;
    ownerName: string;
    ownerAvatarColor: string | null;
    memberCount: number;
    eventCount: number;
    userRole: string | null;
  }>;
  competitive: {
    rankedGate: {
      status: 'ready' | 'wallet_required' | 'human_required' | 'pass_required';
      title: string;
      body: string;
    };
    activeMatch: {
      id: string;
      gameKey: string;
      status: string;
      color: number | null;
      createdAt: string;
      updatedAt: string | null;
      destination: string;
    } | null;
    games: Array<{
      gameKey: string;
      label: string;
      rating: number;
      gamesRated: number;
      rank: number | null;
      updatedAt: string | null;
      queue: {
        waiting: number;
        active: number;
      };
      canEnterRanked: boolean;
    }>;
    leaderboard: Array<{
      profileId: string;
      gameKey: string;
      username: string;
      avatarColor: string | null;
      isVerifiedHuman: boolean;
      rating: number;
      gamesRated: number;
      rank: number;
    }>;
    recentResults: Array<{
      id: string;
      matchId: string | null;
      gameKey: string;
      oldRating: number;
      newRating: number;
      ratingChange: number;
      outcome: 'win' | 'loss' | 'draw';
      createdAt: string;
    }>;
    events: Array<{
      id: string;
      name: string;
      status: string;
      competitive_mode: boolean | null;
      start_time: string | null;
      max_players: number | null;
    }>;
  };
};

export function loadWorldQuickplayState(session: Session) {
  return worldAppApiJson<WorldQuickplayState>('/api/world/quickplay/state', session, {
    method: 'GET',
  });
}

export function runWorldQuickplay(session: Session, payload: WorldQuickplayPayload) {
  return worldAppApiJson<WorldQuickplayResult>('/api/world/quickplay', session, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
