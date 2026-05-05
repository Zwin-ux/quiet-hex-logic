import { useCallback, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  completeSolanaLink,
  issueCompetitiveReceipt,
  issueCompetitiveRoomPass,
  requestSolanaLinkChallenge,
  type SolanaCompetitiveResponse,
} from '@/lib/worldApp/competitive';
import { connectAndSignSolanaMessage, getInjectedSolanaProvider, getSolanaProviderLabel } from '@/lib/solanaWallet';

type SolanaCompetitiveAction = 'connect' | 'pass' | 'receipt' | null;

export function useSolanaCompetitive(
  session: Session | null | undefined,
  onState: (response: SolanaCompetitiveResponse) => void,
) {
  const [action, setAction] = useState<SolanaCompetitiveAction>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureSession = useCallback(() => {
    if (!session) {
      throw new Error('Create a BOARD session before linking Solana.');
    }

    return session;
  }, [session]);

  const connectWallet = useCallback(async () => {
    setAction('connect');
    setError(null);

    try {
      const currentSession = ensureSession();
      const challenge = await requestSolanaLinkChallenge(currentSession);
      const signaturePayload = await connectAndSignSolanaMessage(challenge.message);
      const result = await completeSolanaLink(currentSession, {
        nonce: challenge.nonce,
        requestId: challenge.requestId,
        provider: signaturePayload.provider,
        address: signaturePayload.address,
        message: signaturePayload.message,
        signatureBase64: signaturePayload.signatureBase64,
      });
      onState(result);
      return result;
    } catch (linkError) {
      const message = linkError instanceof Error ? linkError.message : 'Could not link Solana wallet.';
      setError(message);
      throw linkError;
    } finally {
      setAction(null);
    }
  }, [ensureSession, onState]);

  const activateSeasonPass = useCallback(
    async (gameKey?: string | null) => {
      setAction('pass');
      setError(null);

      try {
        const currentSession = ensureSession();
        const result = await issueCompetitiveRoomPass(currentSession, {
          scope: 'seasonal',
          accessMode: 'pass_required',
          gameKey: gameKey ?? null,
        });
        onState(result);
        return result;
      } catch (passError) {
        const message = passError instanceof Error ? passError.message : 'Could not activate room pass.';
        setError(message);
        throw passError;
      } finally {
        setAction(null);
      }
    },
    [ensureSession, onState],
  );

  const activateEventPass = useCallback(
    async (tournamentId: string, gameKey?: string | null) => {
      setAction('pass');
      setError(null);

      try {
        const currentSession = ensureSession();
        const result = await issueCompetitiveRoomPass(currentSession, {
          scope: 'event_series',
          accessMode: 'pass_required',
          tournamentId,
          gameKey: gameKey ?? null,
          label: 'Competitive event pass',
        });
        onState(result);
        return result;
      } catch (passError) {
        const message = passError instanceof Error ? passError.message : 'Could not activate event pass.';
        setError(message);
        throw passError;
      } finally {
        setAction(null);
      }
    },
    [ensureSession, onState],
  );

  const sealReceipt = useCallback(
    async (matchId: string) => {
      setAction('receipt');
      setError(null);

      try {
        const currentSession = ensureSession();
        const result = await issueCompetitiveReceipt(currentSession, { matchId });
        onState(result);
        return result;
      } catch (receiptError) {
        const message = receiptError instanceof Error ? receiptError.message : 'Could not issue match receipt.';
        setError(message);
        throw receiptError;
      } finally {
        setAction(null);
      }
    },
    [ensureSession, onState],
  );

  return useMemo(
    () => ({
      action,
      error,
      walletAvailable: Boolean(getInjectedSolanaProvider()),
      walletLabel: getSolanaProviderLabel(getInjectedSolanaProvider()),
      connectWallet,
      activateSeasonPass,
      activateEventPass,
      sealReceipt,
    }),
    [action, activateEventPass, activateSeasonPass, connectWallet, error, sealReceipt],
  );
}
