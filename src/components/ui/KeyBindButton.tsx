import React from 'react';
import { motion } from 'motion/react';

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

export const formatGamepadButton = (index: number) => `Btn ${index}`;

export const KeyBindButton: React.FC<{
  label: string;
  current: string;
  listening: string | null;
  bindId: string;
  onClick: () => void;
  active?: boolean;
}> = ({ label, current, listening, bindId, onClick, active = false }) => (
  <div className="flex flex-col items-center gap-2">
    <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-400">{label}</span>
    <button onClick={onClick} className="focus:outline-none group w-full">
      <motion.kbd
        animate={{
          scale: active || listening === bindId ? 0.92 : 1,
          boxShadow: active || listening === bindId
            ? "0 1px 2px rgba(0,0,0,0.1) inset"
            : "0 4px 12px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05)",
          backgroundColor: active || listening === bindId ? "#F3F4F6" : "#FFFFFF",
          color: active || listening === bindId ? "#374151" : "#111827",
        }}
        transition={{ duration: 0.1 }}
        className="px-3 py-2 rounded-xl border border-gray-200/80 font-mono text-xs font-medium w-full text-center inline-block cursor-pointer truncate"
      >
        {listening === bindId ? '...' : formatKey(current)}
      </motion.kbd>
    </button>
  </div>
);
