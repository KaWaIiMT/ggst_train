import React, { useState } from 'react';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { HomeScreen } from './screens/HomeScreen';
import { RCCTrainer } from './features/rcc/RCCTrainer';
import type { TrainingMode } from './types';

function App() {
  const [page, setPage] = useState<'home' | TrainingMode>('home');

  return (
    <ThemeProvider>
      {page === 'home' && (
        <HomeScreen onSelectMode={(mode) => setPage(mode)} />
      )}
      {page === 'rcc' && (
        <RCCTrainer onBack={() => setPage('home')} />
      )}
      {page === 'frame-trap' && (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">放帧压制</h2>
            <p className="text-sm text-[var(--color-textSecondary)] mb-6">即将推出...</p>
            <button
              onClick={() => setPage('home')}
              className="px-4 py-2 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium"
            >
              ← 返回
            </button>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
