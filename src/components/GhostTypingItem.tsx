import React from 'react';
import { motion } from 'motion/react';

interface GhostTypingItemProps {
  name: string;
}

// Live placeholder shown at the top of the list (where a new item lands)
// while a partner is composing one on another device.
export const GhostTypingItem: React.FC<GhostTypingItemProps> = ({ name }) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="overflow-hidden"
      id="ghost-typing-item"
    >
      <div className="flex items-center px-3.5 py-3 my-1 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40">
        <span className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 shrink-0 mr-3" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex gap-1 items-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
          </span>
          <span className="text-sm text-zinc-400 dark:text-zinc-500 font-medium italic tracking-tight truncate">
            {name} is adding an item&hellip;
          </span>
        </div>
      </div>
    </motion.div>
  );
};
