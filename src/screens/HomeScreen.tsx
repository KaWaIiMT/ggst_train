import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../components/ui/ThemeProvider';
import { themes } from '../data/themes';
import type { TrainingMode } from '../types';

export const ThemeSwitcher: React.FC = () => {
  const { themeId, setThemeId } = useTheme();
  return (
    <div className="flex gap-1.5">
      {Object.values(themes).map(t => (
        <button
          key={t.id}
          onClick={() => setThemeId(t.id)}
          className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
            themeId === t.id ? 'border-gray-400 scale-110 shadow-md' : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: t.colors.accent }}
          title={t.name}
        />
      ))}
    </div>
  );
};

const ModeCard: React.FC<{
  mode: TrainingMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  onStart: (mode: TrainingMode) => void;
}> = ({ mode, title, description, icon, color, onStart }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="relative overflow-hidden rounded-3xl p-8 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/50 backdrop-blur-sm bg-white/70 flex flex-col items-center text-center gap-4 group"
    onClick={() => onStart(mode)}
  >
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform"
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">{title}</h2>
      <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">{description}</p>
    </div>
    <div
      className="px-6 py-2 rounded-full text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0"
      style={{ backgroundColor: color }}
    >
      开始训练
    </div>
  </motion.div>
);

export const HomeScreen: React.FC<{ onSelectMode: (mode: TrainingMode) => void }> = ({ onSelectMode }) => {
  const { theme } = useTheme();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 font-sans selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
          GGST Trainer
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
          GUILTY GEAR STRIVE 训练工具
        </p>
        <ThemeSwitcher />
      </motion.div>

      {/* Mode Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg"
      >
        <ModeCard
          mode="rcc"
          title="RCC 练习"
          description="练习快速罗马取消 (RCC) 时机。支持方向输入校验，键盘/手柄双输入。"
          icon="⚡"
          color={theme.colors.accent}
          onStart={onSelectMode}
        />
        <ModeCard
          mode="frame-trap"
          title="放帧压制"
          description="练习延迟取消链的放帧手感。支持预设场景与手动模式，Dustloop 帧数据。"
          icon="🎯"
          color={theme.colors.success}
          onStart={onSelectMode}
        />
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[10px]"
        style={{ color: 'var(--color-textSecondary)' }}
      >
        选择训练模式开始
      </motion.p>
    </div>
  );
};
