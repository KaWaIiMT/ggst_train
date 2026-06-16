import { useRef, useCallback } from 'react';
import type { MotionType } from '../types';

export function getDirection(up: boolean, down: boolean, left: boolean, right: boolean): number {
  if (up && right) return 9;
  if (up && left) return 7;
  if (down && right) return 3;
  if (down && left) return 1;
  if (up) return 8;
  if (down) return 2;
  if (right) return 6;
  if (left) return 4;
  return 5;
}

export function validateMotion(buffer: number[], motion: MotionType): boolean {
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
}

export function useDirectionInput() {
  const inputStateRef = useRef({
    up: false, down: false, left: false, right: false,
    direction: 5, rc: false, attack: false,
  });
  const motionBufferRef = useRef<number[]>([]);
  const currentDirRef = useRef<number>(5);

  const resetBuffer = useCallback(() => {
    motionBufferRef.current = [];
  }, []);

  const getBuffer = useCallback(() => motionBufferRef.current, []);

  const updateState = useCallback((updates: Partial<{
    up: boolean; down: boolean; left: boolean; right: boolean;
    rc: boolean; attack: boolean;
  }>) => {
    let changed = false;
    for (const key in updates) {
      if (updates[key as keyof typeof updates] !== inputStateRef.current[key as keyof typeof updates]) {
        changed = true;
        break;
      }
    }
    if (!changed) return { changed: false, direction: currentDirRef.current, buttons: [] as string[] };

    Object.assign(inputStateRef.current, updates);
    const newDir = getDirection(
      inputStateRef.current.up, inputStateRef.current.down,
      inputStateRef.current.left, inputStateRef.current.right
    );

    if (newDir !== inputStateRef.current.direction) {
      inputStateRef.current.direction = newDir;
      currentDirRef.current = newDir;
      if (newDir !== 5) {
        motionBufferRef.current.push(newDir);
      }
    }

    const buttons: string[] = [];
    if (inputStateRef.current.rc) buttons.push('RC');
    if (inputStateRef.current.attack) buttons.push('ATK');
    return { changed: true, direction: newDir, buttons };
  }, []);

  return {
    inputState: inputStateRef.current,
    currentDirection: currentDirRef.current,
    motionBuffer: motionBufferRef,
    resetBuffer,
    getBuffer,
    updateState,
  };
}
