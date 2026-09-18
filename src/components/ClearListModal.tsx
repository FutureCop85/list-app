import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Trash2, X } from 'lucide-react';

interface ClearListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  completedCount: number;
  totalCount: number;
}

export const ClearListModal: React.FC<ClearListModalProps> = ({
  isOpen,
  onClose,
  onClearCompleted,
  onClearAll,
  completedCount,
  totalCount,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl z-10 border border-zinc-100 dark:border-zinc-800"
            id="clear-list-modal"
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Clear List
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Triggered by 2-second pull down
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90"
                aria-label="Close modal"
                id="close-clear-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 my-5">
              {completedCount > 0 && (
                <button
                  id="clear-completed-btn"
                  onClick={() => {
                    onClearCompleted();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/70 dark:border-zinc-700 transition-all text-left font-medium active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Clear completed items</span>
                  </div>
                  <span className="text-xs bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-semibold">
                    {completedCount}
                  </span>
                </button>
              )}

              <button
                id="clear-all-btn"
                onClick={() => {
                  onClearAll();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 transition-all text-left font-medium active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Clear entire list</span>
                </div>
                <span className="text-xs bg-rose-200/70 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full font-semibold">
                  {totalCount}
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              id="cancel-clear-btn"
              className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
