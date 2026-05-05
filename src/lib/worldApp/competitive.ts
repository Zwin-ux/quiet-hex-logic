import type { Session } from '@supabase/supabase-js';
import type {
  CompetitiveAccessMode,
  CompetitiveIdentityState,
  MatchReceipt,
  RoomPass,
  RoomPassScope,
  WalletProvider,
} from '@/lib/competitiveIdentity';
import { worldAppApiJson } from '@/lib/worldApp/api';

export type SolanaLinkChallenge = {
  nonce: string;
  requestId: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

export type SolanaLinkCompletePayload = {
  nonce: string;
  requestId: string;
  provider: WalletProvider;
  address: string;
  message: string;
  signatureBase64: string;
};

export type IssueRoomPassPayload = {
  scope?: RoomPassScope;
  accessMode?: CompetitiveAccessMode;
  gameKey?: string | null;
  worldId?: string | null;
  tournamentId?: string | null;
  label?: string | null;
};

export type SolanaCompetitiveResponse = {
  ok: true;
  competitiveIdentity: CompetitiveIdentityState;
};

export function requestSolanaLinkChallenge(session: Session) {
  return worldAppApiJson<SolanaLinkChallenge>('/api/world/solana/challenge', session, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function completeSolanaLink(session: Session, payload: SolanaLinkCompletePayload) {
  return worldAppApiJson<SolanaCompetitiveResponse>('/api/world/solana/complete-link', session, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function issueCompetitiveRoomPass(session: Session, payload: IssueRoomPassPayload) {
  return worldAppApiJson<SolanaCompetitiveResponse & { roomPass: RoomPass }>(
    '/api/world/competitive/issue-room-pass',
    session,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function issueCompetitiveReceipt(session: Session, payload: { matchId: string }) {
  return worldAppApiJson<SolanaCompetitiveResponse & { receipt: MatchReceipt }>(
    '/api/world/competitive/issue-match-receipt',
    session,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}
