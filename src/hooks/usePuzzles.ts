import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Puzzle = {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'master';
  category: string;
  board_size: number;
  setup_moves: { cell: number; color: number }[];
  solution_moves: { cell: number; color: number }[];
  rating: number;
  times_played: number;
  times_solved: number;
  created_at: string;
};

export type PuzzleAttempt = {
  id: string;
  user_id: string;
  puzzle_id: string;
  completed: boolean;
  attempts: number;
  time_seconds: number | null;
  completed_at: string | null;
};

export const usePuzzles = (userId: string | undefined) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [attempts, setAttempts] = useState<Record<string, PuzzleAttempt>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        const { data: puzzlesData, error: puzzlesError } = await supabase
          .from('puzzles')
          .select('*')
          .order('rating', { ascending: true });

        if (puzzlesError) throw puzzlesError;
        
        // Parse JSONB fields
        const parsed = (puzzlesData || []).map(p => ({
          ...p,
          setup_moves: typeof p.setup_moves === 'string' ? JSON.parse(p.setup_moves) : p.setup_moves,
          solution_moves: typeof p.solution_moves === 'string' ? JSON.parse(p.solution_moves) : p.solution_moves,
        })) as Puzzle[];
        
        setPuzzles(parsed);

        if (userId) {
          const { data: attemptsData } = await supabase
            .from('user_puzzle_attempts')
            .select('*')
            .eq('user_id', userId);

          if (attemptsData) {
            const attemptsMap: Record<string, PuzzleAttempt> = {};
            attemptsData.forEach(a => {
              attemptsMap[a.puzzle_id] = a as PuzzleAttempt;
            });
            setAttempts(attemptsMap);
          }
        }
      } catch (err) {
        console.error('Error fetching puzzles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzles();
  }, [userId]);

  const recordAttempt = async (puzzleId: string, completed: boolean, timeSeconds?: number) => {
    if (!userId) return;

    const existing = attempts[puzzleId];
    
    if (existing) {
      const { data, error } = await supabase
        .from('user_puzzle_attempts')
        .update({
          completed: completed || existing.completed,
          attempts: existing.attempts + 1,
          time_seconds: completed ? timeSeconds : existing.time_seconds,
          completed_at: completed ? new Date().toISOString() : existing.completed_at,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (!error && data) {
        setAttempts(prev => ({ ...prev, [puzzleId]: data as PuzzleAttempt }));
      }
    } else {
      const { data, error } = await supabase
        .from('user_puzzle_attempts')
        .insert({
          user_id: userId,
          puzzle_id: puzzleId,
          completed,
          attempts: 1,
          time_seconds: completed ? timeSeconds : null,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (!error && data) {
        setAttempts(prev => ({ ...prev, [puzzleId]: data as PuzzleAttempt }));
      }
    }
  };

  return { puzzles, attempts, loading, recordAttempt };
};
