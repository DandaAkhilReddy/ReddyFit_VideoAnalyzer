import React from 'react';

interface ProgressBarProps {
    progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div
                className="bg-gradient-to-r from-amber-500 to-orange-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${clampedProgress}%` }}
            ></div>
        </div>
    );
};
