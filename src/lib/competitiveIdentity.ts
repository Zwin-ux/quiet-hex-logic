export type WalletProvider = 'solana' | 'world';

export type CompetitiveAccessMode = 'open' | 'pass_required' | 'invite_only';

export type ReceiptStatus = 'pending' | 'issued' | 'disputed' | 'finalized';

export type RoomPassScope = 'single_room' | 'event_series' | 'seasonal';

export type LinkedCompetitiveWallet = {
  provider: WalletProvider;
  address: string;
  linkedAt: string;
};

export type RoomPass = {
  id: string;
  label: string;
  scope: RoomPassScope;
  accessMode: CompetitiveAccessMode;
  gameKey: string | null;
  worldId: string | null;
  tournamentId: string | null;
  status: ReceiptStatus;
  issuedAt: string;
};

export type MatchReceipt = {
  id: string;
  matchId: string;
  gameKey: string;
  worldId: string | null;
  tournamentId: string | null;
  status: ReceiptStatus;
  outcome: 'win' | 'loss' | 'draw' | null;
  ratingChange: number | null;
  issuedAt: string;
};

export type CompetitiveProfile = {
  passCount: number;
  receiptCount: number;
  latestReceiptAt: string | null;
};

export type SolanaCompetitiveLane = {
  walletLinked: boolean;
  hasSeasonPass: boolean;
  accessMode: CompetitiveAccessMode;
  title: string;
  body: string;
};

export type CompetitiveIdentityState = {
  linkedWallet: LinkedCompetitiveWallet | null;
  roomPasses: RoomPass[];
  recentReceipts: MatchReceipt[];
  profile: CompetitiveProfile;
  solanaLane: SolanaCompetitiveLane;
};

export function shortenWalletAddress(address: string | null | undefined) {
  if (!address) return 'not linked';
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function hasIssuedSeasonPass(
  passes: RoomPass[] | null | undefined,
  gameKey?: string | null,
  accessMode: CompetitiveAccessMode = 'pass_required',
) {
  return (passes ?? []).some((pass) => {
    if (pass.scope !== 'seasonal') return false;
    if (pass.status !== 'issued' && pass.status !== 'finalized') return false;
    if (pass.accessMode !== accessMode) return false;
    if (!gameKey || !pass.gameKey) return true;
    return pass.gameKey === gameKey;
  });
}
