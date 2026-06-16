import { useState, useCallback, useRef } from 'react';
import type { Stats, FeedbackStatus } from '../types';

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    currentStreak: 0,
    maxStreak: 0,
    reactionTimes: [],
  });

  const updateStats = useCallback((status: FeedbackStatus, frames: number) => {
    setStats(prev => {
      const isSuccess = status === 'success';
      const newStreak = isSuccess ? prev.currentStreak + 1 : 0;
      const newReactionTimes = isSuccess ? [...prev.reactionTimes, frames].slice(-50) : prev.reactionTimes;
      return {
        total: prev.total + 1,
        success: prev.success + (isSuccess ? 1 : 0),
        currentStreak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        reactionTimes: newReactionTimes,
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats({ total: 0, success: 0, currentStreak: 0, maxStreak: 0, reactionTimes: [] });
  }, []);

  return { stats, updateStats, resetStats };
}
