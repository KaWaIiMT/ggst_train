import React, { useState, useEffect } from 'react';

export const SettingSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, unit = 'f', onChange }) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const val = parseInt(e.target.value);
    if (!isNaN(val)) onChange(val);
  };

  const handleBlur = () => {
    let val = parseInt(inputValue);
    if (isNaN(val)) val = min;
    if (val < min) val = min;
    if (val > max) val = max;
    setInputValue(val.toString());
    onChange(val);
  };

  return (
    <div className="flex flex-col gap-1 mb-3 last:mb-0">
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
        <span>{label}</span>
        <div className="flex items-center bg-gray-100 rounded px-1.5 py-0.5">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-6 text-right bg-transparent focus:outline-none text-[var(--color-accent)] font-bold"
          />
          <span className="ml-0.5 text-gray-400">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
      />
    </div>
  );
};
