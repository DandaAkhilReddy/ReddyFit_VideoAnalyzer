import React, { useEffect, useState } from 'react';
import { useToast, ToastMessage } from '../../hooks/useToast';
import { CheckCircleIcon, XCircleIcon, InfoCircleIcon, CloseIcon } from './icons';

const ICONS: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
  error: <XCircleIcon className="w-6 h-6 text-red-400" />,
  info: <InfoCircleIcon className="w-6 h-6 text-blue-400" />,
};

const BORDER_COLORS: Record<ToastMessage['type'], string> = {
  success: 'border-green-600',
  error: 'border-red-600',
  info: 'border-blue-600',
};

const Toast: React.FC<{ toast: ToastMessage, onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 500); // Wait for animation
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 500);
  };
  
  return (
    <div
      className={`w-full max-w-sm p-4 text-slate-200 bg-slate-800 rounded-lg shadow-lg border-l-4 ${BORDER_COLORS[toast.type]} flex items-start gap-3 ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      role="alert"
    >
      <div className="flex-shrink-0">{ICONS[toast.type]}</div>
      <div className="ms-3 text-sm font-normal flex-grow">{toast.message}</div>
      <button
        type="button"
        className="ms-auto -mx-1.5 -my-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg focus:ring-2 focus:ring-slate-600 p-1.5 inline-flex items-center justify-center h-8 w-8"
        onClick={handleClose}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-5 right-5 z-50 space-y-3 w-full max-w-sm">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};