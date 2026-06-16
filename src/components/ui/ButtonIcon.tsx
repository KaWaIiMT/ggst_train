import React from 'react';

export const ButtonIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'RC') {
    return <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">RC</div>;
  }
  if (type === 'ATK') {
    return <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">S</div>;
  }
  return <div className="w-5 h-5 rounded-full bg-gray-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">{type}</div>;
};
