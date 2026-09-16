import React from 'react';

// App version using yymmdd-nn format (nn is daily change counter starting at 01)
export const APP_VERSION = '260913-02';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 mt-6 text-center select-none" id="app-footer">
      <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        <span>Checklist</span>
        <span>·</span>
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">v{APP_VERSION}</span>
      </div>
    </footer>
  );
};
