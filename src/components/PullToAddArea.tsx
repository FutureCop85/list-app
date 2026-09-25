import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { Plus, ArrowDown, X } from 'lucide-react';
import { playPopSound, triggerHaptic } from '../utils/audio';
import { PastelPalette } from '../utils/pastels';

interface PullToAddAreaProps {
  onAddItem: (text: string) => void;
  onTriggerClear: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onTypingChange?: (isTyping: boolean) => void;
  isReordering?: boolean;
  isEmpty?: boolean;
  palette?: PastelPalette;
}

// Release past the threshold to add an item; keep holding to start the clear countdown
const ADD_GRACE_MS = 700;
const HOLD_DURATION_MS = 2000;
const PULL_THRESHOLD_PX = 55;
const DIRECTION_LOCK_PX = 8;

export const PullToAddArea: React.FC<PullToAddAreaProps> = ({
  onAddItem,
  onTriggerClear,
  containerRef,
  inputRef: externalInputRef,
  onTypingChange,
  isReordering = false,
  isEmpty = false,
  palette,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [newItemText, setNewItemText] = useState('');
  const addContainerRef = useRef<HTMLDivElement>(null);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = externalInputRef || internalInputRef;

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const directionLockedRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const holdStartTimeRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<any>(null);
  const hasTriggeredClearRef = useRef(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  pullDistanceRef.current = pullDistance;

  const resetPull = useCallback(() => {
    setIsPulling(false);
    setPullDistance(0);
    setHoldProgress(0);
    startYRef.current = null;
    directionLockedRef.current = false;
    holdStartTimeRef.current = null;
    hasTriggeredClearRef.current = false;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const handleStart = (clientX: number, clientY: number) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) return;

    startYRef.current = clientY;
    startXRef.current = clientX;
    directionLockedRef.current = false;
    setIsPulling(true);
    hasTriggeredClearRef.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (startYRef.current === null || hasTriggeredClearRef.current) return;

    const deltaY = clientY - startYRef.current;

    // Only commit to a pull once the gesture is clearly downward; bail on
    // horizontal swipes (list switching) and upward scrolls
    if (!directionLockedRef.current) {
      const deltaX = Math.abs(clientX - startXRef.current);
      if (deltaX < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) return;
      if (deltaY <= 0 || deltaX > deltaY) {
        resetPull();
        return;
      }
      directionLockedRef.current = true;
    }
    if (deltaY > 0) {
      const damped = Math.min(120, Math.pow(deltaY, 0.82) * 1.8);
      setPullDistance(damped);

      if (damped >= PULL_THRESHOLD_PX) {
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = Date.now();
          triggerHaptic(15);

          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = setInterval(() => {
            if (!holdStartTimeRef.current) return;
            const elapsed = Date.now() - holdStartTimeRef.current - ADD_GRACE_MS;
            const progress = Math.max(0, Math.min(1, elapsed / HOLD_DURATION_MS));
            setHoldProgress(progress);

            if (progress >= 1 && !hasTriggeredClearRef.current) {
              hasTriggeredClearRef.current = true;
              clearInterval(holdIntervalRef.current);
              triggerHaptic(60);
              playPopSound();
              resetPull();
              onTriggerClear();
            }
          }, 40);
        }
      } else {
        if (holdStartTimeRef.current) {
          holdStartTimeRef.current = null;
          setHoldProgress(0);
          if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
          }
        }
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleEnd = () => {
    if (hasTriggeredClearRef.current) {
      resetPull();
      return;
    }

    if (pullDistanceRef.current >= PULL_THRESHOLD_PX) {
      triggerHaptic(20);
      activeInputRef.current?.focus();
      activeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (addContainerRef.current) {
        animate(addContainerRef.current, { scale: [0.96, 1] }, { type: 'spring', damping: 12, stiffness: 400 });
      }
    }

    resetPull();
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isReordering) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, button')) return;

      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isReordering) return;
      if (startYRef.current !== null && e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
        if (directionLockedRef.current && e.touches[0].clientY > startYRef.current) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (startYRef.current !== null) {
        handleEnd();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isReordering) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, button')) return;
      if (e.button === 0) {
        handleStart(e.clientX, e.clientY);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isReordering) return;
      if (startYRef.current !== null) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const onMouseUp = () => {
      if (startYRef.current !== null) {
        handleEnd();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);

      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [containerRef, handleEnd, handleMove, handleStart]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewItemText(val);

    if (onTypingChange) {
      onTypingChange(val.trim().length > 0);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (val.trim().length > 0) {
        typingTimerRef.current = setTimeout(() => {
          onTypingChange(false);
        }, 2200);
      }
    }
  };

  const handleInputBlur = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onTypingChange?.(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (trimmed) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTypingChange?.(false);
      onAddItem(trimmed);
      playPopSound();
      setNewItemText('');
      activeInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTypingChange?.(false);
      setNewItemText('');
      activeInputRef.current?.blur();
    }
  };

  const ringRadius = 13;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - holdProgress * circumference;

  // Visible gap above the add bar is twice the gap below it. Top margin compensates
  // for the rows' my-1 below and the tab bar's py-1.5 above: 2 × (1rem + 0.25rem) − 0.375rem
  return (
    <div className="w-full relative z-20 mt-[2.125rem] mb-4">
      {/* Elastic pull-down indicator (visible while dragging down) */}
      <AnimatePresence>
        {isPulling && pullDistance > 10 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: pullDistance, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full overflow-hidden flex flex-col items-center justify-center pointer-events-none mb-1"
            id="pull-down-indicator"
          >
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100 text-xs font-medium shadow-md border border-transparent dark:border-zinc-700">
              {pullDistance >= PULL_THRESHOLD_PX && holdProgress > 0 ? (
                <>
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <svg className="w-6 h-6 -rotate-90">
                      <circle
                        cx="12"
                        cy="12"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="transparent"
                        className="text-zinc-700 dark:text-zinc-600"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="text-rose-400 transition-all duration-75"
                      />
                    </svg>
                    <span className="absolute text-[9px] font-mono font-bold text-white dark:text-zinc-100">
                      {Math.ceil((1 - holdProgress) * 2)}s
                    </span>
                  </div>
                  <span className="font-medium tracking-tight">Keep holding to clear list…</span>
                </>
              ) : pullDistance >= PULL_THRESHOLD_PX ? (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                  <span className="font-medium tracking-tight">Release to add an item</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-400 animate-bounce" />
                  <span className="font-medium tracking-tight">Pull down to add an item</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directly Editable Add Item Field */}
      <div
        ref={addContainerRef}
        className={`w-full rounded-xl transition-colors duration-200 ${
          isEmpty ? 'border border-dashed border-zinc-300 dark:border-zinc-700' : 'border border-transparent'
        }`}
        id="direct-add-container"
      >
        <form
          onSubmit={handleSubmit}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all duration-150 ${
            isEmpty
              ? 'bg-transparent border-transparent'
              : 'bg-white dark:bg-zinc-900 shadow-xs'
          } ${
            palette
              ? `border-zinc-200/90 dark:border-zinc-800 focus-within:${palette.accentBorder} focus-within:ring-2 focus-within:ring-offset-0`
              : 'border-zinc-200/90 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-900/5'
          }`}
          style={palette ? { ['--tw-ring-color' as any]: palette.dotColor + '55' } : undefined}
        >
          <input
            ref={activeInputRef}
            id="new-item-input"
            type="text"
            value={newItemText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add an item..."
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-medium tracking-tight focus:outline-hidden"
          />

          {newItemText && (
            <button
              type="button"
              id="clear-input-btn"
              onClick={() => {
                setNewItemText('');
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                onTypingChange?.(false);
                activeInputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full transition-colors"
              aria-label="Clear input text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            id="submit-item-btn"
            disabled={!newItemText.trim()}
            className={`px-3.5 py-1.5 text-xs font-bold tracking-tight rounded-lg transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer shadow-xs disabled:opacity-30 ${
              palette
                ? `${palette.tabActiveBg} ${palette.tabActiveText} hover:brightness-95 active:brightness-90 disabled:hover:brightness-100`
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>

        {/* Empty state, folded into the add bar */}
        <AnimatePresence initial={false}>
          {isEmpty && (
            <motion.button
              type="button"
              key="empty-hint"
              id="empty-list-state"
              onClick={() => activeInputRef.current?.focus()}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full overflow-hidden text-left cursor-text"
            >
              <div className="mx-3.5 py-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500 select-none">
                Nothing here yet. Type above, or pull down anywhere to add an item.
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
