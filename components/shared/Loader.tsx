import React from 'react';

export const Loader: React.FC<{text?: string, subtext?: string}> = ({text, subtext}) => (
  <div className="flex flex-col items-center justify-center space-y-4 my-8">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500"></div>
    <p className="text-lg font-semibold text-amber-300">{text || 'Analyzing...'}</p>
    {subtext && <p className="text-sm text-gray-400 text-center max-w-sm">{subtext}</p>}
  </div>
);
