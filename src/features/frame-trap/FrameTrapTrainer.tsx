import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Gamepad2, RotateCcw } from 'lucide-react';
import type { FrameTrapPreset, FrameTrapSettings, FeedbackState, TriggerMode, GgstButton } from '../../types';
import { useGamepad } from '../../hooks/useGamepad';
import { useStats } from '../../hooks/useStats';
import { InputHistorySidebar } from '../../components/ui/InputHistorySidebar';
import { FeedbackDisplay } from '../../components/ui/FeedbackDisplay';
import { StatCard } from '../../components/ui/StatCard';
import { KeyBindButton, formatGamepadButton } from '../../components/ui/KeyBindButton';
import { PresetSelector } from './PresetSelector';
import { ManualSettings } from './ManualSettings';
import { FrameTrapVisualCue } from './FrameTrapVisualCue';
import { frameTrapPresets, DEFAULT_GGST_BINDS, GGST_BUTTONS } from '../../data/frame-trap-presets';

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

type GgstBinds = Record<GgstButton, { key: string; gamepad: number }>;

export const FrameTrapTrainer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // --- Device ---
  const [inputDevice, setInputDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // --- GGST button binds ---
  const [ggstBinds, setGgstBinds] = useState<GgstBinds>({ ...DEFAULT_GGST_BINDS });
  const [listeningButton, setListeningButton] = useState<GgstButton | null>(null);

  // --- Mode ---
  const [selectedPreset, setSelectedPreset] = useState<FrameTrapPreset | null>(
    () => frameTrapPresets[0]
  );
  const [manualSettings, setManualSettings] = useState<FrameTrapSettings>({
    delayMin: 2, delayMax: 5, totalFrames: 30, triggerMode: 'dual',
  });

  // --- Training state ---
  const { stats, updateStats, resetStats } = useStats();
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '准备', frames: 0 });
  const [showVisualCue, setShowVisualCue] = useState(true);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);
  const [hitTime, setHitTime] = useState<number | null>(null);
  const [button1Active, setButton1Active] = useState(false);
  const [button2Active, setButton2Active] = useState(false);

  const triggerTimeRef = useRef<number | null>(null);
  const triggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousGamepadState = useRef<boolean[]>([]);
  const pressCountRef = useRef(0);

  // Derived from preset or manual
  const currentDelayMin = selectedPreset ? selectedPreset.delayWindowMin : manualSettings.delayMin;
  const currentDelayMax = selectedPreset ? selectedPreset.delayWindowMax : manualSettings.delayMax;
  const currentTotalFrames = selectedPreset ? selectedPreset.totalFrames : manualSettings.totalFrames;
  const currentTriggerMode: TriggerMode = selectedPreset ? selectedPreset.triggerMode : manualSettings.triggerMode;

  // Which buttons are in play
  const activeButtons: GgstButton[] = selectedPreset
    ? selectedPreset.buttons
    : ['P', 'K']; // manual default: P then K

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

  // Used to debounce key repeats for GGST buttons
  const keysPressed = useRef<Set<string>>(new Set());

  // --- Trigger logic ---
  const startTimer = useCallback(() => {
    // Already started; ignore duplicate presses
    if (pressCountRef.current !== 0) return;
    triggerTimeRef.current = performance.now();
    setTriggerTime(triggerTimeRef.current);
    setHitTime(null);
    pressCountRef.current = 1;
    setButton1Active(true);
    setTimeout(() => setButton1Active(false), 100);

    if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
    triggerTimeoutRef.current = setTimeout(() => {
      triggerTimeRef.current = null;
      pressCountRef.current = 0;
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    // Not started yet; ignore
    if (pressCountRef.current !== 1) return;
    const now = performance.now();
    setHitTime(now);
    setButton2Active(true);
    setTimeout(() => setButton2Active(false), 100);

    if (!triggerTimeRef.current) {
      const hint = currentTriggerMode === 'single'
        ? `先按 ${activeButtons[0]} 开始`
        : `先按 ${activeButtons[0]} 再按 ${activeButtons[1]}`;
      setFeedback({ status: 'late', message: `✖ ${hint}`, frames: 0 });
      updateStats('late', 0);
      pressCountRef.current = 0;
      return;
    }

    const diffMs = now - triggerTimeRef.current;
    const diffFrames = Math.round(diffMs / (1000 / 60));
    triggerTimeRef.current = null;
    pressCountRef.current = 0;
    if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);

    if (diffFrames > currentTotalFrames) {
      setFeedback({ status: 'late', message: '✖ 过晚', frames: diffFrames });
      updateStats('late', diffFrames);
      return;
    }

    let status: 'success' | 'early' | 'late' | 'motion_fail' | 'idle';
    let message: string;

    if (diffFrames < currentDelayMin) {
      status = 'early'; message = '✖ 过早';
    } else if (diffFrames <= currentDelayMax) {
      status = 'success'; message = '✔ 放帧成功';
    } else {
      status = 'late'; message = '✖ 过晚';
    }

    setFeedback({ status, message, frames: diffFrames });
    updateStats(status, diffFrames);
  }, [updateStats, currentDelayMin, currentDelayMax, currentTotalFrames, currentTriggerMode, activeButtons]);

  // --- Keyboard ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Capture rebind
      if (listeningButton) {
        e.preventDefault();
        setGgstBinds(prev => ({ ...prev, [listeningButton]: { ...prev[listeningButton], key: e.code } }));
        setListeningButton(null);
        setInputDevice('keyboard');
        return;
      }

      // Check which GGST button this key maps to
      const btn = GGST_BUTTONS.find(b => ggstBinds[b].key === e.code);
      if (!btn) return;

      // Prevent repeat triggers (holding the key)
      if (keysPressed.current.has(e.code)) return;
      keysPressed.current.add(e.code);

      e.preventDefault();
      setInputDevice('keyboard');

      if (currentTriggerMode === 'single') {
        if (btn === activeButtons[0]) {
          if (pressCountRef.current === 0) startTimer();
          else if (pressCountRef.current === 1) stopTimer();
        }
      } else {
        if (btn === activeButtons[0]) startTimer();
        else if (btn === activeButtons[1]) stopTimer();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ggstBinds, listeningButton, startTimer, stopTimer, currentTriggerMode, activeButtons]);

  // --- Gamepad ---
  useGamepad((buttons, axes) => {
    if (listeningButton) {
      const pressedIndex = buttons.findIndex(b => b.pressed);
      if (pressedIndex !== -1 && !previousGamepadState.current[pressedIndex]) {
        setGgstBinds(prev => ({ ...prev, [listeningButton]: { ...prev[listeningButton], gamepad: pressedIndex } }));
        setListeningButton(null);
        setInputDevice('gamepad');
        previousGamepadState.current[pressedIndex] = true;
      }
      buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
      return;
    }

    const btn = GGST_BUTTONS.find(b => buttons[ggstBinds[b].gamepad]?.pressed);
    if (btn) setInputDevice('gamepad');

    if (btn && currentTriggerMode === 'single') {
      if (btn === activeButtons[0]) {
        if (pressCountRef.current === 0) startTimer();
        else stopTimer();
      }
    } else if (btn && currentTriggerMode === 'dual') {
      if (btn === activeButtons[0]) startTimer();
      else if (btn === activeButtons[1]) stopTimer();
    }

    buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
  });

  // Auto-reset feedback
  useEffect(() => {
    if (feedback.status !== 'idle') {
      const timer = setTimeout(() => {
        setFeedback({ status: 'idle', message: '准备', subMessage: undefined, frames: 0 });
        setTriggerTime(null);
        setHitTime(null);
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
      default: return 'bg-white border-transparent';
    }
  };

  const buttonColors: Record<GgstButton, string> = {
    P: 'bg-red-500', K: 'bg-blue-500', S: 'bg-amber-500', H: 'bg-green-600', D: 'bg-purple-500',
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center justify-center p-6 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Back */}
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

      {/* Right sidebar */}
      <div className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 w-36 sm:w-44 max-h-[75vh] overflow-y-auto">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
          <PresetSelector
            presets={frameTrapPresets}
            selectedId={selectedPreset?.id ?? null}
            onSelect={(p) => { setSelectedPreset(p); resetStats(); pressCountRef.current = 0; }}
          />
        </div>

        {!selectedPreset && (
          <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
            <ManualSettings settings={manualSettings} onChange={setManualSettings} />
          </div>
        )}

        {selectedPreset && (
          <div className="bg-[var(--color-accentLight)] backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-[var(--color-accent)]/20">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-center mb-1" style={{ color: 'var(--color-accent)' }}>
              {selectedPreset.characterName}
            </div>
            <div className="text-[9px] text-gray-500 leading-relaxed text-center">
              {selectedPreset.scenario}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-[9px] text-gray-500">
              <span>被防 {selectedPreset.move1.onBlock >= 0 ? '+' : ''}{selectedPreset.move1.onBlock}</span>
              <span>发生 {selectedPreset.move2.startup}f</span>
              <span>窗口 {selectedPreset.delayWindowMin}-{selectedPreset.delayWindowMax}f</span>
              <span>硬直 {selectedPreset.blockstunFrames}f</span>
            </div>
          </div>
        )}

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

      {/* Mode info chips */}
      <div className="mb-4 flex flex-wrap justify-center gap-2 z-10 relative">
        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-gray-200 text-gray-500">
          {currentTriggerMode === 'single'
            ? `单键 (${activeButtons[0]}) — 按两次`
            : `双键 (${activeButtons[0]}→${activeButtons[1]})`
          }
        </span>
        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-gray-200 text-gray-500">
          目标: {currentDelayMin}-{currentDelayMax}f / {currentTotalFrames}f
        </span>
      </div>

      {/* Main card */}
      <motion.div
        layout
        className={`rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 w-full max-w-md flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden transition-colors duration-500 border ${getCardBg(feedback.status)}`}
      >
        {/* Device + gamepad indicators */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm w-fit">
            {inputDevice === 'keyboard' ? <Keyboard size={14} /> : <Gamepad2 size={14} />}
            <span>{inputDevice === 'keyboard' ? '键盘' : '手柄'}</span>
          </div>
          <div className={`flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors w-fit ${
            isGamepadConnected ? 'bg-[var(--color-accentLight)] text-[var(--color-accent)]' : 'bg-gray-100/50 text-gray-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isGamepadConnected ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`} />
            {isGamepadConnected ? '手柄已连接' : '请按手柄'}
          </div>
        </div>

        {/* Active button indicators */}
        <div className="absolute top-6 right-6 z-10 flex gap-1.5">
          {activeButtons.map((btn, i) => (
            <div
              key={btn}
              className={`w-8 h-8 rounded-lg ${buttonColors[btn]} text-white flex items-center justify-center text-sm font-bold shadow-md ${
                (i === 0 && button1Active) || (i === 1 && button2Active) ? 'scale-90 brightness-125' : ''
              } transition-all duration-100`}
            >
              {btn}
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="flex flex-col items-center justify-center h-full w-full mt-8 z-10">
          <FeedbackDisplay feedback={feedback} />
          <FrameTrapVisualCue
            triggerTime={triggerTime}
            hitTime={hitTime}
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

      {/* Keybind bar: P K S H D */}
      <div className="mt-10 flex flex-col items-center gap-6 text-sm text-gray-500 w-full max-w-3xl z-10 relative">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">按键绑定 (键盘 / 手柄)</span>
        </div>
        <div className="grid grid-cols-5 gap-3 w-full max-w-lg">
          {GGST_BUTTONS.map(btn => {
            const bind = ggstBinds[btn];
            const isActive = listeningButton === btn;
            const isPressedBtn = (btn === activeButtons[0] && button1Active) || (btn === activeButtons[1] && button2Active);
            return (
              <div key={btn} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-xl ${buttonColors[btn]} text-white flex items-center justify-center text-lg font-bold shadow-md ${isPressedBtn ? 'scale-90 brightness-125' : ''} transition-all duration-100`}>
                  {btn}
                </div>
                <button
                  onClick={() => setListeningButton(btn)}
                  className={`focus:outline-none w-full px-2 py-1 rounded-lg text-[9px] font-mono font-medium text-center cursor-pointer border transition-all duration-150 ${
                    isActive
                      ? 'bg-gray-100 border-gray-300 text-gray-700 scale-95'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {isActive ? '...' : inputDevice === 'gamepad' ? formatGamepadButton(bind.gamepad) : formatKey(bind.key)}
                </button>
              </div>
            );
          })}
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
