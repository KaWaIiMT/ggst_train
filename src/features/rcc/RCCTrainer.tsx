import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Gamepad2, RotateCcw } from 'lucide-react';
import type { FeedbackState, MotionType, GgstBind, GgstAction, FeedbackStatus } from '../../types';
import { GGST_BUTTON_COLORS, GGST_MACRO_COLORS } from '../../types';
import { useGamepad } from '../../hooks/useGamepad';
import { useStats } from '../../hooks/useStats';
import { validateMotion } from '../../hooks/useDirectionInput';
import { useInputHistory } from '../../hooks/useInputHistory';
import { StatCard } from '../../components/ui/StatCard';
import { KeyBindButton, formatGamepadButton } from '../../components/ui/KeyBindButton';
import { SettingSlider } from '../../components/ui/SettingSlider';
import { VisualCueBar } from '../../components/ui/VisualCueBar';
import { FeedbackDisplay } from '../../components/ui/FeedbackDisplay';
import { InputHistorySidebar } from '../../components/ui/InputHistorySidebar';
import { VirtualJoystick } from '../../components/ui/VirtualJoystick';
import { ALL_GGST_ACTIONS, DEFAULT_GGST_BINDS } from '../../data/themes';

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

export const RCCTrainer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [inputDevice, setInputDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [selectedMotion, setSelectedMotion] = useState<MotionType>('none');

  // ── GGST unified binds ──
  const [ggstBinds, setGgstBinds] = useState<Record<string, GgstBind>>({ ...DEFAULT_GGST_BINDS });
  const [listeningAction, setListeningAction] = useState<string | null>(null);

  const { stats, updateStats, resetStats } = useStats();
  const { addEntry, inputHistory } = useInputHistory();

  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '准备', frames: 0 });
  const [trainingGoal, setTrainingGoal] = useState<number | null>(null);
  const [showSetResult, setShowSetResult] = useState(false);
  const [showVisualCue, setShowVisualCue] = useState(true);
  const [rcTriggerTime, setRcTriggerTime] = useState<number | null>(null);
  const [rcHitTime, setRcHitTime] = useState<number | null>(null);
  const [minFrame, setMinFrame] = useState(10);
  const [maxFrame, setMaxFrame] = useState(16);
  const [totalFrames, setTotalFrames] = useState(36);

  const [rcActive, setRcActive] = useState(false);
  const [attackActive, setAttackActive] = useState(false);
  const [currentDirection, setCurrentDirection] = useState(5);
  const [showJoystick, setShowJoystick] = useState(true);

  const rcTimeRef = useRef<number | null>(null);
  const rcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousGamepadState = useRef<boolean[]>([]);
  const motionBufferRef = useRef<number[]>([]);

  const inputStateRef = useRef({
    up: false, down: false, left: false, right: false,
    direction: 5, rc: false, attack: false,
  });

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

  useEffect(() => {
    if (trainingGoal && stats.total >= trainingGoal) {
      setTimeout(() => setShowSetResult(true), 500);
    }
  }, [stats.total, trainingGoal]);

  const getDirection = (up: boolean, down: boolean, left: boolean, right: boolean): number => {
    if (up && right) return 9;
    if (up && left) return 7;
    if (down && right) return 3;
    if (down && left) return 1;
    if (up) return 8;
    if (down) return 2;
    if (right) return 6;
    if (left) return 4;
    return 5;
  };

  const handleRcPress = useCallback(() => {
    rcTimeRef.current = performance.now();
    setRcTriggerTime(rcTimeRef.current);
    setRcHitTime(null);
    motionBufferRef.current = [];
    setRcActive(true);
    setTimeout(() => setRcActive(false), 100);
    if (rcTimeoutRef.current) clearTimeout(rcTimeoutRef.current);
    rcTimeoutRef.current = setTimeout(() => { rcTimeRef.current = null; }, 600);
  }, []);

  const handleAttackPress = useCallback(() => {
    const now = performance.now();
    setRcHitTime(now);
    setAttackActive(true);
    setTimeout(() => setAttackActive(false), 100);

    if (!rcTimeRef.current) {
      setFeedback({ status: 'late', message: '✖ 未触发 RC', frames: 0 });
      updateStats('late', 0);
      return;
    }

    const diffMs = now - rcTimeRef.current;
    const diffFrames = Math.round(diffMs / (1000 / 60));
    rcTimeRef.current = null;
    if (rcTimeoutRef.current) clearTimeout(rcTimeoutRef.current);

    const isMotionValid = validateMotion(motionBufferRef.current, selectedMotion);

    if (diffFrames > totalFrames) {
      let subMessage: string | undefined;
      if (!isMotionValid) subMessage = '✖ 方向输入错误';
      else if (selectedMotion !== 'none') subMessage = '✔ 方向正确';
      setFeedback({ status: 'late', message: '✖ 过晚', subMessage, frames: diffFrames });
      updateStats('late', diffFrames);
      return;
    }

    let status: FeedbackStatus;
    let message: string;
    let subMessage: string | undefined;

    if (diffFrames < minFrame) { status = 'early'; message = '✖ 过早'; }
    else if (diffFrames <= maxFrame) { status = 'success'; message = '✔ 成功'; }
    else { status = 'late'; message = '✖ 过晚'; }

    if (!isMotionValid) {
      status = 'motion_fail';
      message = message.replace('✔', '✖');
      subMessage = '✖ 方向输入错误';
    } else if (selectedMotion !== 'none' && status !== 'success') {
      subMessage = '✔ 方向正确';
    }

    setFeedback({ status, message, subMessage, frames: diffFrames });
    updateStats(status, diffFrames);
  }, [updateStats, selectedMotion, minFrame, maxFrame, totalFrames]);

  // Keyboard listener
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

      // Arrow keys for directions
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        const updates: Record<string, boolean> = {};
        if (e.code === 'ArrowUp') updates.up = true;
        if (e.code === 'ArrowDown') updates.down = true;
        if (e.code === 'ArrowLeft') updates.left = true;
        if (e.code === 'ArrowRight') updates.right = true;
        Object.assign(inputStateRef.current, updates);
        const newDir = getDirection(
          inputStateRef.current.up, inputStateRef.current.down,
          inputStateRef.current.left, inputStateRef.current.right
        );
        if (newDir !== inputStateRef.current.direction) {
          inputStateRef.current.direction = newDir;
          setCurrentDirection(newDir);
          if (newDir !== 5) motionBufferRef.current.push(newDir);
        }
        const buttons: string[] = [];
        if (inputStateRef.current.rc) buttons.push('RC');
        if (inputStateRef.current.attack) buttons.push('ATK');
        addEntry(newDir, buttons);
        return;
      }

      // WASD as alt direction inputs
      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
        const updates: Record<string, boolean> = {};
        if (e.code === 'KeyW') updates.up = true;
        if (e.code === 'KeyS') updates.down = true;
        if (e.code === 'KeyA') updates.left = true;
        if (e.code === 'KeyD') updates.right = true;
        Object.assign(inputStateRef.current, updates);
        const newDir = getDirection(
          inputStateRef.current.up, inputStateRef.current.down,
          inputStateRef.current.left, inputStateRef.current.right
        );
        if (newDir !== inputStateRef.current.direction) {
          inputStateRef.current.direction = newDir;
          setCurrentDirection(newDir);
          if (newDir !== 5) motionBufferRef.current.push(newDir);
        }
        const buttons: string[] = [];
        if (inputStateRef.current.rc) buttons.push('RC');
        if (inputStateRef.current.attack) buttons.push('ATK');
        addEntry(newDir, buttons);
        return;
      }

      // GGST action buttons
      const action = ALL_GGST_ACTIONS.find(a => ggstBinds[a]?.key === e.code);
      if (!action) return;
      e.preventDefault();
      setInputDevice('keyboard');

      if (action === 'RC') {
        inputStateRef.current.rc = true;
        handleRcPress();
      } else if (action === 'Dash') {
        // Dash macro pressed
      } else if (['P', 'K', 'S', 'H', 'D'].includes(action)) {
        inputStateRef.current.attack = true;
        handleAttackPress();
      }
      addEntry(currentDirection, [action]);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputStateRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputStateRef.current.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputStateRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputStateRef.current.right = false;
      const action = ALL_GGST_ACTIONS.find(a => ggstBinds[a]?.key === e.code);
      if (action === 'RC') inputStateRef.current.rc = false;
      if (action && ['P', 'K', 'S', 'H', 'D'].includes(action)) inputStateRef.current.attack = false;

      const newDir = getDirection(
        inputStateRef.current.up, inputStateRef.current.down,
        inputStateRef.current.left, inputStateRef.current.right
      );
      if (newDir !== inputStateRef.current.direction) {
        inputStateRef.current.direction = newDir;
        setCurrentDirection(newDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ggstBinds, listeningAction, handleRcPress, handleAttackPress, addEntry]);

  // Gamepad listener
  useGamepad((buttons, axes) => {
    if (listeningAction) {
      const pressedIndex = buttons.findIndex(b => b.pressed);
      if (pressedIndex !== -1 && !previousGamepadState.current[pressedIndex]) {
        setGgstBinds(prev => ({ ...prev, [listeningAction]: { ...prev[listeningAction], gamepad: pressedIndex } }));
        setListeningAction(null);
        setInputDevice('gamepad');
        previousGamepadState.current[pressedIndex] = true;
      }
      buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
      return;
    }

    // Direction from dpad or left stick
    const up = axes[1] < -0.5;
    const down = axes[1] > 0.5;
    const left = axes[0] < -0.5;
    const right = axes[0] > 0.5;

    const rc = buttons[ggstBinds['RC']?.gamepad]?.pressed;
    const atkBtn = GGST_BUTTONS.find(b => buttons[ggstBinds[b]?.gamepad]?.pressed);
    const attack = !!atkBtn;

    if (rc || attack || up || down || left || right) {
      if (inputDevice !== 'gamepad') setInputDevice('gamepad');
    }

    Object.assign(inputStateRef.current, { up, down, left, right });
    const newDir = getDirection(up, down, left, right);
    if (newDir !== inputStateRef.current.direction) {
      inputStateRef.current.direction = newDir;
      setCurrentDirection(newDir);
      if (newDir !== 5) motionBufferRef.current.push(newDir);
    }
    inputStateRef.current.rc = !!rc;
    inputStateRef.current.attack = !!attack;

    if (rc && !inputStateRef.current.rc) handleRcPress();
    if (attack && !inputStateRef.current.attack) handleAttackPress();

    const btnList: string[] = [];
    if (rc) btnList.push('RC');
    if (atkBtn) btnList.push(atkBtn);
    addEntry(newDir, btnList);

    buttons.forEach((b, i) => { previousGamepadState.current[i] = b.pressed; });
  });

  // Auto-reset feedback
  useEffect(() => {
    if (feedback.status !== 'idle') {
      const timer = setTimeout(() => {
        setFeedback({ status: 'idle', message: '准备', subMessage: undefined, frames: 0 });
        setRcTriggerTime(null);
        setRcHitTime(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const avgTime = stats.reactionTimes.length > 0
    ? stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length : 0;
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  const rccSegments = [
    { label: 'early', startPct: 0, endPct: minFrame / totalFrames, color: 'var(--color-barEarly)' },
    { label: 'success', startPct: minFrame / totalFrames, endPct: maxFrame / totalFrames, color: 'var(--color-barSuccess)' },
    { label: 'late', startPct: maxFrame / totalFrames, endPct: 1, color: 'var(--color-barLate)' },
  ];
  const rccLabels = [
    { position: 0, label: '0f' },
    { position: minFrame / totalFrames, label: `${minFrame}f` },
    { position: maxFrame / totalFrames, label: `${maxFrame}f` },
    { position: 1, label: `${totalFrames}f` },
  ];

  const GGST_BUTTONS: ('P' | 'K' | 'S' | 'H' | 'D')[] = ['P', 'K', 'S', 'H', 'D'];
  const actionColors: Record<string, string> = { ...GGST_BUTTON_COLORS, ...GGST_MACRO_COLORS };

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center justify-center p-6 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <button onClick={onBack}
        className="fixed top-4 left-4 z-30 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm"
      >← 返回</button>

      <InputHistorySidebar entries={inputHistory} />

      <div className="mb-6 text-center z-10 relative">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>RCC练习</h1>
      </div>

      {/* Right Sidebar */}
      <div className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 w-32 sm:w-40">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">训练目标</div>
          {([null, 50, 100, 200] as (number | null)[]).map(goal => (
            <button key={goal || 'free'}
              onClick={() => { setTrainingGoal(goal); resetStats(); setShowSetResult(false); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                trainingGoal === goal
                  ? 'bg-[var(--color-accent)] text-white shadow-md scale-105'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm hover:scale-105'
              }`}
            >{goal ? `${goal} 次` : '自由练习'}</button>
          ))}
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">区间设置</div>
          <SettingSlider label="最大帧数" value={totalFrames} min={20} max={100}
            onChange={(v) => { setTotalFrames(v); if (maxFrame > v) setMaxFrame(v); if (minFrame > v) setMinFrame(v); }} />
          <SettingSlider label="起始帧" value={minFrame} min={1} max={maxFrame} onChange={(v) => setMinFrame(v)} />
          <SettingSlider label="结束帧" value={maxFrame} min={minFrame} max={totalFrames} onChange={(v) => setMaxFrame(v)} />
        </div>
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">显示设置</div>
          <button onClick={() => setShowJoystick(!showJoystick)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              showJoystick ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
            }`}
          >{showJoystick ? '摇杆: 开' : '摇杆: 关'}</button>
        </div>
      </div>

      {/* Motion selector */}
      <div className="mb-6 flex flex-wrap justify-center gap-2 z-10 relative">
        {(['none', '236', '214'] as MotionType[]).map(m => (
          <button key={m} onClick={() => setSelectedMotion(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMotion === m ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}
          >{m === 'none' ? '无方向' : m}</button>
        ))}
      </div>

      {/* Main card */}
      <motion.div layout
        className="rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 w-full max-w-md flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden transition-colors duration-500 border bg-white"
      >
        <div className="absolute top-6 right-6 z-10">
          <button onClick={() => setShowVisualCue(!showVisualCue)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${
              showVisualCue ? 'bg-[var(--color-accentLight)] text-[var(--color-accent)]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >{showVisualCue ? '视觉提示: 开' : '视觉提示: 关'}</button>
        </div>
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
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
        <div className="flex flex-col items-center justify-center h-full w-full mt-8 z-10">
          <FeedbackDisplay feedback={feedback} />
          <VisualCueBar
            triggerTime={rcTriggerTime} hitTime={rcHitTime} feedbackFrames={feedback.frames}
            show={showVisualCue} segments={rccSegments} labels={rccLabels} totalFrames={totalFrames}
          />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-2xl z-10 relative">
        <StatCard label="成功率" value={`${successRate}%`} />
        <StatCard label="平均时间" value={`${avgTime > 0 ? avgTime.toFixed(1) : '--'} f`} />
        <StatCard label="Combo" value={stats.currentStreak} />
        <StatCard label="Max Combo" value={stats.maxStreak} />
      </div>

      {trainingGoal && (
        <div className="w-full max-w-2xl mt-4 z-10 relative">
          <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>训练进度</span><span>{stats.total} / {trainingGoal}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-[var(--color-accent)]" initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (stats.total / trainingGoal) * 100)}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {/* Keybind bar: P K S H D Dash RC */}
      <div className="mt-10 flex flex-col items-center gap-6 text-sm text-gray-500 w-full max-w-3xl z-10 relative">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">按键绑定</div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-3 w-full max-w-2xl">
          {ALL_GGST_ACTIONS.map(action => {
            const bind = ggstBinds[action];
            const isListening = listeningAction === action;
            const color = actionColors[action] || '#6B7280';
            const isActive = (action === 'RC' && rcActive) || (['P','K','S','H','D'].includes(action) && attackActive);
            return (
              <div key={action} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold shadow-md ${isActive ? 'scale-90 brightness-125' : ''} transition-all duration-100`}
                  style={{ backgroundColor: color }}>
                  {action}
                </div>
                <button onClick={() => setListeningAction(action)}
                  className={`focus:outline-none w-full px-2 py-1 rounded-lg text-[9px] font-mono font-medium text-center cursor-pointer border transition-all duration-150 ${
                    isListening ? 'bg-gray-100 border-gray-300 text-gray-700 scale-95' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {isListening ? '...' : inputDevice === 'gamepad' ? formatGamepadButton(bind.gamepad) : formatKey(bind.key)}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={resetStats}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium">
          <RotateCcw size={14} /> 重置数据</button>
      </div>

      <AnimatePresence>
        <VirtualJoystick direction={currentDirection} show={showJoystick} onClose={() => setShowJoystick(false)} />
      </AnimatePresence>

      {/* Set result modal */}
      <AnimatePresence>
        {showSetResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">训练完成!</h2>
              <p className="text-gray-500 mb-6">RCC练习 ({trainingGoal} 组)</p>
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">成功率</div>
                  <div className="text-2xl font-bold text-[var(--color-accent)]">{successRate}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">平均时间</div>
                  <div className="text-2xl font-bold text-gray-800">{avgTime.toFixed(1)} f</div>
                </div>
              </div>
              <button onClick={() => { setShowSetResult(false); resetStats(); }}
                className="w-full py-3 bg-[var(--color-accent)] text-white rounded-full font-medium hover:opacity-90 transition-colors">
                继续练习</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
