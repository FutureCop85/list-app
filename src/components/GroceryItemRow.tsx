import React, { useState, useRef, useEffect } from 'react';
import { motion, Reorder, useDragControls } from 'motion/react';
import { Check } from 'lucide-react';
import { GroceryItem, UserList } from '../types';
import { triggerHaptic } from '../utils/audio';

const HOLD_DURATION = 500; // 500ms hold required to enable drag/drop

// Scroll lock helper to disable page scrolling on the window/document while reordering
const lockScroll = () => {
  if (typeof window === 'undefined') return () => {};

  const preventTouch = (e: TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const preventWheel = (e: WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const origBodyOverflow = document.body.style.overflow;
  const origHtmlOverflow = document.documentElement.style.overflow;
  const origBodyTouchAction = document.body.style.touchAction;
  const origBodyOverscroll = document.body.style.overscrollBehavior;

  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
  document.body.style.overscrollBehavior = 'none';

  window.addEventListener('touchmove', preventTouch, { passive: false });
  window.addEventListener('wheel', preventWheel, { passive: false });

  return () => {
    document.body.style.overflow = origBodyOverflow;
    document.documentElement.style.overflow = origHtmlOverflow;
    document.body.style.touchAction = origBodyTouchAction;
    document.body.style.overscrollBehavior = origBodyOverscroll;
    window.removeEventListener('touchmove', preventTouch);
    window.removeEventListener('wheel', preventWheel);
  };
};

export interface ActiveGroceryItemRowProps {
  item: GroceryItem;
  index: number;
  isFirst?: boolean;
  isLast?: boolean;
  isReordering?: boolean;
  otherLists?: UserList[];
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMoveToList?: (itemId: string, targetListId: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onReorderStart?: () => void;
  onReorderEnd?: () => void;
  onDragEnd?: () => void;
}

export const ActiveGroceryItemRow: React.FC<ActiveGroceryItemRowProps> = ({
  item,
  otherLists,
  onToggle,
  onEdit,
  onDelete,
  onMoveToList,
  onReorderStart,
  onReorderEnd,
  onDragEnd,
}) => {
  const dragControls = useDragControls();
  const [isEditing, setIsEditing] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hold timer, scroll unlocker & coordinates tracking
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const startCoordRef = useRef<{ x: number; y: number } | null>(null);
  const savedPointerEventRef = useRef<PointerEvent | React.PointerEvent | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Sync editText if item.text changes remotely
  useEffect(() => {
    setEditText(item.text);
  }, [item.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const releaseReorder = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    startCoordRef.current = null;
    if (unlockScrollRef.current) {
      unlockScrollRef.current();
      unlockScrollRef.current = null;
    }
    if (isHeld) {
      setIsHeld(false);
      onReorderEnd?.();
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (unlockScrollRef.current) {
        unlockScrollRef.current();
        unlockScrollRef.current = null;
      }
    };
  }, []);

  const handleFinishEdit = () => {
    setIsEditing(false);
    const trimmed = editText.trim();
    if (!trimmed) {
      // Clearing the text completely deletes the item cleanly without needing an icon
      onDelete(item.id);
    } else if (trimmed !== item.text) {
      onEdit(item.id, trimmed);
    } else {
      setEditText(item.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  // Hold down for 500ms to activate drag/drop
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    if (e.button !== 0) return;

    // Do not initiate hold if tapping on the toggle checkbox button
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }

    hasDraggedRef.current = false;
    startCoordRef.current = { x: e.clientX, y: e.clientY };
    savedPointerEventRef.current = e.nativeEvent || e;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = setTimeout(() => {
      setIsHeld(true);
      hasDraggedRef.current = true;
      triggerHaptic(40);

      // Disable page scrolling immediately so reordering and scrolling do not interfere
      if (unlockScrollRef.current) {
        unlockScrollRef.current();
      }
      unlockScrollRef.current = lockScroll();
      onReorderStart?.();

      if (savedPointerEventRef.current) {
        dragControls.start(savedPointerEventRef.current);
      }
    }, HOLD_DURATION);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startCoordRef.current || !holdTimerRef.current) return;
    const dx = Math.abs(e.clientX - startCoordRef.current.x);
    const dy = Math.abs(e.clientY - startCoordRef.current.y);

    // If finger moves before 500ms elapses, the user is scrolling - cancel hold
    if (dx > 8 || dy > 8) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      startCoordRef.current = null;
    }
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      data-reorder-item="true"
      onDragEnd={() => {
        releaseReorder();
        triggerHaptic(20);
        onDragEnd?.();
      }}
      whileDrag={{
        scale: 1.025,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
      }}
      className="relative rounded-xl my-1 select-none"
      id={`active-item-row-${item.id}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseReorder}
      onPointerCancel={releaseReorder}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        touchAction: isHeld ? 'none' : 'pan-y',
        WebkitTouchCallout: 'none',
      }}
    >
      <div
        className={`flex items-center px-3.5 py-3 rounded-xl border bg-white dark:bg-zinc-900 transition-all ${
          isHeld
            ? 'border-zinc-400 dark:border-zinc-500 shadow-md ring-2 ring-zinc-300 dark:ring-zinc-700 cursor-grabbing'
            : 'border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer'
        }`}
      >
        {/* Check Circle Button */}
        <button
          type="button"
          id={`toggle-btn-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-zinc-300 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 bg-white dark:bg-zinc-800 transition-all mr-3 cursor-pointer"
          aria-label="Mark complete"
        />

        {/* Text or Inline Editor - spans the row with no icons */}
        {isEditing ? (
          <div className="flex-1 flex flex-col min-w-0">
            <input
              ref={inputRef}
              id={`edit-input-${item.id}`}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={handleKeyDown}
              className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 rounded-lg text-sm font-medium tracking-tight focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            />
            {otherLists && otherLists.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
                  Move to:
                </span>
                {otherLists.map((targetList) => (
                  <button
                    key={targetList.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onMoveToList?.(item.id, targetList.id);
                      setIsEditing(false);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium tracking-tight transition-colors cursor-pointer"
                  >
                    {targetList.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex-1 min-w-0 py-0.5"
            onClick={() => {
              if (hasDraggedRef.current || isHeld) return;
              setIsEditing(true);
            }}
            title="Tap to edit, hold 500ms to reorder"
          >
            <span className="block text-sm text-zinc-800 dark:text-zinc-100 font-medium tracking-tight truncate">
              {item.text}
            </span>
          </div>
        )}
      </div>
    </Reorder.Item>
  );
};

export interface CompletedGroceryItemRowProps {
  item: GroceryItem;
  index: number;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export const CompletedGroceryItemRow: React.FC<CompletedGroceryItemRowProps> = ({
  item,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(item.text);
  }, [item.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleFinishEdit = () => {
    setIsEditing(false);
    const trimmed = editText.trim();
    if (!trimmed) {
      onDelete(item.id);
    } else if (trimmed !== item.text) {
      onEdit(item.id, trimmed);
    } else {
      setEditText(item.text);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0, margin: 0 }}
      layout
      className="relative rounded-xl my-1 select-none"
      id={`completed-item-${item.id}`}
    >
      <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-900/40 transition-colors">
        {/* Checked Circle Button */}
        <button
          type="button"
          id={`toggle-btn-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500 border border-emerald-500 dark:bg-emerald-400 dark:border-emerald-400 text-white dark:text-emerald-950 transition-all mr-3 cursor-pointer shadow-2xs"
          aria-label="Mark incomplete"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Text or Inline Editor - no icons */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishEdit();
              if (e.key === 'Escape') {
                setEditText(item.text);
                setIsEditing(false);
              }
            }}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-0.5 rounded text-sm font-medium tracking-tight focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
          />
        ) : (
          <div
            className="flex-1 min-w-0 py-0.5 cursor-text"
            onClick={() => setIsEditing(true)}
            title="Tap to edit"
          >
            <span className="block text-sm line-through text-zinc-400 dark:text-zinc-500 font-normal tracking-normal truncate">
              {item.text}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Backwards-compatible export
export interface GroceryItemRowProps extends ActiveGroceryItemRowProps {
  isReordering?: boolean;
  onStartReorder?: (id: string) => void;
  onEndReorder?: () => void;
  onDragMove?: (id: string, clientY: number) => void;
  setElementRef?: (id: string, el: HTMLDivElement | null) => void;
}

export const GroceryItemRow: React.FC<GroceryItemRowProps> = (props) => {
  if (props.item.completed) {
    return (
      <CompletedGroceryItemRow
        item={props.item}
        index={props.index}
        onToggle={props.onToggle}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />
    );
  }

  return <ActiveGroceryItemRow {...props} />;
};
