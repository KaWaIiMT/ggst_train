import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { InputHistoryEntry } from '../../types';
import { DirectionIcon } from './DirectionIcon';
import { ButtonIcon } from './ButtonIcon';

const HistoryEntryRow: React.FC<{ entry: InputHistoryEntry; isLatest: boolean }> = ({ entry, isLatest }) => {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLatest && entry.endTimestamp) {
      if (frameRef.current) {
        const f = Math.min(99, Math.max(1, Math.round((entry.endTimestamp - entry.timestamp) / (1000 / 60))));
        frameRef.current.textContent = f.toString();
      }
      return;
    }

    let animationFrameId: number;
    const updateFrames = () => {
      const now = performance.now();
      const currentFrames = Math.max(1, Math.round((now - entry.timestamp) / (1000 / 60)));
      if (frameRef.current) {
        frameRef.current.textContent = Math.min(99, currentFrames).toString();
      }
      if (currentFrames < 99) {
        animationFrameId = requestAnimationFrame(updateFrames);
      }
    };
    updateFrames();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isLatest, entry.timestamp, entry.endTimestamp]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 py-1.5"
    >
      <div ref={frameRef} className="w-6 text-right text-xs font-mono text-gray-400 font-medium">1</div>
      <DirectionIcon dir={entry.direction} />
      <div className="flex gap-1">
        {entry.buttons.map(b => <ButtonIcon key={b} type={b} />)}
      </div>
    </motion.div>
  );
};

export const InputHistorySidebar: React.FC<{ entries: InputHistoryEntry[] }> = ({ entries }) => (
  <div
    className="fixed left-2 sm:left-8 top-1/2 -translate-y-1/2 w-24 sm:w-32 h-[60vh] flex flex-col justify-start overflow-hidden pointer-events-none z-10"
    style={{
      maskImage: 'linear-gradient(to bottom, black 10%, black 80%, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 10%, black 80%, transparent)',
    }}
  >
    <AnimatePresence initial={false}>
      {entries.map((entry, index) => (
        <HistoryEntryRow key={entry.id} entry={entry} isLatest={index === 0} />
      ))}
    </AnimatePresence>
  </div>
);
