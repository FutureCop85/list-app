import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { PASTEL_ORDER, PASTEL_PALETTES, PastelColorId } from '../utils/pastels';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: (name: string, color?: string) => void;
}

const SUGGESTIONS = [
  'Asian Supermarket',
  'Costco',
  'Trader Joe’s',
  'Farmers Market',
  'Pharmacy',
  'Hardware Store',
];

export const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  onClose,
  onCreateList,
}) => {
  const [listName, setListName] = useState('');
  const [selectedColor, setSelectedColor] = useState<PastelColorId>('sand');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setListName('');
      // Pick a random pastel by default
      const randomColor = PASTEL_ORDER[Math.floor(Math.random() * PASTEL_ORDER.length)];
      setSelectedColor(randomColor);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = listName.trim();
    if (!trimmed) {
      setError('Please enter a list name');
      inputRef.current?.focus();
      return;
    }
    setError('');
    onCreateList(trimmed, selectedColor);
    triggerHaptic(25);
    onClose();
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setListName(suggestion);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          id="create-list-backdrop"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col p-6"
          id="create-list-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                New Checklist
              </h3>
            </div>
            <button
              type="button"
              id="close-create-list-btn"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-list-name-input"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                List Name
              </label>
              <input
                ref={inputRef}
                id="new-list-name-input"
                type="text"
                value={listName}
                onChange={(e) => {
                  setListName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Asian Supermarket"
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm font-medium tracking-tight focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:bg-white dark:focus:bg-zinc-800 transition-all"
              />
              {error && (
                <p className="mt-1 text-xs text-rose-500 font-medium" id="create-list-error">
                  {error}
                </p>
              )}
            </div>

            {/* Pastel Color Selector */}
            <div>
              <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Color Accent
              </span>
              <div className="flex items-center gap-2.5">
                {PASTEL_ORDER.map((cId) => {
                  const p = PASTEL_PALETTES[cId];
                  const isSelected = selectedColor === cId;
                  return (
                    <button
                      key={cId}
                      type="button"
                      onClick={() => {
                        setSelectedColor(cId);
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-zinc-800 dark:ring-zinc-200 scale-110 shadow-xs'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: p.dotColor }}
                      title={p.label}
                      aria-label={`Color ${p.label}`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-800 stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Quick Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`text-xs font-semibold tracking-tight px-3 py-1 rounded-full transition-all cursor-pointer ${
                      listName === suggestion
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-create-list-btn"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold tracking-tight shadow-xs transition-colors cursor-pointer"
              >
                Create List
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
