import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

interface NotificationToastProps {
  toast: {
    id: string;
    message: string;
    timestamp: number;
    undoAction?: () => void;
  } | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    // Keep toast visible slightly longer if there's an undo action (5.5s vs 3.5s)
    const duration = toast.undoAction ? 5500 : 3500;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100 text-xs font-medium px-3.5 py-2 rounded-full shadow-lg border border-zinc-800/80 dark:border-zinc-700 max-w-sm transition-colors duration-150"
            id="partner-notification-toast"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[170px] sm:max-w-[220px]">{toast.message}</span>
            {toast.undoAction && (
              <button
                type="button"
                id="toast-undo-btn"
                onClick={() => {
                  toast.undoAction?.();
                  onDismiss();
                }}
                className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 dark:text-amber-200 text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-zinc-400 hover:text-white dark:hover:text-zinc-200 ml-0.5 p-0.5 rounded-full shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
