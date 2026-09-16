import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Share2, Trash2, Check, Copy, AlertTriangle } from 'lucide-react';
import { UserList } from '../types';
import { triggerHaptic } from '../utils/audio';
import { PASTEL_ORDER, PASTEL_PALETTES, PastelColorId } from '../utils/pastels';

interface ListOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: UserList | null;
  sessionKey?: string;
  canDelete: boolean;
  itemCount: number;
  onRenameList: (id: string, newName: string) => void;
  onDeleteList: (id: string) => void;
  onUpdateColor?: (id: string, color: string) => void;
  getShareUrl: (list?: UserList) => string;
}

export const ListOptionsModal: React.FC<ListOptionsModalProps> = ({
  isOpen,
  onClose,
  list,
  sessionKey,
  canDelete,
  itemCount,
  onRenameList,
  onDeleteList,
  onUpdateColor,
  getShareUrl,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && list) {
      setNameInput(list.name);
      setIsRenaming(false);
      setShowDeleteConfirm(false);
      setCopied(false);
    }
  }, [isOpen, list]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  if (!isOpen || !list) return null;

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== list.name) {
      onRenameList(list.id, trimmed);
      triggerHaptic(20);
    }
    setIsRenaming(false);
  };

  const handleCopyShare = async () => {
    try {
      const url = getShareUrl(list);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      triggerHaptic(20);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDelete = () => {
    if (!canDelete) return;
    if (!showDeleteConfirm && itemCount > 0) {
      setShowDeleteConfirm(true);
      triggerHaptic(25);
      return;
    }
    onDeleteList(list.id);
    triggerHaptic(30);
    onClose();
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
          id="list-options-backdrop"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col p-6"
          id="list-options-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0 pr-2">
              {isRenaming ? (
                <form onSubmit={handleSaveRename} className="flex items-center gap-2">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => handleSaveRename()}
                    maxLength={40}
                    className="w-full px-2.5 py-1 text-base font-semibold tracking-tight rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0 cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                    {list.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(true)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Rename list"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="block text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 tracking-tight">
                Session: <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400">{sessionKey || list.syncKey}</span> &bull; {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              type="button"
              id="close-list-options-btn"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions List */}
          <div className="space-y-2 mt-2">
            {/* Color Accent Picker */}
            <div className="px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50">
              <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                List Color Accent
              </span>
              <div className="flex items-center gap-2.5">
                {PASTEL_ORDER.map((cId) => {
                  const p = PASTEL_PALETTES[cId];
                  const isSelected = (list.color || 'sand') === cId;
                  return (
                    <button
                      key={cId}
                      type="button"
                      onClick={() => {
                        onUpdateColor?.(list.id, cId);
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-zinc-800 dark:ring-zinc-200 scale-110 shadow-xs'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: p.dotColor }}
                      title={p.label}
                      aria-label={`Change color to ${p.label}`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-800 stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rename Button if not already in renaming mode */}
            {!isRenaming && (
              <button
                type="button"
                id="rename-list-btn"
                onClick={() => setIsRenaming(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 text-xs font-medium tracking-tight transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-4 h-4 text-zinc-500" />
                  <span>Rename Checklist</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">Edit</span>
              </button>
            )}

            {/* Share List Link */}
            <button
              type="button"
              id="share-list-btn"
              onClick={handleCopyShare}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 text-xs font-medium tracking-tight transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-zinc-500" />
                <span>Share "{list.name}" Link</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </div>
            </button>

            {/* Delete List Option */}
            {canDelete && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                {showDeleteConfirm ? (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Delete "{list.name}"?</span>
                    </div>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 leading-relaxed">
                      This will remove the list and its {itemCount} {itemCount === 1 ? 'item' : 'items'}.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        id="confirm-delete-list-btn"
                        onClick={handleDelete}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Delete List
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="trigger-delete-list-btn"
                    onClick={handleDelete}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Delete Checklist</span>
                    </div>
                    <span className="text-[11px] text-rose-500/80">Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
