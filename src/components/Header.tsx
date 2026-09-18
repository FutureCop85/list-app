import React from 'react';
import { Bell, BellOff, WifiOff, Key } from 'lucide-react';
import { SyncStatus } from '../types';
import { PastelPalette } from '../utils/pastels';

interface HeaderProps {
  syncStatus: SyncStatus;
  partnerActive: boolean;
  partnerName?: string;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
  itemCount: number;
  completedCount: number;
  syncKey: string;
  onOpenSyncModal: () => void;
  palette?: PastelPalette;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  partnerActive,
  partnerName = 'Partner',
  notificationPermission,
  onRequestNotifications,
  itemCount,
  completedCount,
  syncKey,
  onOpenSyncModal,
  palette,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-100/80 dark:border-zinc-800/80 px-4 pt-3 pb-3 transition-colors duration-150">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* App Title in Serif Italic + counter */}
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span
            className="text-2xl font-serif italic text-zinc-900 dark:text-zinc-100 select-none shrink-0 tracking-tight"
            id="app-title"
          >
            List.
          </span>
          {itemCount > 0 && (
            <span
              className={`text-xs font-mono font-bold tracking-wider tabular-nums shrink-0 px-2.5 py-0.5 rounded-full ${
                palette
                  ? `${palette.pillBg} ${palette.pillText}`
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              }`}
              id="items-counter"
            >
              {completedCount}/{itemCount}
            </span>
          )}
        </div>

        {/* Status indicator, Key button & notification toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Key status button - shows only key icon */}
          <button
            type="button"
            id="open-sync-key-btn"
            onClick={onOpenSyncModal}
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 transition-all active:scale-90 flex items-center justify-center"
            title={`Private List Key: ${syncKey}. Tap to share or change.`}
            aria-label="Manage Sync Key"
          >
            <Key className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          </button>

          {/* Sync Status Badge / Orb */}
          {syncStatus === 'offline' ? (
            <div
              id="sync-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-900 text-amber-700 dark:text-amber-400 border border-zinc-200/50 dark:border-zinc-800 transition-colors"
              title="Offline - changes saved locally"
            >
              <WifiOff className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-[11px]">Offline</span>
            </div>
          ) : partnerActive ? (
            <div
              id="sync-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 transition-all"
              title={`${partnerName} is online on this list`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                {partnerName} online
              </span>
            </div>
          ) : (
            <div
              id="sync-status-badge"
              className="flex items-center justify-center p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 transition-colors"
              title="Connected - alone on this list"
            >
              <span className="inline-flex rounded-full h-2 w-2 bg-zinc-400 dark:bg-zinc-500"></span>
            </div>
          )}

          {/* Notification Button */}
          <button
            id="notification-toggle-btn"
            onClick={onRequestNotifications}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              notificationPermission === 'granted'
                ? 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={
              notificationPermission === 'granted'
                ? 'Push notifications enabled for completed items'
                : 'Enable notifications when items are checked'
            }
            aria-label="Toggle notifications"
          >
            {notificationPermission === 'granted' ? (
              <Bell className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
