import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Key, Palette, Bell, BellOff, BellRing, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { sheetMotion, backdropMotion } from '../utils/sheetMotion';
import { AppTheme } from '../hooks/useTheme';
import { RecentKeyEntry } from '../hooks/useGrocerySync';
import { SyncSettings } from './SyncSettings';
import { ThemeSettings } from './ThemeSettings';

type SettingsTab = 'sync' | 'theme' | 'alerts';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'sync', label: 'Sync', icon: <Key className="w-3.5 h-3.5" /> },
  { id: 'theme', label: 'Theme', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="w-3.5 h-3.5" /> },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Sync
  syncKey: string;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  recentKeys?: RecentKeyEntry[];
  onSwitchSyncKey: (newKey: string) => void;
  onGenerateNewKey: () => string;
  getShareUrl: () => string;
  // Theme
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  // Notifications
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
  notificationPermission,
  onRequestNotifications,
  ...syncProps
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sync');

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="settings-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            {...backdropMotion}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            id="settings-modal-backdrop"
          />

          {/* Sheet */}
          <motion.div
            {...sheetMotion}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 border border-zinc-100 dark:border-zinc-800 max-h-[90vh] flex flex-col"
            id="settings-modal"
          >
            <div className="px-6 pt-6 shrink-0">
              {/* Grab handle for mobile */}
              <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Settings</h3>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90 cursor-pointer"
                  aria-label="Close settings"
                  id="close-settings-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div role="tablist" className="flex p-1 mb-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" id="settings-tabs">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      id={`settings-tab-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        triggerHaptic(10);
                      }}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold tracking-tight rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="settings-tab-indicator"
                          className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-700 shadow-xs"
                          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        {tab.icon}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="px-6 pb-6 min-h-0 overflow-y-auto">
              <AutoHeight>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                  >
                    {activeTab === 'sync' && <SyncSettings onClose={onClose} {...syncProps} />}
                    {activeTab === 'theme' && <ThemeSettings theme={theme} onSelectTheme={onSelectTheme} />}
                    {activeTab === 'alerts' && (
                      <NotificationSettings
                        permission={notificationPermission}
                        onRequest={onRequestNotifications}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </AutoHeight>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Animates its height to follow its content, so switching tabs resizes the sheet smoothly
const AutoHeight: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={{ type: 'spring', damping: 34, stiffness: 380 }}
      style={{ overflow: 'hidden' }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
};

const NotificationSettings: React.FC<{
  permission: NotificationPermission;
  onRequest: () => void;
}> = ({ permission, onRequest }) => {
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  return (
    <div id="notification-settings">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-tight mb-3">
        Get a notification when your partner checks off an item.
      </p>

      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
          {permission === 'granted' ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {permission === 'granted' ? 'Notifications on' : 'Notifications off'}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400 tracking-tight">
            {!supported
              ? 'Not supported in this browser'
              : permission === 'denied'
                ? 'Blocked — allow them in your browser settings'
                : permission === 'granted'
                  ? 'Manage in your browser settings'
                  : 'Allowed on this device only'}
          </span>
        </div>
        {permission === 'granted' ? (
          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
        ) : (
          supported &&
          permission !== 'denied' && (
            <button
              type="button"
              id="enable-notifications-btn"
              onClick={onRequest}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Enable
            </button>
          )
        )}
      </div>
    </div>
  );
};
