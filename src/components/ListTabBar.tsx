import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { UserList } from '../types';
import { getColorForList } from '../utils/pastels';

interface ListTabBarProps {
  lists: UserList[];
  activeListId: string;
  listCounts: Record<string, number>;
  onSwitchList: (id: string) => void;
  onOpenCreateList: () => void;
  onOpenListOptions: (list: UserList) => void;
}

export const ListTabBar: React.FC<ListTabBarProps> = ({
  lists,
  activeListId,
  listCounts,
  onSwitchList,
  onOpenCreateList,
  onOpenListOptions,
}) => {
  const navRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = navRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    const timer = setTimeout(checkScroll, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [checkScroll, lists]);

  // Keep active list tab centered into view smoothly when active list changes
  useEffect(() => {
    const activeEl = document.getElementById(`tab-list-${activeListId}`);
    if (activeEl && navRef.current) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      const timer = setTimeout(checkScroll, 350);
      return () => clearTimeout(timer);
    }
  }, [activeListId, checkScroll]);

  // Dynamic CSS alpha mask for edge cross fade
  const maskStyle: React.CSSProperties = useMemo(() => {
    if (canScrollLeft && canScrollRight) {
      return {
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
      };
    }
    if (canScrollRight) {
      return {
        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)',
        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)',
      };
    }
    if (canScrollLeft) {
      return {
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28px, black 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 28px, black 100%)',
      };
    }
    return {};
  }, [canScrollLeft, canScrollRight]);

  return (
    <div className="relative w-full mb-2">
      {/* Left cross-fade gradient overlay */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-100/95 dark:from-zinc-950/95 via-zinc-100/50 dark:via-zinc-950/50 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Right cross-fade gradient overlay */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-100/95 dark:from-zinc-950/95 via-zinc-100/50 dark:via-zinc-950/50 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      <nav
        ref={navRef}
        id="list-tab-bar"
        aria-label="Grocery Lists"
        onScroll={checkScroll}
        style={maskStyle}
        className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 select-none scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {lists.map((list, index) => {
          const isActive = list.id === activeListId;
          const count = listCounts[list.id] ?? 0;
          const palette = getColorForList(list, index);

          if (isActive) {
            return (
              <div
                key={list.id}
                id={`tab-list-${list.id}`}
                className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight shadow-xs shrink-0 transition-all cursor-default ${palette.tabActiveBg} ${palette.tabActiveText}`}
              >
                <span className="truncate max-w-[150px]">{list.name}</span>

                {count > 0 && (
                  <span
                    id={`tab-badge-${list.id}`}
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${palette.tabActiveBadgeBg} ${palette.tabActiveBadgeText}`}
                  >
                    {count}
                  </span>
                )}

                <button
                  type="button"
                  id={`tab-options-btn-${list.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenListOptions(list);
                  }}
                  className={`p-0.5 -mr-1 rounded-full transition-colors cursor-pointer ${palette.tabActiveMenuBtn}`}
                  title={`Manage "${list.name}"`}
                  aria-label={`Options for ${list.name}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={list.id}
              type="button"
              id={`tab-list-${list.id}`}
              onClick={() => onSwitchList(list.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-tight shrink-0 transition-all cursor-pointer ${palette.tabInactiveBg} ${palette.tabInactiveText} hover:brightness-95 dark:hover:brightness-110 active:scale-98`}
              title={`Switch to ${list.name}`}
            >
              <span className="truncate max-w-[150px]">{list.name}</span>

              {count > 0 && (
                <span
                  id={`tab-badge-${list.id}`}
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium tabular-nums ${palette.tabInactiveBadgeBg} ${palette.tabInactiveBadgeText}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Add New List Button */}
        <button
          type="button"
          id="add-new-list-tab-btn"
          onClick={onOpenCreateList}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold tracking-tight shrink-0 transition-all cursor-pointer active:scale-95"
          title="Create a new checklist"
          aria-label="Add new list"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span className="text-[11px]">New List</span>
        </button>
      </nav>
    </div>
  );
};
