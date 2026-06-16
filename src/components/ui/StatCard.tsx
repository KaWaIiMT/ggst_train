import React from 'react';

export const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col items-center justify-center border border-gray-100/50">
    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{label}</div>
    <div className="text-2xl font-semibold text-gray-800 tracking-tight">{value}</div>
  </div>
);
