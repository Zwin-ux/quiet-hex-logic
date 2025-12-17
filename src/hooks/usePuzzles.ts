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
  is_daily: boolean;
  daily_date: string | null;
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

export type StreakInfo = {
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  lastPuzzleDate: string | null;
};

export const usePuzzles = (userId: string | undefined) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [attempts, setAttempts] = useState<Record<string, PuzzleAttempt>>({});
  const [streakInfo, setStreakInfo] = useState<StreakInfo>({
    currentStreak: 0,
    bestStreak: 0,
    completedToday: false,
    lastPuzzleDate: null,
  });
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        // Fetch all puzzles
        const { data: puzzlesData, error: puzzlesError } = await supabase
          .from('puzzles')
          .select('*')
          .order('rating', { ascending: true });

        if (puzzlesError) throw puzzlesError;
        
        const parsed = (puzzlesData || []).map(p => ({
          ...p,
          setup_moves: typeof p.setup_moves === 'string' ? JSON.parse(p.setup_moves) : p.setup_moves,
          solution_moves: typeof p.solution_moves === 'string' ? JSON.parse(p.solution_moves) : p.solution_moves,
        })) as Puzzle[];
        
        setPuzzles(parsed);

        // Find daily puzzle (or pick one deterministically)
        const dailyCandidate = parsed.find(p => p.is_daily && p.daily_date === today);
        if (dailyCandidate) {
          setDailyPuzzle(dailyCandidate);
        } else if (parsed.length > 0) {
          // Pick daily based on date hash
          const dayNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
          const dailyIndex = dayNum % parsed.length;
          setDailyPuzzle(parsed[dailyIndex]);
        }

        if (userId) {
          // Fetch user attempts
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

          // Fetch streak info from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('puzzle_streak, puzzle_streak_best, last_daily_puzzle_date')
            .eq('id', userId)
            .single();

          if (profile) {
            const lastDate = profile.last_daily_puzzle_date;
            const completedToday = lastDate === today;
            
            setStreakInfo({
              currentStreak: profile.puzzle_streak || 0,
              bestStreak: profile.puzzle_streak_best || 0,
              completedToday,
              lastPuzzleDate: lastDate,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching puzzles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzles();
  }, [userId, today]);

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

  const completeDailyPuzzle = async () => {
    if (!userId || !dailyPuzzle) return;

    const lastDate = streakInfo.lastPuzzleDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Calculate new streak
    let newStreak = 1;
    if (lastDate === yesterday) {
      newStreak = streakInfo.currentStreak + 1;
    } else if (lastDate === today) {
      // Already completed today
      return;
    }

    const newBest = Math.max(newStreak, streakInfo.bestStreak);

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        puzzle_streak: newStreak,
        puzzle_streak_best: newBest,
        last_daily_puzzle_date: today,
      })
      .eq('id', userId);

    if (!error) {
      setStreakInfo({
        currentStreak: newStreak,
        bestStreak: newBest,
        completedToday: true,
        lastPuzzleDate: today,
      });
    }
  };

  return { 
    puzzles, 
    dailyPuzzle,
    attempts, 
    streakInfo,
    loading, 
    recordAttempt,
    completeDailyPuzzle,
  };
};
