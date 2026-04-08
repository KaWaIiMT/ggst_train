import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import { Keyboard, Gamepad2, RotateCcw, X } from 'lucide-react';

type FeedbackStatus = 'success' | 'early' | 'late' | 'motion_fail' | 'idle';
type MotionType = 'none' | '236' | '214';

interface Stats {
  total: number;
  success: number;
  currentStreak: number;
  maxStreak: number;
  reactionTimes: number[];
}

interface InputHistoryEntry {
  id: number;
  direction: number;
  buttons: string[];
  timestamp: number;
  endTimestamp: number | null;
}

interface KeyBinds {
  rcKey: string;
  attackKey: string;
  upKey: string;
  downKey: string;
  leftKey: string;
  rightKey: string;
  rcButton: number;
  attackButton: number;
  upButton: number;
  downButton: number;
  leftButton: number;
  rightButton: number;
}

function useGamepad(callback: (buttons: readonly GamepadButton[], axes: readonly number[]) => void) {
  const requestRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const poll = useCallback(() => {
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          callbackRef.current(gp.buttons, gp.axes);
          break;
        }
      }
    }
    requestRef.current = requestAnimationFrame(poll);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(requestRef.current);
  }, [poll]);
}

const formatKey = (code: string) => {
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  return code;
};

const formatGamepadButton = (index: number) => `Btn ${index}`;

const getDirection = (up: boolean, down: boolean, left: boolean, right: boolean) => {
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

const validateMotion = (buffer: number[], motion: MotionType) => {
  if (motion === 'none') return true;
  
  const check = (seqs: number[][]) => seqs.some(seq => {
    let i = 0;
    for (const dir of buffer) {
      if (dir === seq[i]) i++;
      if (i === seq.length) return true;
    }
    return false;
  });

  switch (motion) {
    case '236': return check([[2, 6], [2, 3, 6]]);
    case '214': return check([[2, 4], [2, 1, 4]]);
    default: return true;
  }
};

const VisualCueBar = ({ triggerTime, hitTime, feedbackFrames, show, minFrame, maxFrame, totalFrames }: { triggerTime: number | null, hitTime: number | null, feedbackFrames: number, show: boolean, minFrame: number, maxFrame: number, totalFrames: number }) => {
  const [progress, setProgress] = useState(0);
  const totalDurationMs = totalFrames * (1000 / 60);

  useEffect(() => {
    if (!triggerTime) {
      setProgress(0);
      return;
    }
    if (hitTime) {
      const elapsed = hitTime - triggerTime;
      setProgress(Math.min(elapsed / totalDurationMs, 1));
      return;
    }

    let frameId: number;
    const update = () => {
      const now = performance.now();
      const elapsed = now - triggerTime;
      const currentProgress = Math.min(elapsed / totalDurationMs, 1);
      setProgress(currentProgress);
      if (currentProgress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [triggerTime, hitTime, totalDurationMs]);

  if (!show) return null;

  const displayProgress = triggerTime ? progress : (feedbackFrames > 0 ? Math.min(feedbackFrames / totalFrames, 1) : 0);
  const showSlider = triggerTime !== null || feedbackFrames > 0;

  return (
    <div className="flex flex-col items-center w-full mt-8 z-10">
      <div className="w-full max-w-[280px] h-3 bg-gray-200 rounded-full relative overflow-hidden shadow-inner">
        <div className="absolute top-0 left-0 h-full bg-red-400/40" style={{ width: `${(minFrame/totalFrames)*100}%` }} />
        <div className="absolute top-0 h-full bg-green-500/60" style={{ left: `${(minFrame/totalFrames)*100}%`, width: `${((maxFrame-minFrame)/totalFrames)*100}%` }} />
        <div className="absolute top-0 h-full bg-red-400/40" style={{ left: `${(maxFrame/totalFrames)*100}%`, width: `${((totalFrames-maxFrame)/totalFrames)*100}%` }} />
        
        {showSlider && (
          <div 
            className="absolute top-0 h-full w-2 bg-gray-800 rounded-full shadow-md"
            style={{ left: `calc(${displayProgress * 100}% - 4px)` }}
          />
        )}
      </div>
      <div className="flex w-full max-w-[280px] text-[10px] text-gray-400 mt-2 font-medium relative h-4">
        <span className="absolute left-0">0f</span>
        <span className="absolute transform -translate-x-1/2" style={{ left: `${(minFrame/totalFrames)*100}%` }}>{minFrame}f</span>
        <span className="absolute transform -translate-x-1/2" style={{ left: `${(maxFrame/totalFrames)*100}%` }}>{maxFrame}f</span>
        <span className="absolute right-0">{totalFrames}f</span>
      </div>
    </div>
  );
};

const SettingSlider = ({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
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
            className="w-6 text-right bg-transparent focus:outline-none text-[#1D8385] font-bold" 
          />
          <span className="ml-0.5 text-gray-400">f</span>
        </div>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1D8385]" 
      />
    </div>
  );
};

const VirtualJoystick = ({ direction, show, onClose }: { direction: number, show: boolean, onClose: () => void }) => {
  const R_cardinal = 54; // Extend 2, 4, 6, 8 further out
  const R_diagonal = 46; // Diagonals further out, but slightly less than cardinals
  const positions: Record<number, { x: number, y: number }> = {
    5: { x: 0, y: 0 },
    8: { x: 0, y: -R_cardinal },
    2: { x: 0, y: R_cardinal },
    4: { x: -R_cardinal, y: 0 },
    6: { x: R_cardinal, y: 0 },
    7: { x: -R_diagonal, y: -R_diagonal },
    9: { x: R_diagonal, y: -R_diagonal },
    1: { x: -R_diagonal, y: R_diagonal },
    3: { x: R_diagonal, y: R_diagonal },
  };

  const pos = positions[direction] || positions[5];

  const stickX = useSpring(pos.x, { stiffness: 1000, damping: 30, mass: 0.5 });
  const stickY = useSpring(pos.y, { stiffness: 1000, damping: 30, mass: 0.5 });

  useEffect(() => {
    stickX.set(pos.x);
    stickY.set(pos.y);
  }, [pos.x, pos.y, stickX, stickY]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastExactPos = useRef({ x: 64, y: 64 });
  const clearCanvasTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 128 * dpr;
    canvas.height = 128 * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  // Drawing mechanical lines on direction change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentX = pos.x + 64;
    const currentY = pos.y + 64;

    if (lastExactPos.current.x !== currentX || lastExactPos.current.y !== currentY) {
      ctx.beginPath();
      ctx.moveTo(lastExactPos.current.x, lastExactPos.current.y);
      ctx.lineTo(currentX, currentY);
      ctx.strokeStyle = 'rgba(29, 131, 133, 1)';
      ctx.lineWidth = 16;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.stroke();

      // Draw a small dot at the vertex for extra mechanical feel
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(29, 131, 133, 1)';
      ctx.fill();

      lastExactPos.current = { x: currentX, y: currentY };

      if (clearCanvasTimeoutRef.current) {
        clearTimeout(clearCanvasTimeoutRef.current);
      }
      clearCanvasTimeoutRef.current = setTimeout(() => {
        ctx.clearRect(0, 0, 128, 128);
      }, 400);
    }
  }, [pos.x, pos.y]);

  if (!show) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed bottom-10 left-10 z-50 flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      <div className="relative w-32 h-32 rounded-3xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center justify-center">
        {/* Canvas for Trail */}
        <canvas
          ref={canvasRef}
          style={{ width: 128, height: 128 }}
          className="absolute inset-0 pointer-events-none z-0"
        />

        {/* 9 Directional markers */}
        {Object.values(positions).map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gray-300/80 shadow-sm z-0"
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
          />
        ))}

        {/* Stick */}
        <motion.div
          style={{ x: stickX, y: stickY }}
          className="w-8 h-8 rounded-lg bg-[#1D8385] shadow-[0_4px_10px_rgba(29,131,133,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-[#156668] flex items-center justify-center z-10"
        >
          <div className="w-2 h-2 rounded-sm bg-white/30 shadow-inner border border-white/20" />
        </motion.div>
      </div>
      <div className="text-[10px] font-medium text-gray-500 bg-white/80 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-white/50">
        <span>拖动调整位置</span>
        <button onClick={onClose} className="hover:text-gray-800 bg-gray-100 p-0.5 rounded-full"><X size={10} /></button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [inputDevice, setInputDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [selectedMotion, setSelectedMotion] = useState<MotionType>('none');
  
  const [keyBinds, setKeyBinds] = useState<KeyBinds>({
    rcKey: 'Space',
    attackKey: 'KeyJ',
    upKey: 'KeyW',
    downKey: 'KeyS',
    leftKey: 'KeyA',
    rightKey: 'KeyD',
    rcButton: 6, // L2
    attackButton: 2, // X/Square
    upButton: 12, // D-Pad Up
    downButton: 13, // D-Pad Down
    leftButton: 14, // D-Pad Left
    rightButton: 15, // D-Pad Right
  });
  
  const [listeningKey, setListeningKey] = useState<keyof KeyBinds | null>(null);

  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const historyIdRef = useRef(0);
  const inputStateRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    direction: 5,
    rc: false,
    attack: false
  });

  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    currentStreak: 0,
    maxStreak: 0,
    reactionTimes: [],
  });

  const [feedback, setFeedback] = useState<{ status: FeedbackStatus; message: string; subMessage?: string; frames: number }>({
    status: 'idle',
    message: '准备',
    frames: 0,
  });

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
  const rcTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousGamepadState = useRef<boolean[]>([]);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const currentDirRef = useRef<number>(5);
  const motionBufferRef = useRef<number[]>([]);

  useEffect(() => {
    const handleConnect = () => setIsGamepadConnected(true);
    const handleDisconnect = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      setIsGamepadConnected(Array.from(gamepads).some(gp => gp && gp.connected));
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(gamepads).some(gp => gp && gp.connected)) {
      setIsGamepadConnected(true);
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  const updateStats = useCallback((status: FeedbackStatus, diffFrames: number) => {
    setStats(prev => {
      const isSuccess = status === 'success';
      const newStreak = isSuccess ? prev.currentStreak + 1 : 0;
      const newReactionTimes = isSuccess ? [...prev.reactionTimes, diffFrames].slice(-50) : prev.reactionTimes;
      const newTotal = prev.total + 1;

      if (trainingGoal && newTotal >= trainingGoal) {
        setTimeout(() => setShowSetResult(true), 500);
      }

      return {
        total: newTotal,
        success: prev.success + (isSuccess ? 1 : 0),
        currentStreak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        reactionTimes: newReactionTimes
      };
    });
  }, [trainingGoal]);

  const addHistoryEntry = useCallback((dir: number, buttons: string[]) => {
    const now = performance.now();
    setInputHistory(prev => {
      const last = prev[0];
      if (last && last.direction === dir && last.buttons.length === buttons.length && last.buttons.every(b => buttons.includes(b))) {
        return prev;
      }
      const updatedPrev = prev.map((entry, i) => 
        i === 0 ? { ...entry, endTimestamp: now } : entry
      );
      return [{ id: historyIdRef.current++, direction: dir, buttons, timestamp: now, endTimestamp: null }, ...updatedPrev].slice(0, 20);
    });
  }, []);

  const handleRcPress = useCallback(() => {
    rcTimeRef.current = performance.now();
    setRcTriggerTime(rcTimeRef.current);
    setRcHitTime(null);
    motionBufferRef.current = []; // Clear motion buffer on RC
    setRcActive(true);
    setTimeout(() => setRcActive(false), 100);

    if (rcTimeoutRef.current) clearTimeout(rcTimeoutRef.current);
    rcTimeoutRef.current = setTimeout(() => {
      rcTimeRef.current = null;
    }, 600);
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
      if (!isMotionValid) {
        subMessage = '✖ 方向输入错误';
      } else if (selectedMotion !== 'none') {
        subMessage = '✔ 方向正确';
      }
      setFeedback({ status: 'late', message: '✖ 过晚', subMessage, frames: diffFrames });
      updateStats('late', diffFrames);
      return;
    }

    let status: FeedbackStatus;
    let message: string;
    let subMessage: string | undefined;

    if (diffFrames < minFrame) {
      status = 'early';
      message = '✖ 过早';
    } else if (diffFrames <= maxFrame) {
      status = 'success';
      message = '✔ 成功';
    } else {
      status = 'late';
      message = '✖ 过晚';
    }

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

  const updateInputState = useCallback((updates: Partial<typeof inputStateRef.current>) => {
    let changed = false;
    for (const key in updates) {
      if (updates[key as keyof typeof updates] !== inputStateRef.current[key as keyof typeof updates]) {
        changed = true;
      }
    }
    
    if (!changed) return;

    Object.assign(inputStateRef.current, updates);
    
    const newDir = getDirection(inputStateRef.current.up, inputStateRef.current.down, inputStateRef.current.left, inputStateRef.current.right);
    
    if (newDir !== inputStateRef.current.direction) {
      inputStateRef.current.direction = newDir;
      setCurrentDirection(newDir);
      if (newDir !== 5) {
        motionBufferRef.current.push(newDir);
      }
    }

    const buttons = [];
    if (inputStateRef.current.rc) buttons.push('RC');
    if (inputStateRef.current.attack) buttons.push('ATK');
    
    addHistoryEntry(newDir, buttons);
  }, [addHistoryEntry]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (listeningKey) {
        e.preventDefault();
        setKeyBinds(prev => ({
          ...prev,
          [listeningKey]: e.code
        }));
        setListeningKey(null);
        setInputDevice('keyboard');
        return;
      }

      const updates: Partial<typeof inputStateRef.current> = {};
      let handled = false;

      if (e.code === keyBinds.upKey) { updates.up = true; handled = true; }
      if (e.code === keyBinds.downKey) { updates.down = true; handled = true; }
      if (e.code === keyBinds.leftKey) { updates.left = true; handled = true; }
      if (e.code === keyBinds.rightKey) { updates.right = true; handled = true; }
      
      if (e.code === keyBinds.rcKey && !inputStateRef.current.rc) {
        updates.rc = true;
        handled = true;
        setInputDevice('keyboard');
        handleRcPress();
      }
      
      if (e.code === keyBinds.attackKey && !inputStateRef.current.attack) {
        updates.attack = true;
        handled = true;
        setInputDevice('keyboard');
        handleAttackPress();
      }

      if (handled) {
        updateInputState(updates);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const updates: Partial<typeof inputStateRef.current> = {};
      let handled = false;

      if (e.code === keyBinds.upKey) { updates.up = false; handled = true; }
      if (e.code === keyBinds.downKey) { updates.down = false; handled = true; }
      if (e.code === keyBinds.leftKey) { updates.left = false; handled = true; }
      if (e.code === keyBinds.rightKey) { updates.right = false; handled = true; }
      if (e.code === keyBinds.rcKey) { updates.rc = false; handled = true; }
      if (e.code === keyBinds.attackKey) { updates.attack = false; handled = true; }

      if (handled) {
        updateInputState(updates);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyBinds, listeningKey, handleRcPress, handleAttackPress, updateInputState]);

  // Gamepad listener
  useGamepad((buttons, axes) => {
    if (listeningKey) {
      const pressedIndex = buttons.findIndex(b => b.pressed);
      if (pressedIndex !== -1 && !previousGamepadState.current[pressedIndex]) {
        setKeyBinds(prev => ({
          ...prev,
          [listeningKey.replace('Key', 'Button')]: pressedIndex
        }));
        setListeningKey(null);
        setInputDevice('gamepad');
        previousGamepadState.current[pressedIndex] = true;
      }
      buttons.forEach((b, i) => {
        previousGamepadState.current[i] = b.pressed;
      });
      return;
    }

    const up = buttons[keyBinds.upButton]?.pressed || axes[1] < -0.5;
    const down = buttons[keyBinds.downButton]?.pressed || axes[1] > 0.5;
    const left = buttons[keyBinds.leftButton]?.pressed || axes[0] < -0.5;
    const right = buttons[keyBinds.rightButton]?.pressed || axes[0] > 0.5;
    const rc = buttons[keyBinds.rcButton]?.pressed;
    const attack = buttons[keyBinds.attackButton]?.pressed;

    if (rc || attack || up || down || left || right) {
      if (inputDevice !== 'gamepad') setInputDevice('gamepad');
    }

    const updates: Partial<typeof inputStateRef.current> = { up, down, left, right, rc, attack };

    if (rc && !inputStateRef.current.rc) {
      handleRcPress();
    }
    if (attack && !inputStateRef.current.attack) {
      handleAttackPress();
    }

    updateInputState(updates);

    buttons.forEach((b, i) => {
      previousGamepadState.current[i] = b.pressed;
    });
  });

  // Reset to Ready state
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
    ? stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length
    : 0;

  const getCardBg = (status: FeedbackStatus) => {
    switch (status) {
      case 'success': return 'bg-[#F0FAFA] border-[#E0F2F2]';
      case 'early': return 'bg-[#F0F4FA] border-[#E0EAF2]';
      case 'late': return 'bg-[#FDF9F0] border-[#F5EFE0]';
      case 'motion_fail': return 'bg-[#FFF0F0] border-[#FCE0E0]';
      default: return 'bg-white border-transparent';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans flex flex-col items-center justify-center p-6 selection:bg-[#1D8385] selection:text-white">
      
      {/* Input History Sidebar */}
      <div 
        className="fixed left-2 sm:left-8 top-1/2 -translate-y-1/2 w-24 sm:w-32 h-[60vh] flex flex-col justify-start overflow-hidden pointer-events-none z-10"
        style={{ maskImage: 'linear-gradient(to bottom, black 10%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 10%, black 80%, transparent)' }}
      >
        <AnimatePresence initial={false}>
          {inputHistory.map((entry, index) => (
            <HistoryEntryRow key={entry.id} entry={entry} isLatest={index === 0} />
          ))}
        </AnimatePresence>
      </div>

      <div className="mb-6 text-center z-10 relative">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">RCC练习</h1>
      </div>

      {/* Right Sidebar */}
      <div className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 w-32 sm:w-40">
        {/* Training Goals */}
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">训练目标</div>
          {[null, 50, 100, 200].map(goal => (
            <button
              key={goal || 'free'}
              onClick={() => { 
                setTrainingGoal(goal); 
                setStats({total:0, success:0, currentStreak:0, maxStreak:0, reactionTimes:[]}); 
                setShowSetResult(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                trainingGoal === goal 
                  ? 'bg-[#1D8385] text-white shadow-md scale-105' 
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm hover:scale-105'
              }`}
            >
              {goal ? `${goal} 次` : '自由练习'}
            </button>
          ))}
        </div>

        {/* Timing Settings */}
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">区间设置</div>
          <SettingSlider label="最大帧数" value={totalFrames} min={20} max={100} onChange={(v) => { setTotalFrames(v); if(maxFrame > v) setMaxFrame(v); if(minFrame > v) setMinFrame(v); }} />
          <SettingSlider label="起始帧" value={minFrame} min={1} max={maxFrame} onChange={(v) => setMinFrame(v)} />
          <SettingSlider label="结束帧" value={maxFrame} min={minFrame} max={totalFrames} onChange={(v) => setMaxFrame(v)} />
        </div>

        {/* Display Settings */}
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">显示设置</div>
          <button
            onClick={() => setShowJoystick(!showJoystick)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              showJoystick 
                ? 'bg-[#1D8385] text-white shadow-md' 
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
            }`}
          >
            {showJoystick ? '摇杆: 开' : '摇杆: 关'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-2 z-10 relative">
        {(['none', '236', '214'] as MotionType[]).map(m => (
          <button
            key={m}
            onClick={() => setSelectedMotion(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMotion === m 
                ? 'bg-[#1D8385] text-white shadow-md' 
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {m === 'none' ? '无方向' : m}
          </button>
        ))}
      </div>

      <motion.div
        layout
        className={`rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 w-full max-w-md flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden transition-colors duration-500 border ${getCardBg(feedback.status)}`}
      >
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={() => setShowVisualCue(!showVisualCue)} 
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${showVisualCue ? 'bg-[#1D8385]/10 text-[#1D8385]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            {showVisualCue ? '视觉提示: 开' : '视觉提示: 关'}
          </button>
        </div>
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm w-fit">
            {inputDevice === 'keyboard' ? <Keyboard size={14} /> : <Gamepad2 size={14} />}
            <span>{inputDevice === 'keyboard' ? '键盘' : '手柄'}</span>
          </div>
          <div className={`flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors w-fit ${isGamepadConnected ? 'bg-[#F0FAFA] text-[#1D8385]' : 'bg-gray-100/50 text-gray-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isGamepadConnected ? 'bg-[#1D8385]' : 'bg-gray-300'}`} />
            {isGamepadConnected ? '手柄已连接' : '请按任意手柄按键'}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-full w-full mt-8 z-10">
          <AnimatePresence mode="wait">
            {feedback.status !== 'idle' ? (
              <motion.div
                key={feedback.timeDiff + feedback.status}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center z-10 bg-white/60 px-8 py-6 rounded-3xl backdrop-blur-md shadow-sm"
              >
                <div className={`text-3xl sm:text-4xl font-semibold tracking-tight mb-1 text-center ${
                  feedback.status === 'success' ? 'text-[#1D8385]' :
                  feedback.status === 'early' ? 'text-[#1E3A8A]' :
                  feedback.status === 'motion_fail' ? 'text-[#E02424]' :
                  'text-[#D4AF37]'
                }`}>
                  {feedback.message}
                </div>
                {feedback.subMessage && (
                  <div className={`text-lg font-medium mb-3 text-center ${
                    feedback.subMessage.includes('✔') ? 'text-[#1D8385]' : 'text-[#E02424]'
                  }`}>
                    {feedback.subMessage}
                  </div>
                )}
                {feedback.frames > 0 && (
                  <div className="text-lg font-medium text-gray-500 font-mono bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm">
                    {feedback.frames} f
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-400 text-xl font-medium tracking-wide"
              >
                准备
              </motion.div>
            )}
          </AnimatePresence>

          <VisualCueBar triggerTime={rcTriggerTime} hitTime={rcHitTime} feedbackFrames={feedback.frames} show={showVisualCue} minFrame={minFrame} maxFrame={maxFrame} totalFrames={totalFrames} />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-2xl z-10 relative">
        <StatCard label="成功率" value={`${stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%`} />
        <StatCard label="平均时间" value={`${avgTime > 0 ? avgTime.toFixed(1) : '--'} f`} />
        <StatCard label="Combo" value={stats.currentStreak} />
        <StatCard label="Max Combo" value={stats.maxStreak} />
      </div>

      {trainingGoal && (
        <div className="w-full max-w-2xl mt-4 z-10 relative">
          <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>训练进度</span>
            <span>{stats.total} / {trainingGoal}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#1D8385]" 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (stats.total / trainingGoal) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-6 text-sm text-gray-500 w-full max-w-3xl z-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 w-full">
          <KeyBindButton label="RC" bindKey="rcKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.rcButton) : keyBinds.rcKey} listening={listeningKey} onClick={() => setListeningKey('rcKey')} active={rcActive} />
          <KeyBindButton label="Attack" bindKey="attackKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.attackButton) : keyBinds.attackKey} listening={listeningKey} onClick={() => setListeningKey('attackKey')} active={attackActive} />
          <KeyBindButton label="Up" bindKey="upKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.upButton) : keyBinds.upKey} listening={listeningKey} onClick={() => setListeningKey('upKey')} />
          <KeyBindButton label="Down" bindKey="downKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.downButton) : keyBinds.downKey} listening={listeningKey} onClick={() => setListeningKey('downKey')} />
          <KeyBindButton label="Left" bindKey="leftKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.leftButton) : keyBinds.leftKey} listening={listeningKey} onClick={() => setListeningKey('leftKey')} />
          <KeyBindButton label="Right" bindKey="rightKey" current={inputDevice === 'gamepad' ? formatGamepadButton(keyBinds.rightButton) : keyBinds.rightKey} listening={listeningKey} onClick={() => setListeningKey('rightKey')} />
        </div>
        
        <button 
          onClick={() => setStats({ total: 0, success: 0, currentStreak: 0, maxStreak: 0, reactionTimes: [] })} 
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium"
        >
          <RotateCcw size={14} /> 重置数据
        </button>
      </div>

      <AnimatePresence>
        <VirtualJoystick direction={currentDirection} show={showJoystick} onClose={() => setShowJoystick(false)} />
      </AnimatePresence>

      <AnimatePresence>
        {showSetResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-2">训练完成!</h2>
              <p className="text-gray-500 mb-6">RCC练习 ({trainingGoal} 组)</p>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">成功率</div>
                  <div className="text-2xl font-bold text-[#1D8385]">{stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">平均时间</div>
                  <div className="text-2xl font-bold text-gray-800">{avgTime.toFixed(1)} f</div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowSetResult(false);
                  setStats({total:0, success:0, currentStreak:0, maxStreak:0, reactionTimes:[]});
                }}
                className="w-full py-3 bg-[#1D8385] text-white rounded-full font-medium hover:bg-[#156668] transition-colors"
              >
                继续练习
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const StatCard = ({ label, value }: { label: string, value: string | number }) => (
  <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col items-center justify-center border border-gray-100/50">
    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{label}</div>
    <div className="text-2xl font-semibold text-gray-800 tracking-tight">{value}</div>
  </div>
);

const KeyBindButton = ({ label, bindKey, current, listening, onClick, active = false }: { label: string, bindKey: string, current: string, listening: string | null, onClick: () => void, active?: boolean }) => (
  <div className="flex flex-col items-center gap-2">
    <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-400">{label}</span>
    <button onClick={onClick} className="focus:outline-none group w-full">
      <motion.kbd
        animate={{
          scale: active || listening === bindKey ? 0.92 : 1,
          boxShadow: active || listening === bindKey
            ? "0 1px 2px rgba(0,0,0,0.1) inset"
            : "0 4px 12px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05)",
          backgroundColor: active || listening === bindKey ? "#F3F4F6" : "#FFFFFF",
          color: active || listening === bindKey ? "#374151" : "#111827"
        }}
        transition={{ duration: 0.1 }}
        className="px-3 py-2 rounded-xl border border-gray-200/80 font-mono text-xs font-medium w-full text-center inline-block cursor-pointer truncate"
      >
        {listening === bindKey ? '...' : formatKey(current)}
      </motion.kbd>
    </button>
  </div>
);

const DirectionIcon = ({ dir }: { dir: number }) => {
  if (dir === 5) {
    return <div className="w-6 h-6 flex items-center justify-center text-gray-300 text-xl font-black">N</div>;
  }
  const rotations: Record<number, number> = {
    6: 0, 3: 45, 2: 90, 1: 135, 4: 180, 7: 225, 8: 270, 9: 315
  };
  return (
    <div className="w-6 h-6 flex items-center justify-center text-gray-700" style={{ transform: `rotate(${rotations[dir]}deg)` }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 10h14v-4l8 6-8 6v-4H2z" />
      </svg>
    </div>
  );
};

const ButtonIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'RC') {
    return <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">RC</div>;
  }
  if (type === 'ATK') {
    return <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">S</div>;
  }
  return null;
};

const HistoryEntryRow: React.FC<{ entry: InputHistoryEntry, isLatest: boolean }> = ({ entry, isLatest }) => {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLatest && entry.endTimestamp) {
      if (frameRef.current) {
        const f = Math.min(99, Math.max(1, Math.round((entry.endTimestamp - entry.timestamp) / (1000 / 60))));
        frameRef.current.textContent = f.toString();
      }
      return;
    }

    let animationFrameId: number;
    const updateFrames = () => {
      const now = performance.now();
      const currentFrames = Math.max(1, Math.round((now - entry.timestamp) / (1000 / 60)));
      if (frameRef.current) {
        frameRef.current.textContent = Math.min(99, currentFrames).toString();
      }
      if (currentFrames < 99) {
        animationFrameId = requestAnimationFrame(updateFrames);
      }
    };
    updateFrames();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isLatest, entry.timestamp, entry.endTimestamp]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 py-1.5"
    >
      <div ref={frameRef} className="w-6 text-right text-xs font-mono text-gray-400 font-medium">1</div>
      <DirectionIcon dir={entry.direction} />
      <div className="flex gap-1">
        {entry.buttons.map(b => <ButtonIcon key={b} type={b} />)}
      </div>
    </motion.div>
  );
};
