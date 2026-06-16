import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Theme } from '../../types';
import { themes } from '../../data/themes';

interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'teal',
  setThemeId: () => {},
  theme: themes['teal'],
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState(() => {
    try { return localStorage.getItem('ggst-theme') || 'teal'; }
    catch { return 'teal'; }
  });

  const theme = themes[themeId] ?? themes['teal'];

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try { localStorage.setItem('ggst-theme', id); } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const colors = theme.colors as unknown as Record<string, string>;

    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--color-${key}`, value);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
