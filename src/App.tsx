import React, { useState } from 'react';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { HomeScreen } from './screens/HomeScreen';
import { RCCTrainer } from './features/rcc/RCCTrainer';
import { FrameTrapTrainer } from './features/frame-trap/FrameTrapTrainer';
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
        <FrameTrapTrainer onBack={() => setPage('home')} />
      )}
    </ThemeProvider>
  );
}

export default App;
