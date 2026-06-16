import React, { useState, useEffect, useRef } from 'react';

export interface VisualCueSegment {
  label: string;
  startPct: number;
  endPct: number;
  color: string;
}

export interface VisualCueLabel {
  position: number;
  label: string;
}

export const VisualCueBar: React.FC<{
  triggerTime: number | null;
  hitTime: number | null;
  feedbackFrames: number;
  show: boolean;
  segments: VisualCueSegment[];
  labels: VisualCueLabel[];
  totalFrames: number;
}> = ({ triggerTime, hitTime, feedbackFrames, show, segments, labels, totalFrames }) => {
  const [progress, setProgress] = useState(0);
  const totalDurationMs = totalFrames * (1000 / 60);

  useEffect(() => {
    if (!triggerTime) {
      setProgress(0);
      return;
    }
    if (hitTime) {
      const elapsed = hitTime - triggerTime;
      setProgress(Math.min(elapsed / totalDurationMs, 1));
      return;
    }
    let frameId: number;
    const update = () => {
      const now = performance.now();
      const elapsed = now - triggerTime;
      const currentProgress = Math.min(elapsed / totalDurationMs, 1);
      setProgress(currentProgress);
      if (currentProgress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [triggerTime, hitTime, totalDurationMs]);

  if (!show) return null;

  const displayProgress = triggerTime ? progress : (feedbackFrames > 0 ? Math.min(feedbackFrames / totalFrames, 1) : 0);
  const showSlider = triggerTime !== null || feedbackFrames > 0;

  return (
    <div className="flex flex-col items-center w-full mt-8 z-10">
      <div className="w-full max-w-[280px] h-3 bg-gray-200 rounded-full relative overflow-hidden shadow-inner">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{
              left: `${seg.startPct * 100}%`,
              width: `${(seg.endPct - seg.startPct) * 100}%`,
              backgroundColor: seg.color,
              opacity: 0.6,
            }}
          />
        ))}

        {showSlider && (
          <div
            className="absolute top-0 h-full w-2 bg-gray-800 rounded-full shadow-md z-10"
            style={{ left: `calc(${displayProgress * 100}% - 4px)` }}
          />
        )}
      </div>
      <div className="flex w-full max-w-[280px] text-[10px] text-gray-400 mt-2 font-medium relative h-4">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`absolute transform -translate-x-1/2 ${i === 0 ? '' : ''}`}
            style={{ left: `${l.position * 100}%` }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
};
