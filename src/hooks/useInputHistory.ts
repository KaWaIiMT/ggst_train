import { useState, useCallback, useRef } from 'react';
import type { InputHistoryEntry } from '../types';

export function useInputHistory() {
  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const historyIdRef = useRef(0);

  const addEntry = useCallback((direction: number, buttons: string[]) => {
    const now = performance.now();
    setInputHistory(prev => {
      const last = prev[0];
      if (last && last.direction === direction &&
          last.buttons.length === buttons.length &&
          last.buttons.every((b, i) => buttons[i] === b)) {
        return prev;
      }
      const updated = prev.map((entry, i) =>
        i === 0 ? { ...entry, endTimestamp: now } : entry
      );
      return [
        { id: historyIdRef.current++, direction, buttons, timestamp: now, endTimestamp: null },
        ...updated
      ].slice(0, 20);
    });
  }, []);

  return { inputHistory, addEntry };
}
