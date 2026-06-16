import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Gamepad2, RotateCcw } from 'lucide-react';
import type { FrameTrapPreset, FrameTrapSettings, FeedbackState, TriggerMode } from '../../types';
import { useGamepad } from '../../hooks/useGamepad';
import { useStats } from '../../hooks/useStats';
import { InputHistorySidebar } from '../../components/ui/InputHistorySidebar';
import { FeedbackDisplay } from '../../components/ui/FeedbackDisplay';
import { StatCard } from '../../components/ui/StatCard';
import { KeyBindButton, formatGamepadButton } from '../../components/ui/KeyBindButton';
import { PresetSelector } from './PresetSelector';
import { ManualSettings } from './ManualSettings';
import { FrameTrapVisualCue } from './FrameTrapVisualCue';
import { frameTrapPresets } from '../../data/frame-trap-presets';

type FtKeyBinds = Record<string, string>;

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

export const FrameTrapTrainer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // --- Device state ---
  const [inputDevice, setInputDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // --- Keybinds ---
  const [keyBinds, setKeyBinds] = useState<FtKeyBinds>({
    attack1Key: 'KeyJ',
    attack2Key: 'KeyK',
    upKey: 'KeyW',
    downKey: 'KeyS',
    leftKey: 'KeyA',
    rightKey: 'KeyD',
  });
  const [gamepadBinds, setGamepadBinds] = useState<Record<string, number>>({
    attack1Button: 2,
    attack2Button: 1,
    upButton: 12,
    downButton: 13,
    leftButton: 14,
    rightButton: 15,
  });
  const [listeningKey, setListeningKey] = useState<string | null>(null);

  // --- Preset / Manual mode ---
  const [selectedPreset, setSelectedPreset] = useState<FrameTrapPreset | null>(null);
  const [manualSettings, setManualSettings] = useState<FrameTrapSettings>({
    delayMin: 2,
    delayMax: 5,
    totalFrames: 30,
    triggerMode: 'dual',
  });

  // --- Training state ---
  const { stats, updateStats, resetStats } = useStats();
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '准备', frames: 0 });
  const [showVisualCue, setShowVisualCue] = useState(true);
  const [attack1Time, setAttack1Time] = useState<number | null>(null);
  const [attack2Time, setAttack2Time] = useState<number | null>(null);
  const [atk1Active, setAtk1Active] = useState(false);
  const [atk2Active, setAtk2Active] = useState(false);

  const atk1TimeRef = useRef<number | null>(null);
  const atk1TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousGamepadState = useRef<boolean[]>([]);
  const pressCountRef = useRef(0);

  const currentDelayMin = selectedPreset ? selectedPreset.delayWindowMin : manualSettings.delayMin;
  const currentDelayMax = selectedPreset ? selectedPreset.delayWindowMax : manualSettings.delayMax;
  const currentTotalFrames = selectedPreset ? selectedPreset.totalFrames : manualSettings.totalFrames;
  const currentTriggerMode: TriggerMode = selectedPreset ? 'dual' : manualSettings.triggerMode;

  // Gamepad connection
  useEffect(() => {
    const handleConnect = () => setIsGamepadConnected(true);
    const handleDisconnect = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      setIsGamepadConnected(Array.from(gamepads).some(gp => gp && gp.connected));
    };
    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(gamepads).some(gp => gp && gp.connected)) setIsGamepadConnected(true);
    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  const handleAttack1Press = useCallback(() => {
    atk1TimeRef.current = performance.now();
    setAttack1Time(atk1TimeRef.current);
    setAttack2Time(null);
    setAtk1Active(true);
    setTimeout(() => setAtk1Active(false), 100);
    pressCountRef.current = 1;

    if (atk1TimeoutRef.current) clearTimeout(atk1TimeoutRef.current);
    atk1TimeoutRef.current = setTimeout(() => {
      atk1TimeRef.current = null;
      pressCountRef.current = 0;
    }, 1000);
  }, []);

  const handleAttack2Press = useCallback(() => {
    const now = performance.now();
    setAttack2Time(now);
    setAtk2Active(true);
    setTimeout(() => setAtk2Active(false), 100);

    if (!atk1TimeRef.current) {
      const triggerLabel = currentTriggerMode === 'single' ? '按两次相同键' : '先按 Attack1';
      setFeedback({ status: 'late', message: `✖ 未触发 (${triggerLabel})`, frames: 0 });
      updateStats('late', 0);
      pressCountRef.current = 0;
      return;
    }

    const diffMs = now - atk1TimeRef.current;
    const diffFrames = Math.round(diffMs / (1000 / 60));
    atk1TimeRef.current = null;
    pressCountRef.current = 0;
    if (atk1TimeoutRef.current) clearTimeout(atk1TimeoutRef.current);

    const delayMin = currentDelayMin;
    const delayMax = currentDelayMax;

    if (diffFrames > currentTotalFrames) {
      setFeedback({ status: 'late', message: '✖ 过晚', frames: diffFrames });
      updateStats('late', diffFrames);
      return;
    }

    let status: 'success' | 'early' | 'late' | 'motion_fail' | 'idle';
    let message: string;

    if (diffFrames < delayMin) { status = 'early'; message = '✖ 过早'; }
    else if (diffFrames <= delayMax) { status = 'success'; message = '✔ 放帧成功'; }
    else { status = 'late'; message = '✖ 过晚'; }

    setFeedback({ status, message, frames: diffFrames });
    updateStats(status, diffFrames);
  }, [updateStats, currentDelayMin, currentDelayMax, currentTotalFrames, currentTriggerMode]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (listeningKey) {
        e.preventDefault();
        setKeyBinds(prev => ({ ...prev, [listeningKey]: e.code }));
        setListeningKey(null);
        setInputDevice('keyboard');
        return;
      }

      if (e.code === keyBinds.attack1Key) {
        e.preventDefault();
        setInputDevice('keyboard');
        if (currentTriggerMode === 'single') {
          if (pressCountRef.current === 0) handleAttack1Press();
          else handleAttack2Press();
        } else {
          handleAttack1Press();
        }
      } else if (e.code === keyBinds.attack2Key) {
        e.preventDefault();
        setInputDevice('keyboard');
        if (currentTriggerMode === 'single') {
          if (pressCountRef.current === 0) handleAttack1Press();
          else handleAttack2Press();
        } else {
          handleAttack2Press();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyBinds, listeningKey, handleAttack1Press, handleAttack2Press, currentTriggerMode]);

  // Gamepad listener
  useGamepad((buttons, axes) => {
    if (listeningKey) {
      const pressedIndex = buttons.findIndex(b => b.pressed);
      if (pressedIndex !== -1 && !previousGamepadState.current[pressedIndex]) {
        if (listeningKey.startsWith('attack1') || listeningKey.startsWith('attack2') ||
            listeningKey.startsWith('up') || listeningKey.startsWith('down') ||
            listeningKey.startsWith('left') || listeningKey.startsWith('right')) {
          setGamepadBinds(prev => ({ ...prev, [listeningKey]: pressedIndex }));
        } else {
          setKeyBinds(prev => ({ ...prev, [listeningKey]: pressedIndex.toString() }));
        }
        setListeningKey(null);
        setInputDevice('gamepad');
        previousGamepadState.current[pressedIndex] = true;
      }
      buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
      return;
    }

    const atk1 = buttons[gamepadBinds.attack1Button]?.pressed;
    const atk2 = buttons[gamepadBinds.attack2Button]?.pressed;

    if (atk1 || atk2) setInputDevice('gamepad');

    if (atk1 && currentTriggerMode === 'single') {
      if (pressCountRef.current === 0) handleAttack1Press();
      else handleAttack2Press();
    } else if (atk1 && currentTriggerMode === 'dual') {
      handleAttack1Press();
    } else if (atk2 && currentTriggerMode === 'dual') {
      handleAttack2Press();
    }

    buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
  });

  // Auto-reset feedback
  useEffect(() => {
    if (feedback.status !== 'idle') {
      const timer = setTimeout(() => {
        setFeedback({ status: 'idle', message: '准备', subMessage: undefined, frames: 0 });
        setAttack1Time(null);
        setAttack2Time(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const avgTime = stats.reactionTimes.length > 0
    ? stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length : 0;
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  const getCardBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-[var(--color-successBg)] border-[var(--color-success)]/20';
      case 'early': return 'bg-[var(--color-earlyBg)] border-[var(--color-early)]/20';
      case 'late': return 'bg-[var(--color-lateBg)] border-[var(--color-late)]/20';
      case 'motion_fail': return 'bg-[var(--color-failureBg)] border-[var(--color-failure)]/20';
      default: return 'bg-white border-transparent';
    }
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center justify-center p-6 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-30 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm"
      >
        ← 返回
      </button>

      <InputHistorySidebar entries={[]} />

      <div className="mb-4 text-center z-10 relative">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>放帧压制</h1>
      </div>

      {/* Right Sidebar */}
      <div className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 w-36 sm:w-44 max-h-[75vh] overflow-y-auto">
        {/* Preset selector */}
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
          <PresetSelector
            presets={frameTrapPresets}
            selectedId={selectedPreset?.id ?? null}
            onSelect={(p) => {
              setSelectedPreset(p);
              resetStats();
            }}
          />
        </div>

        {/* Manual settings (only when no preset selected) */}
        {!selectedPreset && (
          <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
            <ManualSettings settings={manualSettings} onChange={setManualSettings} />
          </div>
        )}

        {/* Preset info */}
        {selectedPreset && (
          <div className="bg-[var(--color-accentLight)] backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-[var(--color-accent)]/20">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-center mb-2" style={{ color: 'var(--color-accent)' }}>
              {selectedPreset.characterName}
            </div>
            <div className="text-[9px] text-gray-500 leading-relaxed text-center">
              {selectedPreset.description}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2 text-[9px] text-gray-500">
              <div>⌂ P1: {selectedPreset.move1.onBlock >= 0 ? '+' : ''}{selectedPreset.move1.onBlock}</div>
              <div>↗ P2: {selectedPreset.move2.startup}f</div>
              <div>🎯 窗口: {selectedPreset.delayWindowMin}-{selectedPreset.delayWindowMax}f</div>
              <div>📊 硬直: {selectedPreset.blockstunFrames}f</div>
            </div>
          </div>
        )}

        {/* Display settings */}
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-1">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-1">显示</div>
          <button
            onClick={() => setShowVisualCue(!showVisualCue)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
              showVisualCue ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
            }`}
          >
            视觉提示: {showVisualCue ? '开' : '关'}
          </button>
        </div>
      </div>

      {/* Trigger mode indicator */}
      <div className="mb-4 flex flex-wrap justify-center gap-2 z-10 relative">
        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-gray-200 text-gray-500">
          {selectedPreset ? '双键模式 (预设)' : currentTriggerMode === 'single' ? '单键模式 (同键两次)' : '双键模式 (Attack1→Attack2)'}
        </span>
        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-gray-200 text-gray-500">
          窗口: {currentDelayMin}-{currentDelayMax}f / 总 {currentTotalFrames}f
        </span>
      </div>

      {/* Main training card */}
      <motion.div
        layout
        className={`rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 w-full max-w-md flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden transition-colors duration-500 border ${getCardBg(feedback.status)}`}
      >
        {/* Device indicator */}
        <div className="absolute top-6 left-6 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm w-fit">
            {inputDevice === 'keyboard' ? <Keyboard size={14} /> : <Gamepad2 size={14} />}
            <span>{inputDevice === 'keyboard' ? '键盘' : '手柄'}</span>
          </div>
          <div className={`mt-2 flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors w-fit ${
            isGamepadConnected ? 'bg-[var(--color-accentLight)] text-[var(--color-accent)]' : 'bg-gray-100/50 text-gray-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isGamepadConnected ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`} />
            {isGamepadConnected ? '手柄已连接' : '请按手柄'}
          </div>
        </div>

        {/* Feedback area */}
        <div className="flex flex-col items-center justify-center h-full w-full mt-8 z-10">
          <FeedbackDisplay feedback={feedback} />
          <FrameTrapVisualCue
            triggerTime={attack1Time}
            hitTime={attack2Time}
            feedbackFrames={feedback.frames}
            show={showVisualCue}
            preset={selectedPreset}
            settings={manualSettings}
          />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-2xl z-10 relative">
        <StatCard label="成功率" value={`${successRate}%`} />
        <StatCard label="平均延迟" value={`${avgTime > 0 ? avgTime.toFixed(1) : '--'} f`} />
        <StatCard label="Combo" value={stats.currentStreak} />
        <StatCard label="Max Combo" value={stats.maxStreak} />
      </div>

      {/* Keybind bar */}
      <div className="mt-10 flex flex-col items-center gap-6 text-sm text-gray-500 w-full max-w-3xl z-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <KeyBindButton
            label="Attack1"
            current={inputDevice === 'gamepad' ? formatGamepadButton(gamepadBinds.attack1Button) : formatKey(keyBinds.attack1Key)}
            listening={listeningKey}
            bindId="attack1Key"
            onClick={() => setListeningKey('attack1Key')}
            active={atk1Active}
          />
          <KeyBindButton
            label="Attack2"
            current={inputDevice === 'gamepad' ? formatGamepadButton(gamepadBinds.attack2Button) : formatKey(keyBinds.attack2Key)}
            listening={listeningKey}
            bindId="attack2Key"
            onClick={() => setListeningKey('attack2Key')}
            active={atk2Active}
          />
          <KeyBindButton
            label={currentTriggerMode === 'single' ? 'Trigger' : 'ATK1(GP)'}
            current={formatGamepadButton(gamepadBinds.attack1Button)}
            listening={listeningKey}
            bindId="attack1Button"
            onClick={() => setListeningKey('attack1Button')}
            active={atk1Active}
          />
          <KeyBindButton
            label="ATK2(GP)"
            current={formatGamepadButton(gamepadBinds.attack2Button)}
            listening={listeningKey}
            bindId="attack2Button"
            onClick={() => setListeningKey('attack2Button')}
            active={atk2Active}
          />
        </div>

        <button
          onClick={resetStats}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium"
        >
          <RotateCcw size={14} /> 重置数据
        </button>
      </div>
    </div>
  );
};
