import React from 'react';
import { VisualCueBar } from '../../components/ui/VisualCueBar';
import type { FrameTrapPreset, FrameTrapSettings } from '../../types';

export const FrameTrapVisualCue: React.FC<{
  triggerTime: number | null;
  hitTime: number | null;
  feedbackFrames: number;
  show: boolean;
  preset: FrameTrapPreset | null;
  settings: FrameTrapSettings;
  targetStart: number;
  targetEnd: number;
}> = ({ triggerTime, hitTime, feedbackFrames, show, preset, settings, targetStart, targetEnd }) => {
  const totalFrames = preset ? preset.totalFrames : settings.totalFrames;

  if (preset) {
    const hitstopPct = preset.hitstopFrames / totalFrames;
    const targetStartPct = targetStart / totalFrames;
    const targetEndPct = targetEnd / totalFrames;

    const segments = [
      { label: 'hitstop', startPct: 0, endPct: hitstopPct, color: 'var(--color-barBlockstun)' },
      { label: 'blockstun', startPct: hitstopPct, endPct: targetStartPct, color: 'var(--color-barEarly)' },
      { label: 'frame trap', startPct: targetStartPct, endPct: targetEndPct, color: 'var(--color-barSuccess)' },
      { label: 'miss', startPct: targetEndPct, endPct: 1, color: 'var(--color-barLate)' },
    ];

    const labels = [
      { position: 0, label: '0f' },
      { position: targetStartPct, label: `🎯 ${targetStart}f` },
      { position: targetEndPct, label: `${targetEnd}f` },
    ];

    const legendItems = [
      { color: 'var(--color-barBlockstun)', label: 'hitstop' },
      { color: 'var(--color-barEarly)', label: '联防' },
      { color: 'var(--color-barSuccess)', label: '目标窗口' },
      { color: 'var(--color-barLate)', label: '过晚' },
    ];

    return (
      <div className="w-full">
        <VisualCueBar
          triggerTime={triggerTime} hitTime={hitTime} feedbackFrames={feedbackFrames}
          show={show} segments={segments} labels={labels} totalFrames={totalFrames}
          showLegend legendItems={legendItems}
        />
      </div>
    );
  }

  // Manual
  const sPct = settings.delayMin / totalFrames;
  const ePct = settings.delayMax / totalFrames;

  const segments = [
    { label: 'early', startPct: 0, endPct: sPct, color: 'var(--color-barEarly)' },
    { label: 'target', startPct: sPct, endPct: ePct, color: 'var(--color-barSuccess)' },
    { label: 'late', startPct: ePct, endPct: 1, color: 'var(--color-barLate)' },
  ];

  const labels = [
    { position: 0, label: '0f' },
    { position: sPct, label: `${settings.delayMin}f` },
    { position: ePct, label: `${settings.delayMax}f` },
    { position: 1, label: `${totalFrames}f` },
  ];

  return (
    <VisualCueBar
      triggerTime={triggerTime} hitTime={hitTime} feedbackFrames={feedbackFrames}
      show={show} segments={segments} labels={labels} totalFrames={totalFrames}
    />
  );
};
