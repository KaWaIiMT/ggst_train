import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import { X } from 'lucide-react';

const R_CARDINAL = 54;
const R_DIAGONAL = 46;

const positions: Record<number, { x: number; y: number }> = {
  5: { x: 0, y: 0 },
  8: { x: 0, y: -R_CARDINAL },
  2: { x: 0, y: R_CARDINAL },
  4: { x: -R_CARDINAL, y: 0 },
  6: { x: R_CARDINAL, y: 0 },
  7: { x: -R_DIAGONAL, y: -R_DIAGONAL },
  9: { x: R_DIAGONAL, y: -R_DIAGONAL },
  1: { x: -R_DIAGONAL, y: R_DIAGONAL },
  3: { x: R_DIAGONAL, y: R_DIAGONAL },
};

export const VirtualJoystick: React.FC<{
  direction: number;
  show: boolean;
  onClose: () => void;
}> = ({ direction, show, onClose }) => {
  const pos = positions[direction] || positions[5];

  const stickX = useSpring(pos.x, { stiffness: 1000, damping: 30, mass: 0.5 });
  const stickY = useSpring(pos.y, { stiffness: 1000, damping: 30, mass: 0.5 });

  useEffect(() => {
    stickX.set(pos.x);
    stickY.set(pos.y);
  }, [pos.x, pos.y, stickX, stickY]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathHistory = useRef<{ x: number; y: number }[]>([{ x: 64, y: 64 }]);
  const clearCanvasTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentX = pos.x + 64;
    const currentY = pos.y + 64;
    const history = pathHistory.current;
    const lastPos = history[history.length - 1];

    if (!lastPos || lastPos.x !== currentX || lastPos.y !== currentY) {
      history.push({ x: currentX, y: currentY });
      if (history.length > 5) history.shift();

      ctx.clearRect(0, 0, 128, 128);

      if (history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(history[0].x, history[0].y);
        for (let i = 1; i < history.length; i++) {
          ctx.lineTo(history[i].x, history[i].y);
        }
        ctx.strokeStyle = 'rgba(29, 131, 133, 1)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.stroke();
      }

      for (let i = 0; i < history.length; i++) {
        ctx.beginPath();
        ctx.arc(history[i].x, history[i].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(29, 131, 133, 1)';
        ctx.fill();
      }

      if (clearCanvasTimeoutRef.current) clearTimeout(clearCanvasTimeoutRef.current);
      clearCanvasTimeoutRef.current = setTimeout(() => {
        history.length = 0;
        history.push({ x: currentX, y: currentY });
        ctx.clearRect(0, 0, 128, 128);
      }, 150);
    }

    return () => {
      if (clearCanvasTimeoutRef.current) clearTimeout(clearCanvasTimeoutRef.current);
    };
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
        <canvas ref={canvasRef} style={{ width: 128, height: 128 }} className="absolute inset-0 pointer-events-none z-0" />
        {Object.values(positions).map((p, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full bg-gray-300/80 shadow-sm z-0" style={{ transform: `translate(${p.x}px, ${p.y}px)` }} />
        ))}
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
