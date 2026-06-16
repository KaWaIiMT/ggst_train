import React, { useState, useEffect } from 'react';

export interface VisualCueSegment {
  startPct: number;
  endPct: number;
  color: string;
  label: string;
}

export interface VisualCueLabel {
  position: number;
  label: string;
}

/**
 * Shared progress bar for all trainers.
 *
 * Renders segments as a flat row (flex), with grid lines and
 * a centered slider cursor on top.
 */
export const VisualCueBar: React.FC<{
  triggerTime: number | null;
  hitTime: number | null;
  feedbackFrames: number;
  show: boolean;
  segments: VisualCueSegment[];
  labels: VisualCueLabel[];
  totalFrames: number;
  showLegend?: boolean;
  legendItems?: { color: string; label: string }[];
}> = ({ triggerTime, hitTime, feedbackFrames, show, segments, labels, totalFrames, showLegend, legendItems }) => {
  const [progress, setProgress] = useState(0);
  const totalDurationMs = totalFrames * (1000 / 60);

  useEffect(() => {
    if (!triggerTime) {
      setProgress(0);
      return;
    }
    if (hitTime) {
      setProgress(Math.min((hitTime - triggerTime) / totalDurationMs, 1));
      return;
    }
    let frameId: number;
    const update = () => {
      const elapsed = performance.now() - triggerTime;
      setProgress(Math.min(elapsed / totalDurationMs, 1));
      if (elapsed < totalDurationMs) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [triggerTime, hitTime, totalDurationMs]);

  if (!show) return null;

  const displayProgress = triggerTime
    ? progress
    : feedbackFrames > 0
      ? Math.min(feedbackFrames / totalFrames, 1)
      : 0;
  const showSlider = triggerTime !== null || feedbackFrames > 0;

  return (
    <div className="flex flex-col items-center w-full mt-8 z-10">
      {/* The bar */}
      <div
        className="w-full max-w-[320px] h-4 rounded-full relative overflow-hidden border shadow-inner"
        style={{ backgroundColor: 'var(--color-barBg)', borderColor: 'var(--color-border)' }}
      >
        {/* Vertical grid lines every 5f */}
        {Array.from({ length: Math.floor(totalFrames / 5) + 1 }, (_, i) => {
          const pct = (i * 5) / totalFrames;
          return pct > 0 && pct < 1 ? (
            <div
              key={`grid-${i}`}
              className="absolute inset-y-0 w-px z-0 opacity-40"
              style={{ left: `${pct * 100}%`, backgroundColor: 'var(--color-barGrid)' }}
            />
          ) : null;
        })}

        {/* Segments — laid out as a flex row so positions are automatic */}
        <div className="absolute inset-0 flex flex-row">
          {segments
            .filter(s => s.endPct > s.startPct)
            .map((seg, i) => (
              <div
                key={i}
                className="h-full opacity-85"
                style={{
                  width: `${(seg.endPct - seg.startPct) * 100}%`,
                  backgroundColor: seg.color,
                }}
              />
            ))}
        </div>

        {/* Slider cursor */}
        {showSlider && (
          <div
            className="absolute inset-y-0 w-2.5 rounded-full shadow-lg z-10"
            style={{
              left: `calc(${displayProgress * 100}% - 5px)`,
              backgroundColor: 'var(--color-barSlider)',
            }}
          />
        )}
      </div>

      {/* Tick labels */}
      <div className="flex w-full max-w-[320px] text-[10px] text-gray-400 mt-2 font-medium relative h-5">
        {labels.map((l, i) => (
          <span
            key={i}
            className="absolute transform -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${l.position * 100}%` }}
          >
            {l.label}
          </span>
        ))}
      </div>

      {/* Legend */}
      {showLegend && legendItems && (
        <div className="flex justify-center flex-wrap gap-3 mt-2 text-[9px] text-gray-400">
          {legendItems.map(item => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
