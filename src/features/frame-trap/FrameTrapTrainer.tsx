import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Keyboard, Gamepad2, RotateCcw } from 'lucide-react';
import type { FeedbackState, GgstBind, FeedbackStatus } from '../../types';
import { GGST_BUTTON_COLORS, GGST_MACRO_COLORS } from '../../types';
import { useGamepad } from '../../hooks/useGamepad';
import { useStats } from '../../hooks/useStats';
import { InputHistorySidebar } from '../../components/ui/InputHistorySidebar';
import { FeedbackDisplay } from '../../components/ui/FeedbackDisplay';
import { StatCard } from '../../components/ui/StatCard';
import { KeyBindButton, formatGamepadButton } from '../../components/ui/KeyBindButton';
import { SettingSlider } from '../../components/ui/SettingSlider';
import { VisualCueBar } from '../../components/ui/VisualCueBar';
import { ALL_GGST_ACTIONS, DEFAULT_GGST_BINDS } from '../../data/themes';

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

/**
 * FrameTrapTrainer — two-button frame-timing drill.
 *
 * Press button1 → timer starts (slider animates)
 * Press button2 → timer stops → frame diff computed → success / early / late
 *
 * For single-key mode (button1 === button2):
 *   first press  = start
 *   second press = stop + judge
 */
export const FrameTrapTrainer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // ── Device ──
  const [inputDevice, setInputDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // ── Binds ──
  const [ggstBinds, setGgstBinds] = useState<Record<string, GgstBind>>({ ...DEFAULT_GGST_BINDS });
  const [listeningAction, setListeningAction] = useState<string | null>(null);

  // ── Training params ──
  // From Leo 5P derivation: gap = delay - 5, target gap 1-5f → delay 6-10f
  const { stats, updateStats, resetStats } = useStats();
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '准备', frames: 0 });
  const [showVisualCue, setShowVisualCue] = useState(true);
  const [t1Time, setT1Time] = useState<number | null>(null);
  const [t2Time, setT2Time] = useState<number | null>(null);
  const [minFrame, setMinFrame] = useState(21);
  const [maxFrame, setMaxFrame] = useState(25);
  const [totalFrames, setTotalFrames] = useState(60);
  const [btn1Active, setBtn1Active] = useState(false);
  const [btn2Active, setBtn2Active] = useState(false);

  // ── Refs (mirror RCC pattern: rcTimeRef + rcTimeoutRef) ──
  const t1Ref = useRef<number | null>(null);
  const t1TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer state: null = idle, timestamp = running
  const timerRunningRef = useRef(false);
  // Prevent restart within 150ms of last action (defeats keyboard bounce)
  const lastActionTimeRef = useRef(0);

  // Keyboard: track which keys are physically held to prevent hold-spam
  const heldKeysRef = useRef<Set<string>>(new Set());

  // Gamepad edge detection
  const prevGamepadBtnsRef = useRef<boolean[]>([]);

  // ── Which buttons? ──
  const button1 = 'P';
  const button2 = 'P';
  const isSingleKey = button1 === button2;

  // ── Gamepad connection ──
  useEffect(() => {
    const hc = () => setIsGamepadConnected(true);
    const hd = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      setIsGamepadConnected(Array.from(gps).some(g => g && g.connected));
    };
    window.addEventListener('gamepadconnected', hc);
    window.addEventListener('gamepaddisconnected', hd);
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(gps).some(g => g && g.connected)) setIsGamepadConnected(true);
    return () => { window.removeEventListener('gamepadconnected', hc); window.removeEventListener('gamepaddisconnected', hd); };
  }, []);

  // ── Triggers (pattern: EXACTLY like RCC handleRcPress / handleAttackPress) ──
  const MIN_INTERVAL_MS = 40; // reject events closer than ~2.5f (hardware bounce)

  const handleBtn1Press = useCallback(() => {
    const now = performance.now();
    if (timerRunningRef.current) return;
    if (now - lastActionTimeRef.current < MIN_INTERVAL_MS) return;
    lastActionTimeRef.current = now;
    t1Ref.current = now;
    setT1Time(now);
    setT2Time(null);
    timerRunningRef.current = true;
    setBtn1Active(true);
    setTimeout(() => setBtn1Active(false), 100);
    if (t1TimeoutRef.current) clearTimeout(t1TimeoutRef.current);
  }, []);

  const handleBtn2Press = useCallback(() => {
    if (!timerRunningRef.current) return;
    const now = performance.now();
    if (now - lastActionTimeRef.current < MIN_INTERVAL_MS) return;
    if (t1Ref.current && (now - t1Ref.current) < MIN_INTERVAL_MS) return;
    lastActionTimeRef.current = now;

    timerRunningRef.current = false;
    setT2Time(now);
    setBtn2Active(true);
    setTimeout(() => setBtn2Active(false), 100);

    if (t1TimeoutRef.current) clearTimeout(t1TimeoutRef.current);

    if (!t1Ref.current) {
      setFeedback({ status: 'late', message: `✖ 先按 ${button1} 开始`, frames: 0 });
      updateStats('late', 0);
      return;
    }

    const diffFrames = Math.round((now - t1Ref.current) / (1000 / 60));
    t1Ref.current = null;

    if (diffFrames > totalFrames) {
      setFeedback({ status: 'late', message: '✖ 过晚', frames: diffFrames });
      updateStats('late', diffFrames);
      return;
    }

    let status: FeedbackStatus;
    let message: string;
    if (diffFrames < minFrame)      { status = 'early';   message = '✖ 过早 (联防)'; }
    else if (diffFrames <= maxFrame) { status = 'success'; message = '✔ 放帧成功'; }
    else                            { status = 'late';    message = '✖ 过晚'; }

    setFeedback({ status, message, frames: diffFrames });
    updateStats(status, diffFrames);
  }, [updateStats, minFrame, maxFrame, totalFrames]);

  // ── Keyboard (pattern: EXACTLY like RCC keyboard handler) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (listeningAction) {
        e.preventDefault();
        setGgstBinds(prev => ({ ...prev, [listeningAction]: { ...prev[listeningAction], key: e.code } }));
        setListeningAction(null);
        setInputDevice('keyboard');
        return;
      }

      const action = ALL_GGST_ACTIONS.find(a => ggstBinds[a]?.key === e.code);
      if (!action) return;

      e.preventDefault();
      setInputDevice('keyboard');

      // Prevent held-key spam (same as RCC — hold produces only one fire)
      if (heldKeysRef.current.has(e.code)) return;
      heldKeysRef.current.add(e.code);

      // Compare as strings to avoid TS narrowing issues
      const actionStr: string = action;
      if (actionStr === button1) {
        if (isSingleKey) {
          if (!timerRunningRef.current) handleBtn1Press();
          else handleBtn2Press();
        } else {
          handleBtn1Press();
        }
      } else if (actionStr === button2) {
        handleBtn2Press();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ggstBinds, listeningAction, handleBtn1Press, handleBtn2Press, isSingleKey]);

  // ── Gamepad (pattern: EXACTLY like RCC — with edge detection) ──
  useGamepad((buttons) => {
    if (listeningAction) {
      const idx = buttons.findIndex(b => b.pressed);
      if (idx !== -1 && !prevGamepadBtnsRef.current[idx]) {
        setGgstBinds(prev => ({ ...prev, [listeningAction]: { ...prev[listeningAction], gamepad: idx } }));
        setListeningAction(null);
        setInputDevice('gamepad');
      }
      buttons.forEach((b, i) => { prevGamepadBtnsRef.current[i] = b.pressed; });
      return;
    }

    // Find which GGST action is pressed
    const b1Idx = ggstBinds[button1]?.gamepad;
    const b2Idx = ggstBinds[button2]?.gamepad;
    const b1Pressed = b1Idx != null ? buttons[b1Idx]?.pressed : false;
    const b2Pressed = b2Idx != null ? buttons[b2Idx]?.pressed : false;

    const b1WasPressed = prevGamepadBtnsRef.current[b1Idx ?? -1] ?? false;
    const b2WasPressed = prevGamepadBtnsRef.current[b2Idx ?? -1] ?? false;

    if (b1Pressed || b2Pressed) setInputDevice('gamepad');

    // Edge-detect (rising edge only — same as RCC)
    if (b1Pressed && !b1WasPressed) {
      if (isSingleKey) {
        if (!timerRunningRef.current) handleBtn1Press();
        else handleBtn2Press();
      } else {
        handleBtn1Press();
      }
    }
    if (b2Pressed && !b2WasPressed && !isSingleKey) {
      handleBtn2Press();
    }

    buttons.forEach((b, i) => { prevGamepadBtnsRef.current[i] = b.pressed; });
  });

  // ── Auto-reset feedback (EXACTLY like RCC) ──
  useEffect(() => {
    if (feedback.status !== 'idle') {
      const timer = setTimeout(() => {
        setFeedback({ status: 'idle', message: '准备', subMessage: undefined, frames: 0 });
        setT1Time(null);
        setT2Time(null);
        lastActionTimeRef.current = 0;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const avgTime = stats.reactionTimes.length > 0
    ? stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length : 0;
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  const segments = [
    { label: 'early', startPct: 0, endPct: minFrame / totalFrames, color: 'var(--color-barEarly)' },
    { label: 'success', startPct: minFrame / totalFrames, endPct: maxFrame / totalFrames, color: 'var(--color-barSuccess)' },
    { label: 'late', startPct: maxFrame / totalFrames, endPct: 1, color: 'var(--color-barLate)' },
  ];
  const labels = [
    { position: 0, label: '0f' },
    { position: minFrame / totalFrames, label: `${minFrame}f` },
    { position: maxFrame / totalFrames, label: `${maxFrame}f` },
    { position: 1, label: `${totalFrames}f` },
  ];

  const actionColors: Record<string, string> = { ...GGST_BUTTON_COLORS, ...GGST_MACRO_COLORS };

  const getCardBg = (s: string) => {
    switch (s) {
      case 'success': return 'bg-[var(--color-successBg)] border-[var(--color-success)]/20';
      case 'early': return 'bg-[var(--color-earlyBg)] border-[var(--color-early)]/20';
      case 'late': return 'bg-[var(--color-lateBg)] border-[var(--color-late)]/20';
      default: return 'bg-white border-transparent';
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center p-6 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <button onClick={onBack}
        className="fixed top-4 left-4 z-30 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm"
      >← 返回</button>

      <InputHistorySidebar entries={[]} />

      <div className="mb-6 text-center z-10 relative">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>放帧压制</h1>
        <p className="text-[11px] font-medium text-gray-400">
          按 {button1} 开始 → 按 {button2} 判定 · 目标 {minFrame}-{maxFrame}f
        </p>
      </div>

      {/* Right sidebar */}
      <div className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 w-32 sm:w-40">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">区间设置</div>
          <SettingSlider label="最大帧数" value={totalFrames} min={20} max={100}
            onChange={v => { setTotalFrames(v); if (maxFrame > v) setMaxFrame(v); if (minFrame > v) setMinFrame(v); }} />
          <SettingSlider label="起始帧" value={minFrame} min={1} max={maxFrame} onChange={setMinFrame} />
          <SettingSlider label="结束帧" value={maxFrame} min={minFrame} max={totalFrames} onChange={setMaxFrame} />
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">显示</div>
          <button onClick={() => setShowVisualCue(!showVisualCue)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${showVisualCue ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'}`}
          >视觉提示: {showVisualCue ? '开' : '关'}</button>
        </div>
      </div>

      {/* Main card */}
      <motion.div layout
        className={`rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 w-full max-w-md flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden transition-colors duration-500 border ${getCardBg(feedback.status)}`}
      >
        <div className="absolute top-6 right-6 z-10">
          <button onClick={() => setShowVisualCue(!showVisualCue)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${showVisualCue ? 'bg-[var(--color-accentLight)] text-[var(--color-accent)]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >视觉提示: {showVisualCue ? '开' : '关'}</button>
        </div>
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm w-fit">
            {inputDevice === 'keyboard' ? <Keyboard size={14} /> : <Gamepad2 size={14} />}
            <span>{inputDevice === 'keyboard' ? '键盘' : '手柄'}</span>
          </div>
          <div className={`flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors w-fit ${isGamepadConnected ? 'bg-[var(--color-accentLight)] text-[var(--color-accent)]' : 'bg-gray-100/50 text-gray-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isGamepadConnected ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`} />
            {isGamepadConnected ? '手柄已连接' : '请按手柄'}</div>
        </div>
        <div className="flex flex-col items-center justify-center h-full w-full mt-8 z-10">
          <FeedbackDisplay feedback={feedback} />
          <VisualCueBar triggerTime={t1Time} hitTime={t2Time} feedbackFrames={feedback.frames}
            show={showVisualCue} segments={segments} labels={labels} totalFrames={totalFrames} />
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
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">按键绑定</div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-3 w-full max-w-2xl">
          {ALL_GGST_ACTIONS.map(action => {
            const b = ggstBinds[action];
            const isListen = listeningAction === action;
            const color = actionColors[action] || '#6B7280';
            const isActive = (action === button1 && btn1Active) || (action === button2 && btn2Active);
            return (
              <div key={action} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold shadow-md ${isActive ? 'scale-90 brightness-125' : ''} transition-all duration-100`}
                  style={{ backgroundColor: color }}>
                  {action}
                </div>
                <button onClick={() => setListeningAction(action)}
                  className={`focus:outline-none w-full px-2 py-1 rounded-lg text-[9px] font-mono font-medium text-center cursor-pointer border transition-all duration-150 ${isListen ? 'bg-gray-100 border-gray-300 text-gray-700 scale-95' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {isListen ? '...' : inputDevice === 'gamepad' ? formatGamepadButton(b.gamepad) : formatKey(b.key)}</button>
              </div>
            );
          })}
        </div>
        <button onClick={resetStats}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium">
          <RotateCcw size={14} /> 重置数据</button>
      </div>
    </div>
  );
};
