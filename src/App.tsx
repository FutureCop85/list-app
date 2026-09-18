import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { CheckSquare, ChevronDown, CheckCheck } from 'lucide-react';
import { useGrocerySync } from './hooks/useGrocerySync';
import { useSystemTheme } from './hooks/useSystemTheme';
import { Header } from './components/Header';
import { ListTabBar } from './components/ListTabBar';
import { CreateListModal } from './components/CreateListModal';
import { ListOptionsModal } from './components/ListOptionsModal';
import { ActiveGroceryItemRow, CompletedGroceryItemRow } from './components/GroceryItemRow';
import { PullToAddArea } from './components/PullToAddArea';
import { ClearListModal } from './components/ClearListModal';
import { SyncKeyModal } from './components/SyncKeyModal';
import { NotificationToast } from './components/NotificationToast';
import { Footer } from './components/Footer';
import { GroceryItem, UserList } from './types';
import { getColorForList, PASTEL_PALETTES } from './utils/pastels';

export default function App() {
  // Sync OS theme automatically
  useSystemTheme();

  const {
    items,
    syncKey,
    userName,
    updateUserName,
    recentKeys,
    switchSyncKey,
    generateNewSyncKey,
    getShareUrl,
    syncStatus,
    partnerActive,
    partnerName,
    partnerTyping,
    broadcastTyping,
    notificationPermission,
    requestNotifications,
    latestToast,
    dismissToast,
    addItem,
    toggleItem,
    editItem,
    deleteItem,
    reorderItems,
    clearList,
    // Multiple lists
    lists,
    activeList,
    activeListId,
    listCounts,
    switchList,
    createList,
    renameList,
    updateListColor,
    deleteList,
    moveItemToList,
  } = useGrocerySync();

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [optionsList, setOptionsList] = useState<UserList | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const otherLists = useMemo(() => lists.filter((l) => l.id !== activeListId), [lists, activeListId]);

  const activePalette = useMemo(() => {
    if (activeList) {
      const activeIndex = lists.findIndex((l) => l.id === activeListId);
      return getColorForList(activeList, Math.max(0, activeIndex));
    }
    return PASTEL_PALETTES.mint;
  }, [activeList, lists, activeListId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Register service worker and aggressively check for updates when app is opened or resumed
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for updates on load
        reg.update().catch(() => {});

        // Check for updates when coming back from background or switching apps
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        };

        document.addEventListener('visibilitychange', checkForUpdate);
        window.addEventListener('focus', checkForUpdate);

        return () => {
          document.removeEventListener('visibilitychange', checkForUpdate);
          window.removeEventListener('focus', checkForUpdate);
        };
      })
      .catch((err) => {
        console.warn('Service worker registration note:', err);
      });
  }, []);

  const completedItems = useMemo(() => items.filter((item) => item.completed), [items]);
  const activeItemsFromSync = useMemo(() => items.filter((item) => !item.completed), [items]);

  // Local active items for silky-smooth 60fps reordering without premature sync triggers
  const [activeItems, setActiveItems] = useState<GroceryItem[]>(activeItemsFromSync);
  const [isReordering, setIsReordering] = useState(false);
  const isDraggingRef = useRef(false);
  const activeItemsRef = useRef(activeItems);
  activeItemsRef.current = activeItems;

  const handleReorderStart = useCallback(() => {
    isDraggingRef.current = true;
    setIsReordering(true);
  }, []);

  const handleReorderEnd = useCallback(() => {
    setIsReordering(false);
    isDraggingRef.current = false;
  }, []);

  // Sync local active items whenever external/sync items change (unless user is currently dragging)
  useEffect(() => {
    if (!isDraggingRef.current && !isReordering) {
      setActiveItems(activeItemsFromSync);
    }
  }, [activeItemsFromSync, isReordering]);

  const handleReorder = (newOrder: GroceryItem[]) => {
    isDraggingRef.current = true;
    setActiveItems(newOrder);
    activeItemsRef.current = newOrder;
  };

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsReordering(false);
    // Commit the complete list (active + completed) to persistence and sync
    const currentCompleted = items.filter((i) => i.completed);
    reorderItems([...activeItemsRef.current, ...currentCompleted]);
  }, [items, reorderItems]);

  // Reordering handlers for tap-to-move accessibility
  const handleMoveUp = useCallback((id: string) => {
    const current = [...activeItemsRef.current];
    const idx = current.findIndex((i) => i.id === id);
    if (idx > 0) {
      const [moved] = current.splice(idx, 1);
      current.splice(idx - 1, 0, moved);
      setActiveItems(current);
      activeItemsRef.current = current;
      const currentCompleted = items.filter((i) => i.completed);
      reorderItems([...current, ...currentCompleted]);
    }
  }, [items, reorderItems]);

  const handleMoveDown = useCallback((id: string) => {
    const current = [...activeItemsRef.current];
    const idx = current.findIndex((i) => i.id === id);
    if (idx >= 0 && idx < current.length - 1) {
      const [moved] = current.splice(idx, 1);
      current.splice(idx + 1, 0, moved);
      setActiveItems(current);
      activeItemsRef.current = current;
      const currentCompleted = items.filter((i) => i.completed);
      reorderItems([...current, ...currentCompleted]);
    }
  }, [items, reorderItems]);

  const handleEmptyStateClick = () => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Track swipe direction for smooth list transitions
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const prevIndexRef = useRef(0);

  useEffect(() => {
    const currentIndex = lists.findIndex((l) => l.id === activeListId);
    if (currentIndex !== -1) {
      setSlideDir(currentIndex >= prevIndexRef.current ? 'left' : 'right');
      prevIndexRef.current = currentIndex;
    }
  }, [activeListId, lists]);

  // Touch gesture to swipe horizontally between lists
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isReordering || lists.length <= 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, button')) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [isReordering, lists.length]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isReordering || lists.length <= 1) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Must be a deliberate horizontal swipe:
    // Min 50px distance, predominantly horizontal (dx > 1.35x dy), under 600ms
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.35 && deltaTime < 600) {
      const currentIndex = lists.findIndex((l) => l.id === activeListId);
      if (currentIndex === -1) return;

      if (diffX < 0) {
        // Swiped Left -> Move to Next List
        if (currentIndex < lists.length - 1) {
          const nextList = lists[currentIndex + 1];
          switchList(nextList.id);
        }
      } else {
        // Swiped Right -> Move to Previous List
        if (currentIndex > 0) {
          const prevList = lists[currentIndex - 1];
          switchList(prevList.id);
        }
      }
    }
  }, [isReordering, lists, activeListId, switchList]);

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900 transition-colors duration-150 relative overflow-x-hidden">
      {/* Dynamic Ambient Pastel Glow from active list palette */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-56 opacity-30 dark:opacity-20 blur-3xl transition-all duration-500 -z-10"
        style={{ background: `radial-gradient(circle at 50% 0%, ${activePalette.dotColor}, transparent 70%)` }}
        aria-hidden="true"
      />

      {/* Real-time Partner Task Notification Toast */}
      <NotificationToast toast={latestToast} onDismiss={dismissToast} />

      {/* Sticky Header with Live Status, Sync Key & Notifications */}
      <Header
        syncStatus={syncStatus}
        partnerActive={partnerActive}
        partnerName={partnerName}
        notificationPermission={notificationPermission}
        onRequestNotifications={requestNotifications}
        itemCount={items.length}
        completedCount={completedItems.length}
        syncKey={syncKey}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        palette={activePalette}
      />

      {/* Main List Container with horizontal swipe gesture between lists */}
      <main
        ref={containerRef}
        id="checklist-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full max-w-md mx-auto px-4 pt-2 flex flex-col"
      >
        {/* Multi-List Switcher Tab Bar */}
        <ListTabBar
          lists={lists}
          activeListId={activeListId}
          listCounts={listCounts}
          onSwitchList={switchList}
          onOpenCreateList={() => setIsCreateListModalOpen(true)}
          onOpenListOptions={(targetList) => setOptionsList(targetList)}
        />

        {/* Directly Editable Add Area with Real-time Typing Indicator */}
        <PullToAddArea
          onAddItem={addItem}
          onTriggerClear={() => setIsClearModalOpen(true)}
          containerRef={containerRef}
          inputRef={inputRef}
          onTypingChange={broadcastTyping}
          partnerTyping={partnerTyping}
          isReordering={isReordering}
          palette={activePalette}
        />

        {/* Active List Content Area with Smooth Slide & Cross-fade Transition */}
        <motion.div
          key={activeListId}
          initial={{ opacity: 0.6, x: slideDir === 'left' ? 14 : -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex-1 flex flex-col"
        >
          {/* Empty State */}
          {items.length === 0 && (
            <div
              id="empty-list-state"
              onClick={handleEmptyStateClick}
              className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 cursor-pointer select-none"
            >
              <div
                className="w-14 h-14 rounded-2xl bg-white border border-dashed border-white shadow-sm flex items-center justify-center mb-4 transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: '1px',
                  borderStyle: 'dashed',
                  borderColor: '#ffffff',
                }}
              >
                <CheckSquare
                  className="w-7 h-7 stroke-[1.8] text-zinc-400"
                  style={{
                    borderStyle: 'dashed',
                    backgroundColor: '#ffffff',
                    borderColor: '#ffffff',
                  }}
                />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-serif italic tracking-normal font-medium text-[#ffc79f]"
                style={{ color: '#ffc79f' }}
              >
                Checklist is empty
              </h2>
              <p
                className="text-xs font-sans text-white max-w-xs mt-2 leading-relaxed"
                style={{ color: '#ffffff' }}
              >
                Type an item above to add it. Pull down &amp; hold for 2 seconds to clear.
              </p>
            </div>
          )}

          {/* Active Items Section with Smooth Reordering */}
          <Reorder.Group
            axis="y"
            values={activeItems}
            onReorder={handleReorder}
            className="flex flex-col"
            id="active-items-list"
            style={{
              touchAction: isReordering ? 'none' : 'auto',
            }}
          >
            {activeItems.map((item, index) => (
              <ActiveGroceryItemRow
                key={item.id}
                item={item}
                index={index}
                isReordering={isReordering}
                otherLists={otherLists}
                onToggle={toggleItem}
                onEdit={editItem}
                onDelete={deleteItem}
                onMoveToList={moveItemToList}
                onReorderStart={handleReorderStart}
                onReorderEnd={handleReorderEnd}
                onDragEnd={handleDragEnd}
              />
            ))}
          </Reorder.Group>

          {/* Completed Items Section */}
          {completedItems.length > 0 && (
            <div className="mt-6 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80" id="completed-items-section">
              <button
                id="toggle-completed-visibility-btn"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center justify-between w-full text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 mb-2 py-1 select-none transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Completed <span className="tabular-nums">({completedItems.length})</span></span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showCompleted ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {showCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {completedItems.map((item, index) => (
                      <CompletedGroceryItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onToggle={toggleItem}
                        onEdit={editItem}
                        onDelete={deleteItem}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Minimalist footnote */}
        <div className="mt-8 text-center text-[11px] text-zinc-400 dark:text-zinc-500 select-none">
          <span>{lists.length > 1 ? 'Swipe left/right to switch lists • ' : ''}Hold to reorder • Pull down to clear</span>
        </div>

        {/* App Footer with yymmdd Version */}
        <Footer />
      </main>

      {/* 2-Second Hold Clear Prompt Modal */}
      <ClearListModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onClearCompleted={() => clearList('completed')}
        onClearAll={() => clearList('all')}
        completedCount={completedItems.length}
        totalCount={items.length}
      />

      {/* Private Sync Key Modal */}
      <SyncKeyModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncKey={syncKey}
        userName={userName}
        onUpdateUserName={updateUserName}
        recentKeys={recentKeys}
        onSwitchSyncKey={switchSyncKey}
        onGenerateNewKey={generateNewSyncKey}
        getShareUrl={getShareUrl}
      />

      {/* Create New List Modal */}
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreateList={createList}
      />

      {/* List Options & Management Modal */}
      <ListOptionsModal
        isOpen={Boolean(optionsList)}
        onClose={() => setOptionsList(null)}
        list={optionsList}
        sessionKey={syncKey}
        canDelete={lists.length > 1}
        itemCount={optionsList ? (listCounts[optionsList.id] ?? 0) : 0}
        onRenameList={renameList}
        onUpdateColor={updateListColor}
        onDeleteList={deleteList}
        getShareUrl={getShareUrl}
      />
    </div>
  );
}
