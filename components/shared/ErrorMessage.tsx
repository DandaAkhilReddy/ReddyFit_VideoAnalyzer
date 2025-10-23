import React from 'react';
import { ErrorIcon } from './icons';

interface ErrorMessageProps {
    error: string;
    onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg relative my-4 flex items-start gap-4" role="alert">
        <div className="flex-shrink-0 pt-0.5">
            <ErrorIcon className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-grow">
            <strong className="font-bold block">An error occurred</strong>
            <span className="block text-sm mt-1">{error}</span>
            {onRetry && (
                <div className="mt-3">
                    <button
                        onClick={onRetry}
                        className="px-4 py-1.5 bg-slate-200 text-slate-900 rounded-md hover:bg-white font-semibold text-xs transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    </div>
);