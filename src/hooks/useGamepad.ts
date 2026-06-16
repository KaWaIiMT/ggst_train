import { useRef, useEffect, useCallback } from 'react';

export function useGamepad(
  callback: (buttons: readonly GamepadButton[], axes: readonly number[]) => void
) {
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
