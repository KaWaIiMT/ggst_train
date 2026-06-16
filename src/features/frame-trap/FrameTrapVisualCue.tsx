import React from 'react';
import { VisualCueBar } from '../../components/ui/VisualCueBar';
import type { VisualCueSegment, VisualCueLabel } from '../../components/ui/VisualCueBar';
import type { FrameTrapPreset, FrameTrapSettings } from '../../types';

export const FrameTrapVisualCue: React.FC<{
  triggerTime: number | null;
  hitTime: number | null;
  feedbackFrames: number;
  show: boolean;
  preset: FrameTrapPreset | null;
  settings: FrameTrapSettings;
}> = ({ triggerTime, hitTime, feedbackFrames, show, preset, settings }) => {
  const totalFrames = preset ? preset.totalFrames : settings.totalFrames;
  const delayMin = preset ? preset.delayWindowMin : settings.delayMin;
  const delayMax = preset ? preset.delayWindowMax : settings.delayMax;

  if (preset) {
    // Complex version: blockstun | delay gap | target window | recovery
    const blockstunEndPct = preset.blockstunFrames / totalFrames;
    const targetStartPct = (preset.blockstunFrames + delayMin) / totalFrames;
    const targetEndPct = (preset.blockstunFrames + delayMax) / totalFrames;

    const segments: VisualCueSegment[] = [
      { label: 'blockstun', startPct: 0, endPct: blockstunEndPct, color: 'rgba(100,116,139,0.4)' },
      { label: 'delay gap', startPct: blockstunEndPct, endPct: targetStartPct, color: 'var(--color-barEarly)' },
      { label: 'target', startPct: targetStartPct, endPct: targetEndPct, color: 'var(--color-barSuccess)' },
      { label: 'miss', startPct: targetEndPct, endPct: 1, color: 'var(--color-barLate)' },
    ];

    const labels: VisualCueLabel[] = [
      { position: 0, label: '0f' },
      { position: blockstunEndPct, label: `${preset.blockstunFrames}f` },
      { position: targetStartPct, label: `${preset.blockstunFrames + delayMin}f` },
      { position: targetEndPct, label: `${preset.blockstunFrames + delayMax}f` },
      { position: 1, label: `${totalFrames}f` },
    ];

    return (
      <div className="w-full">
        <VisualCueBar
          triggerTime={triggerTime}
          hitTime={hitTime}
          feedbackFrames={feedbackFrames}
          show={show}
          segments={segments}
          labels={labels}
          totalFrames={totalFrames}
        />
        <div className="flex justify-center gap-3 mt-1 text-[9px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(100,116,139,0.4)' }} />
            防御硬直
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--color-barEarly)' }} />
            延迟
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--color-barSuccess)' }} />
            目标窗口
          </span>
        </div>
      </div>
    );
  }

  // Simple version (manual mode): just target window
  const targetStartPct = delayMin / totalFrames;
  const targetEndPct = delayMax / totalFrames;

  const segments: VisualCueSegment[] = [
    { label: 'early', startPct: 0, endPct: targetStartPct, color: 'var(--color-barEarly)' },
    { label: 'target', startPct: targetStartPct, endPct: targetEndPct, color: 'var(--color-barSuccess)' },
    { label: 'late', startPct: targetEndPct, endPct: 1, color: 'var(--color-barLate)' },
  ];

  const labels: VisualCueLabel[] = [
    { position: 0, label: '0f' },
    { position: targetStartPct, label: `${delayMin}f` },
    { position: targetEndPct, label: `${delayMax}f` },
    { position: 1, label: `${totalFrames}f` },
  ];

  return (
    <VisualCueBar
      triggerTime={triggerTime}
      hitTime={hitTime}
      feedbackFrames={feedbackFrames}
      show={show}
      segments={segments}
      labels={labels}
      totalFrames={totalFrames}
    />
  );
};
