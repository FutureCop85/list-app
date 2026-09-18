import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Copy, Check, X, Sparkles, ArrowRight, Share2, History, ShieldCheck, User } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { RecentKeyEntry } from '../hooks/useGrocerySync';

interface SyncKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncKey: string;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  recentKeys?: RecentKeyEntry[];
  onSwitchSyncKey: (newKey: string) => void;
  onGenerateNewKey: () => string;
  getShareUrl: () => string;
}

export const SyncKeyModal: React.FC<SyncKeyModalProps> = ({
  isOpen,
  onClose,
  syncKey,
  userName = 'Partner',
  onUpdateUserName,
  recentKeys = [],
  onSwitchSyncKey,
  onGenerateNewKey,
  getShareUrl,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [joinError, setJoinError] = useState('');
  const [nameInput, setNameInput] = useState(userName);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNameInput(userName);
      setNameSaved(false);
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(syncKey);
      setCopiedKey(true);
      triggerHaptic(20);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      triggerHaptic(20);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 64);
    if (!clean) {
      setJoinError('Please enter a valid key');
      return;
    }
    setJoinError('');
    onSwitchSyncKey(clean);
    triggerHaptic(25);
    onClose();
  };

  const handleGenerateNew = () => {
    onGenerateNewKey();
    triggerHaptic(30);
    setInputKey('');
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim().slice(0, 30);
    if (trimmed && trimmed !== userName) {
      onUpdateUserName?.(trimmed);
      setNameSaved(true);
      triggerHaptic(20);
      setTimeout(() => setNameSaved(false), 2000);
    } else if (trimmed === userName) {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    }
  };

  const handleNameBlur = () => {
    handleSaveName();
  };

  const otherRecentKeys = recentKeys.filter((r) => r.key !== syncKey);

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
          id="sync-modal-backdrop"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.9 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl z-10 border border-zinc-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
          id="sync-key-modal"
        >
          {/* Grab handle for mobile */}
          <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Private Sync Key
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-tight">
                  Shared real-time list with your partner
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90 cursor-pointer"
              aria-label="Close modal"
              id="close-sync-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Key Card */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4 border border-zinc-200/70 dark:border-zinc-700/80 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Current List Key
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Protected &amp; Synced</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 select-all truncate">
                {syncKey}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  id="copy-key-btn"
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold tracking-tight bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy sync key"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share link button */}
            <button
              type="button"
              id="copy-link-btn"
              onClick={handleCopyLink}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
                  <span>Invite Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Partner Invite Link</span>
                </>
              )}
            </button>
          </div>

          {/* Your Display Name */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="user-name-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Your Name (shown to partner)</span>
              </label>
              {nameSaved && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Saved</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="user-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveName();
                  }
                }}
                placeholder="e.g. Alex"
                maxLength={24}
                className="flex-1 min-w-0 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-medium"
              />
              <button
                type="button"
                id="save-name-btn"
                onClick={handleSaveName}
                className="px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {nameSaved ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 stroke-[2.5]" /> : null}
                <span>{nameSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Recently Used Lists */}
          {otherRecentKeys.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Your Recent Lists
                </span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {otherRecentKeys.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      onSwitchSyncKey(r.key);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-left transition-colors cursor-pointer"
                  >
                    <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {r.key}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0 ml-2">
                      {r.itemCount} {r.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Join Partner's List */}
          <form onSubmit={handleJoin} className="mb-4">
            <label className="block text-xs font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 mb-1.5">
              Join another private list
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="join-key-input"
                placeholder="e.g. mint-leaf"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  if (joinError) setJoinError('');
                }}
                className="flex-1 min-w-0 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
              <button
                type="submit"
                id="submit-join-key-btn"
                disabled={!inputKey.trim()}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-xs font-semibold tracking-tight rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {joinError && (
              <p className="text-[11px] text-rose-500 mt-1">{joinError}</p>
            )}
          </form>

          {/* Create new private list */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              id="generate-new-key-btn"
              onClick={handleGenerateNew}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New two-word list</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium py-1 px-2"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
