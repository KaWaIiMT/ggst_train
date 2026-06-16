import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { FeedbackState } from '../../types';

export const FeedbackDisplay: React.FC<{ feedback: FeedbackState }> = ({ feedback }) => {
  const isIdle = feedback.status === 'idle';

  const getTextColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-[var(--color-success)]';
      case 'early': return 'text-[var(--color-early)]';
      case 'motion_fail': return 'text-[var(--color-failure)]';
      case 'late': return 'text-[var(--color-late)]';
      default: return 'text-gray-400';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isIdle ? (
        <motion.div
          key={feedback.frames + feedback.status}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
          className="flex flex-col items-center z-10 bg-white/60 px-8 py-6 rounded-3xl backdrop-blur-md shadow-sm"
        >
          <div className={`text-3xl sm:text-4xl font-semibold tracking-tight mb-1 text-center ${getTextColor(feedback.status)}`}>
            {feedback.message}
          </div>
          {feedback.subMessage && (
            <div className={`text-lg font-medium mb-3 text-center ${
              feedback.subMessage.includes('✔') ? 'text-[var(--color-success)]' : 'text-[var(--color-failure)]'
            }`}>
              {feedback.subMessage}
            </div>
          )}
          {feedback.frames > 0 && (
            <div className="text-lg font-medium text-gray-500 font-mono bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm">
              {feedback.frames} f
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-gray-400 text-xl font-medium tracking-wide"
        >
          准备
        </motion.div>
      )}
    </AnimatePresence>
  );
};
