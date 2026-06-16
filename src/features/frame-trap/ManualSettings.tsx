import React from 'react';
import { SettingSlider } from '../../components/ui/SettingSlider';
import type { FrameTrapSettings, TriggerMode } from '../../types';

export const ManualSettings: React.FC<{
  settings: FrameTrapSettings;
  onChange: (s: FrameTrapSettings) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-1">手动设置</div>

      <SettingSlider
        label="延迟起始帧"
        value={settings.delayMin}
        min={1}
        max={settings.delayMax}
        onChange={(v) => onChange({ ...settings, delayMin: v })}
      />
      <SettingSlider
        label="延迟结束帧"
        value={settings.delayMax}
        min={settings.delayMin}
        max={30}
        onChange={(v) => onChange({ ...settings, delayMax: v })}
      />
      <SettingSlider
        label="总帧数"
        value={settings.totalFrames}
        min={20}
        max={100}
        onChange={(v) => {
          const newSettings = { ...settings, totalFrames: v };
          if (settings.delayMax > v) newSettings.delayMax = v;
          if (settings.delayMin > v) newSettings.delayMin = v;
          onChange(newSettings);
        }}
      />

      {/* Trigger mode */}
      <div className="mt-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">触发模式</div>
        <div className="flex gap-1">
          {(['single', 'dual'] as TriggerMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onChange({ ...settings, triggerMode: mode })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                settings.triggerMode === mode
                  ? 'bg-[var(--color-accent)] text-white shadow-md'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {mode === 'single' ? '单键' : '双键'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
