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
  // The target frame window in "absolute" time from trigger
  targetStart: number;
  targetEnd: number;
}> = ({ triggerTime, hitTime, feedbackFrames, show, preset, settings, targetStart, targetEnd }) => {
  const totalFrames = preset ? preset.totalFrames : settings.totalFrames;

  if (preset) {
    // ── Complex version (preset) ──
    // Visual segments matching real GGST timeline:
    //   hitstop → early(联防) → cancel window start → TARGET WINDOW → too late
    const hitstopPct    = preset.hitstopFrames / totalFrames;
    const blockstunEndPct = (preset.hitstopFrames + preset.blockstunFrames) / totalFrames;
    const targetStartPct = targetStart / totalFrames;
    const targetEndPct   = targetEnd / totalFrames;

    const segments: VisualCueSegment[] = [
      {
        label: 'hitstop',
        startPct: 0,
        endPct: hitstopPct,
        color: 'var(--color-barBlockstun)',
      },
      {
        label: '联防 (blockstun)',
        startPct: hitstopPct,
        endPct: targetStartPct,
        color: 'var(--color-barEarly)',
      },
      {
        label: '目标窗口 (frame trap)',
        startPct: targetStartPct,
        endPct: targetEndPct,
        color: 'var(--color-barSuccess)',
      },
      {
        label: '过晚',
        startPct: targetEndPct,
        endPct: 1,
        color: 'var(--color-barLate)',
      },
    ];

    const labels: VisualCueLabel[] = [
      { position: 0, label: '0f (hit)' },
      { position: hitstopPct, label: `${preset.hitstopFrames}f` },
      { position: blockstunEndPct, label: `${preset.hitstopFrames + preset.blockstunFrames}f` },
      { position: targetStartPct, label: `${targetStart}f (start)` },
      { position: targetEndPct, label: `${targetEnd}f (end)` },
    ];

    const legendItems = [
      { color: 'var(--color-barBlockstun)', label: 'hitstop' },
      { color: 'var(--color-barEarly)', label: '联防区' },
      { color: 'var(--color-barSuccess)', label: '目标窗口' },
      { color: 'var(--color-barLate)', label: '过晚' },
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
          showLegend
          legendItems={legendItems}
        />
      </div>
    );
  }

  // ── Simple version (manual) ──
  const simpleTargetStartPct = settings.delayMin / totalFrames;
  const simpleTargetEndPct   = settings.delayMax / totalFrames;

  const segments: VisualCueSegment[] = [
    { label: 'early', startPct: 0, endPct: simpleTargetStartPct, color: 'var(--color-barEarly)' },
    { label: 'target', startPct: simpleTargetStartPct, endPct: simpleTargetEndPct, color: 'var(--color-barSuccess)' },
    { label: 'late', startPct: simpleTargetEndPct, endPct: 1, color: 'var(--color-barLate)' },
  ];

  const labels: VisualCueLabel[] = [
    { position: 0, label: '0f' },
    { position: simpleTargetStartPct, label: `${settings.delayMin}f` },
    { position: simpleTargetEndPct, label: `${settings.delayMax}f` },
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
