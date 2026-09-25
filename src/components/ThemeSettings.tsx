import React from 'react';
import { Check, Sparkles, Gamepad2 } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { AppTheme } from '../hooks/useTheme';

interface ThemeSettingsProps {
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

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ theme, onSelectTheme }) => {
  return (
    <div id="theme-settings">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-tight mb-3">Applies on this device only</p>
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
    </div>
  );
};
