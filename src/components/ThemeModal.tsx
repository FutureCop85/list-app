import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, X, Check, Sparkles, Gamepad2 } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { AppTheme } from '../hooks/useTheme';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

const OPTIONS: { id: AppTheme; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Clean, minimal, pastel accents',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: '8bit',
    label: '8-Bit',
    description: 'Retro pixel UI, chunky borders',
    icon: <Gamepad2 className="w-5 h-5" />,
  },
];

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose, theme, onSelectTheme }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          id="theme-modal-backdrop"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.9 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl z-10 border border-zinc-100 dark:border-zinc-800"
          id="theme-modal"
        >
          <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Theme</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-tight">Applies on this device only</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90 cursor-pointer"
              aria-label="Close modal"
              id="close-theme-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {OPTIONS.map((option) => {
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  id={`theme-option-${option.id}`}
                  onClick={() => {
                    onSelectTheme(option.id);
                    triggerHaptic(20);
                  }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.99] cursor-pointer ${
                    isSelected
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80'
                      : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {option.label}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400 tracking-tight truncate">
                      {option.description}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
