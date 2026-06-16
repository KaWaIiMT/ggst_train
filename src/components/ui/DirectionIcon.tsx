import React from 'react';

export const DirectionIcon: React.FC<{ dir: number }> = ({ dir }) => {
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
