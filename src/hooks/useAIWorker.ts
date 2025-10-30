/**
 * React hook for managing AI Worker
 * Provides clean interface for running AI in background
 */

import { useRef, useCallback, useEffect } from 'react';
import { Hex } from '@/lib/hex/engine';
import { AIDifficulty } from '@/lib/hex/ai';
import type { AIWorkerRequest, AIWorkerResponse } from '@/workers/ai-worker';

export interface AIComputeResult {
  move: number | null;
  reasoning: string;
  computeTime: number;
}

export function useAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingResolve = useRef<((result: AIComputeResult) => void) | null>(null);
  const pendingReject = useRef<((error: Error) => void) | null>(null);

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker with module type
      workerRef.current = new Worker(
        new URL('../workers/ai-worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      workerRef.current.onmessage = (e: MessageEvent<AIWorkerResponse | { type: 'error'; error: string }>) => {
        if (e.data.type === 'error') {
          pendingReject.current?.(new Error(e.data.error));
          pendingResolve.current = null;
          pendingReject.current = null;
          return;
        }

        if (e.data.type === 'move_computed') {
          pendingResolve.current?.({
            move: e.data.move,
            reasoning: e.data.reasoning,
            computeTime: e.data.computeTime
          });
          pendingResolve.current = null;
          pendingReject.current = null;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('AI Worker error:', error);
        pendingReject.current?.(new Error('AI Worker failed'));
        pendingResolve.current = null;
        pendingReject.current = null;
      };
    } catch (error) {
      console.error('Failed to create AI Worker:', error);
    }

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Compute AI move in worker
  const computeMove = useCallback(
    (game: Hex, difficulty: AIDifficulty): Promise<AIComputeResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('AI Worker not initialized'));
          return;
        }

        // Store promise callbacks
        pendingResolve.current = resolve;
        pendingReject.current = reject;

        // Serialize game state
        const gameState = {
          n: game.n,
          board: Array.from(game.board),
          turn: game.turn,
          ply: game.ply,
          swapped: game.swapped,
          pieRule: game.pieRule
        };

        // Send request to worker
        const request: AIWorkerRequest = {
          type: 'compute_move',
          gameState,
          difficulty
        };

        workerRef.current.postMessage(request);
      });
    },
    []
  );

  return { computeMove };
}
