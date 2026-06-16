import React from 'react';
import type { FrameTrapPreset } from '../../types';

export const PresetSelector: React.FC<{
  presets: FrameTrapPreset[];
  selectedId: string | null;
  onSelect: (preset: FrameTrapPreset | null) => void;
}> = ({ presets, selectedId, onSelect }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">预设场景</div>
      {/* Manual mode option */}
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
          selectedId === null
            ? 'bg-[var(--color-accent)] text-white shadow-md scale-105'
            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm hover:scale-105'
        }`}
      >
        手动设置
      </button>
      {/* Preset options */}
      {presets.map(preset => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset)}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 text-left ${
            selectedId === preset.id
              ? 'bg-[var(--color-accent)] text-white shadow-md scale-105'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm hover:scale-105'
          }`}
        >
          <div className="font-semibold text-[11px]">{preset.scenario}</div>
          <div className="text-[9px] opacity-70 mt-0.5">{preset.characterName}</div>
        </button>
      ))}
    </div>
  );
};
