import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GroceryItem, SyncStatus, WSEvent, UserList } from '../types';
import { playCompleteSound, triggerHaptic } from '../utils/audio';
import { mergeLists, mergeUserLists } from '../utils/syncMerge';
import { generateFourLetterSyncKey } from '../utils/words';

function sanitizeKey(key?: string): string {
  if (!key) return 'mint-leaf';
  const clean = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').slice(0, 64);
  return clean || 'mint-leaf';
}

function getInitialSyncKey(): string {
  if (typeof window === 'undefined') return 'mint-leaf';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('key') || params.get('list');
    if (urlKey) {
      const sanitized = sanitizeKey(urlKey);
      localStorage.setItem('checklist_sync_key', sanitized);
      return sanitized;
    }
    const stored = localStorage.getItem('checklist_sync_key');
    if (stored) {
      return sanitizeKey(stored);
    }
  } catch {}

  const generated = generateFourLetterSyncKey();
  try {
    localStorage.setItem('checklist_sync_key', generated);
  } catch {}
  return generated;
}

function getStoredUserName(): string {
  if (typeof window === 'undefined') return 'Partner';
  try {
    return localStorage.getItem('checklist_user_name') || 'Partner';
  } catch {
    return 'Partner';
  }
}

function getClientId(): string {
  if (typeof window === 'undefined') return 'client-0';
  let id = sessionStorage.getItem('checklist_client_id');
  if (!id) {
    id = 'client-' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('checklist_client_id', id);
  }
  return id;
}

function getCachedLists(syncKey: string): UserList[] {
  if (typeof window === 'undefined') return [{ id: 'list-default', name: 'Groceries', createdAt: Date.now() }];
  try {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name');

    const stored = localStorage.getItem(`checklist_lists_${syncKey}`);
    let lists: UserList[] = [];
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lists = parsed;
      }
    }

    // Migrate from legacy single-list or old multi-list storage if empty
    if (lists.length === 0) {
      const oldStored = localStorage.getItem('checklist_user_lists');
      if (oldStored) {
        const parsedOld = JSON.parse(oldStored);
        if (Array.isArray(parsedOld) && parsedOld.length > 0) {
          lists = parsedOld.map((l: any) => ({
            id: l.id || `list-${l.name?.toLowerCase().replace(/\s+/g, '-')}`,
            name: l.name || 'Groceries',
            createdAt: l.createdAt || Date.now(),
            updatedAt: l.updatedAt || Date.now(),
          }));
        }
      }
    }

    if (lists.length === 0) {
      const initialName = urlName?.trim() || 'Groceries';
      lists = [
        {
          id: 'list-default',
          name: initialName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      localStorage.setItem(`checklist_lists_${syncKey}`, JSON.stringify(lists));
    }

    // If a shared link specifies a list name that doesn't exist yet in the session, add it
    if (urlName) {
      const exists = lists.some((l) => l.name.toLowerCase() === urlName.toLowerCase().trim());
      if (!exists) {
        lists.push({
          id: `list-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: urlName.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        localStorage.setItem(`checklist_lists_${syncKey}`, JSON.stringify(lists));
      }
    }

    return lists;
  } catch {
    return [{ id: 'list-default', name: 'Groceries', createdAt: Date.now() }];
  }
}

function getCachedListTombstones(syncKey: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(`checklist_list_tombstones_${syncKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function getStoredActiveListId(syncKey: string, lists: UserList[]): string {
  if (typeof window === 'undefined' || lists.length === 0) return lists[0]?.id || 'list-default';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name');
    if (urlName) {
      const match = lists.find((l) => l.name.toLowerCase() === urlName.toLowerCase().trim());
      if (match) return match.id;
    }

    const storedActiveId = localStorage.getItem(`checklist_active_list_id_${syncKey}`);
    if (storedActiveId) {
      const match = lists.find((l) => l.id === storedActiveId);
      if (match) return match.id;
    }
  } catch {}

  return lists[0].id;
}

function getCachedItems(key: string): GroceryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(`checklist_items_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function getCachedTombstones(key: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(`checklist_tombstones_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function getCachedClearedAt(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const cached = localStorage.getItem(`checklist_cleared_${key}`);
    if (cached) {
      const num = parseInt(cached, 10);
      if (!isNaN(num)) return num;
    }
  } catch {}
  return 0;
}

export interface RecentKeyEntry {
  key: string;
  itemCount: number;
  lastAccessed: number;
}

function getRecentKeys(): RecentKeyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('checklist_recent_keys');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveRecentKey(key: string, itemCount: number) {
  if (typeof window === 'undefined') return;
  try {
    const recents = getRecentKeys().filter((r) => r.key !== key);
    recents.unshift({
      key,
      itemCount,
      lastAccessed: Date.now(),
    });
    localStorage.setItem('checklist_recent_keys', JSON.stringify(recents.slice(0, 8)));
  } catch {}
}

export function useGrocerySync() {
  const clientId = useRef<string>(getClientId());
  const [userName, setUserNameState] = useState<string>(getStoredUserName);
  const userNameRef = useRef<string>(userName);
  userNameRef.current = userName;

  const [syncKey, setSyncKeyState] = useState<string>(getInitialSyncKey);
  const syncKeyRef = useRef<string>(syncKey);
  syncKeyRef.current = syncKey;

  // Multi-list session state
  const [lists, setLists] = useState<UserList[]>(() => getCachedLists(syncKey));
  const listsRef = useRef<UserList[]>(lists);
  listsRef.current = lists;

  const listTombstonesRef = useRef<Record<string, number>>(getCachedListTombstones(syncKey));

  const [activeListId, setActiveListId] = useState<string>(() =>
    getStoredActiveListId(syncKey, lists)
  );
  const activeListIdRef = useRef<string>(activeListId);
  activeListIdRef.current = activeListId;

  // All items across all lists in this session
  const [allItems, setAllItems] = useState<GroceryItem[]>(() => getCachedItems(syncKey));
  const allItemsRef = useRef<GroceryItem[]>(allItems);
  allItemsRef.current = allItems;

  const tombstonesRef = useRef<Record<string, number>>(getCachedTombstones(syncKey));
  const lastClearedAtRef = useRef<number>(getCachedClearedAt(syncKey));

  const [recentKeys, setRecentKeys] = useState<RecentKeyEntry[]>(getRecentKeys);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [partnerActive, setPartnerActive] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('Partner');
  const [partnerTyping, setPartnerTyping] = useState<{ isTyping: boolean; name: string } | null>(null);
  const typingResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [latestToast, setLatestToast] = useState<{
    id: string;
    message: string;
    timestamp: number;
    undoAction?: () => void;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const activeList = useMemo(() => {
    return (
      lists.find((l) => l.id === activeListId) ||
      lists[0] || {
        id: 'list-default',
        name: 'Groceries',
        createdAt: Date.now(),
      }
    );
  }, [lists, activeListId]);

  // Expose items for the currently active list
  const items = useMemo(() => {
    const defaultId = lists[0]?.id || 'list-default';
    const currentId = activeList?.id || defaultId;
    return allItems.filter((i) => (i.listId || defaultId) === currentId);
  }, [allItems, activeList?.id, lists]);

  // Compute uncompleted item counts across all lists in the session
  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const defaultId = lists[0]?.id || 'list-default';
    lists.forEach((l) => {
      counts[l.id] = allItems.filter(
        (i) => (i.listId || defaultId) === l.id && !i.completed && !i.deleted
      ).length;
    });
    return counts;
  }, [lists, allItems]);

  // Keep URL search params in sync with session syncKey and active list name
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.get('key') !== syncKey) {
        url.searchParams.set('key', syncKey);
        changed = true;
      }
      if (activeList?.name && url.searchParams.get('name') !== activeList.name) {
        url.searchParams.set('name', activeList.name);
        changed = true;
      }
      if (url.searchParams.has('list')) {
        url.searchParams.delete('list');
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, [syncKey, activeList?.name]);

  // Persist session state to local cache
  const persistState = useCallback(
    (
      key: string,
      currentLists: UserList[],
      listTombstones: Record<string, number>,
      newItems: GroceryItem[],
      tombstones: Record<string, number>,
      lastClearedAt: number
    ) => {
      try {
        localStorage.setItem(`checklist_lists_${key}`, JSON.stringify(currentLists));
        localStorage.setItem(`checklist_list_tombstones_${key}`, JSON.stringify(listTombstones));
        localStorage.setItem(`checklist_items_${key}`, JSON.stringify(newItems));
        localStorage.setItem(`checklist_tombstones_${key}`, JSON.stringify(tombstones));
        localStorage.setItem(`checklist_cleared_${key}`, lastClearedAt.toString());

        localStorage.setItem(
          `checklist_backup_${key}`,
          JSON.stringify({
            lists: currentLists,
            items: newItems,
            timestamp: Date.now(),
          })
        );

        saveRecentKey(key, newItems.length);
        setRecentKeys(getRecentKeys());
      } catch (e) {
        console.error('Failed to cache session list state', e);
      }
    },
    []
  );

  const getPendingQueue = useCallback((key: string): any[] => {
    try {
      const q = localStorage.getItem(`checklist_pending_${key}`);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }, []);

  const savePendingQueue = useCallback((key: string, queue: any[]) => {
    try {
      localStorage.setItem(`checklist_pending_${key}`, JSON.stringify(queue));
    } catch {}
  }, []);

  const sendEvent = useCallback(
    (event: WSEvent) => {
      const currentKey = syncKeyRef.current;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(event));
      } else {
        const q = getPendingQueue(currentKey);
        q.push(event);
        savePendingQueue(currentKey, q);
        setSyncStatus('offline');
      }
    },
    [getPendingQueue, savePendingQueue]
  );

  const updateUserName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 30);
      if (!trimmed) return;
      setUserNameState(trimmed);
      userNameRef.current = trimmed;
      try {
        localStorage.setItem('checklist_user_name', trimmed);
      } catch {}

      sendEvent({
        type: 'user:update_name',
        payload: {
          syncKey: syncKeyRef.current,
          senderId: clientId.current,
          userName: trimmed,
        },
      });
    },
    [sendEvent]
  );

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'user:typing',
          payload: {
            syncKey: syncKeyRef.current,
            senderId: clientId.current,
            senderName: userNameRef.current,
            isTyping,
          },
        })
      );
    }
  }, []);

  // HTTP Reconciliation: immediately wakes up container & reconciles full session state
  const performHttpReconcile = useCallback(
    async (key: string) => {
      try {
        const currentLists = listsRef.current;
        const currentListTombstones = listTombstonesRef.current;
        const currentItems = allItemsRef.current;
        const currentTombstones = tombstonesRef.current;
        const currentCleared = lastClearedAtRef.current;

        const res = await fetch('/api/sync/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            syncKey: key,
            lists: currentLists,
            listTombstones: currentListTombstones,
            items: currentItems,
            tombstones: currentTombstones,
            lastClearedAt: currentCleared,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (sanitizeKey(data.syncKey) === syncKeyRef.current) {
          const reconciledLists = mergeUserLists(
            listsRef.current,
            listTombstonesRef.current,
            Array.isArray(data.lists) ? data.lists : [],
            data.listTombstones || {}
          );

          const reconciledItems = mergeLists(
            allItemsRef.current,
            tombstonesRef.current,
            lastClearedAtRef.current,
            Array.isArray(data.items) ? data.items : [],
            data.tombstones || {},
            data.lastClearedAt || 0
          );

          listsRef.current = reconciledLists.lists;
          listTombstonesRef.current = reconciledLists.listTombstones;
          allItemsRef.current = reconciledItems.items;
          tombstonesRef.current = reconciledItems.tombstones;
          lastClearedAtRef.current = reconciledItems.lastClearedAt;

          setLists(reconciledLists.lists);
          setAllItems(reconciledItems.items);
          persistState(
            key,
            reconciledLists.lists,
            reconciledLists.listTombstones,
            reconciledItems.items,
            reconciledItems.tombstones,
            reconciledItems.lastClearedAt
          );
        }
      } catch (err) {
        console.warn('HTTP reconciliation background check:', err);
      }
    },
    [persistState]
  );

  const requestNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied' as NotificationPermission;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        new Notification('Checklist', {
          body: 'Notifications enabled! You will be alerted when tasks are completed.',
          icon: '/icon.svg',
        });
      }
      return result;
    } catch {
      return 'denied' as NotificationPermission;
    }
  }, []);

  const showTaskNotification = useCallback(
    (taskText: string, completedByName?: string) => {
      const displayName = completedByName || partnerName || 'Partner';
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready
              .then((reg) => {
                reg.showNotification('Item Completed', {
                  body: `${displayName} checked "${taskText}"`,
                  icon: '/icon.svg',
                  badge: '/icon.svg',
                  vibrate: [100, 50, 100],
                } as any);
              })
              .catch(() => {
                new Notification('Item Completed', {
                  body: `${displayName} checked "${taskText}"`,
                  icon: '/icon.svg',
                });
              });
          } else {
            new Notification('Item Completed', {
              body: `${displayName} checked "${taskText}"`,
              icon: '/icon.svg',
            });
          }
        } catch (err) {
          console.warn('Notification failed', err);
        }
      }

      setLatestToast({
        id: Math.random().toString(36),
        message: `${displayName} checked "${taskText}"`,
        timestamp: Date.now(),
      });
    },
    [partnerName]
  );

  // Switch to another session key
  const switchSyncKey = useCallback(
    (newKey: string) => {
      const clean = sanitizeKey(newKey);
      if (clean === syncKeyRef.current) return;

      persistState(
        syncKeyRef.current,
        listsRef.current,
        listTombstonesRef.current,
        allItemsRef.current,
        tombstonesRef.current,
        lastClearedAtRef.current
      );

      syncKeyRef.current = clean;
      setSyncKeyState(clean);

      const newLists = getCachedLists(clean);
      const newListTombstones = getCachedListTombstones(clean);
      const newItems = getCachedItems(clean);
      const newTombstones = getCachedTombstones(clean);
      const newCleared = getCachedClearedAt(clean);
      const newActiveId = getStoredActiveListId(clean, newLists);

      listsRef.current = newLists;
      listTombstonesRef.current = newListTombstones;
      allItemsRef.current = newItems;
      tombstonesRef.current = newTombstones;
      lastClearedAtRef.current = newCleared;
      activeListIdRef.current = newActiveId;

      setLists(newLists);
      setAllItems(newItems);
      setActiveListId(newActiveId);
      setPartnerTyping(null);

      try {
        localStorage.setItem('checklist_sync_key', clean);
        localStorage.setItem(`checklist_active_list_id_${clean}`, newActiveId);
        const url = new URL(window.location.href);
        url.searchParams.set('key', clean);
        const match = newLists.find((l) => l.id === newActiveId);
        if (match) url.searchParams.set('name', match.name);
        window.history.replaceState({}, '', url.toString());
      } catch {}

      performHttpReconcile(clean);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'sync:join',
            payload: {
              syncKey: clean,
              senderId: clientId.current,
              userName: userNameRef.current,
              lists: newLists,
              listTombstones: newListTombstones,
              items: newItems,
              tombstones: newTombstones,
              lastClearedAt: newCleared,
            },
          })
        );
      }
    },
    [performHttpReconcile, persistState]
  );

  const generateNewSyncKey = useCallback(() => {
    const newKey = generateFourLetterSyncKey();
    switchSyncKey(newKey);
    return newKey;
  }, [switchSyncKey]);

  const getShareUrl = useCallback((targetList?: UserList) => {
    if (typeof window === 'undefined') return '';
    const list =
      targetList ||
      listsRef.current.find((l) => l.id === activeListIdRef.current) ||
      listsRef.current[0] || {
        name: 'Groceries',
      };
    return `${window.location.origin}${window.location.pathname}?key=${encodeURIComponent(
      syncKeyRef.current
    )}&name=${encodeURIComponent(list.name)}`;
  }, []);

  // Main WebSocket connection & real-time synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    let isUnmounted = false;
    const currentKey = syncKey;

    performHttpReconcile(currentKey);

    function connect() {
      if (isUnmounted) return;
      if (typeof window === 'undefined') return;

      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/?key=${encodeURIComponent(currentKey)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setSyncStatus('connected');

          ws.send(
            JSON.stringify({
              type: 'sync:join',
              payload: {
                syncKey: currentKey,
                senderId: clientId.current,
                userName: userNameRef.current,
                lists: listsRef.current,
                listTombstones: listTombstonesRef.current,
                items: allItemsRef.current,
                tombstones: tombstonesRef.current,
                lastClearedAt: lastClearedAtRef.current,
              },
            })
          );

          // Flush pending offline queue
          const queue = getPendingQueue(currentKey);
          if (queue.length > 0) {
            queue.forEach((evt) => {
              ws.send(JSON.stringify(evt));
            });
            savePendingQueue(currentKey, []);
          }
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (payload?.syncKey && sanitizeKey(payload.syncKey) !== syncKeyRef.current) {
              return;
            }

            if (type === 'sync:init' || type === 'sync:reconcile') {
              const reconciledLists = mergeUserLists(
                listsRef.current,
                listTombstonesRef.current,
                Array.isArray(payload.lists) ? payload.lists : [],
                payload.listTombstones || {}
              );

              const reconciledItems = mergeLists(
                allItemsRef.current,
                tombstonesRef.current,
                lastClearedAtRef.current,
                Array.isArray(payload.items) ? payload.items : [],
                payload.tombstones || {},
                payload.lastClearedAt || 0
              );

              listsRef.current = reconciledLists.lists;
              listTombstonesRef.current = reconciledLists.listTombstones;
              allItemsRef.current = reconciledItems.items;
              tombstonesRef.current = reconciledItems.tombstones;
              lastClearedAtRef.current = reconciledItems.lastClearedAt;

              setLists(reconciledLists.lists);
              setAllItems(reconciledItems.items);
              persistState(
                syncKeyRef.current,
                reconciledLists.lists,
                reconciledLists.listTombstones,
                reconciledItems.items,
                reconciledItems.tombstones,
                reconciledItems.lastClearedAt
              );

              if (typeof payload.onlineCount === 'number') {
                setPartnerActive(payload.onlineCount > 1);
              }
              if (Array.isArray(payload.partnerNames) && payload.partnerNames.length > 0) {
                setPartnerName(payload.partnerNames[0]);
              }

              const serverItemCount = Array.isArray(payload.items) ? payload.items.length : 0;
              const serverListCount = Array.isArray(payload.lists) ? payload.lists.length : 0;
              if (
                (reconciledItems.items.length > serverItemCount ||
                  reconciledLists.lists.length > serverListCount) &&
                ws.readyState === WebSocket.OPEN
              ) {
                ws.send(
                  JSON.stringify({
                    type: 'sync:reconcile',
                    payload: {
                      syncKey: syncKeyRef.current,
                      lists: reconciledLists.lists,
                      listTombstones: reconciledLists.listTombstones,
                      items: reconciledItems.items,
                      tombstones: reconciledItems.tombstones,
                      lastClearedAt: reconciledItems.lastClearedAt,
                      senderId: clientId.current,
                    },
                  })
                );
              }
            } else if (type === 'list:created') {
              const incomingList: UserList = payload.list;
              if (incomingList && incomingList.id) {
                if (listTombstonesRef.current[incomingList.id]) return;
                setLists((prev) => {
                  if (prev.some((l) => l.id === incomingList.id)) return prev;
                  const next = [...prev, incomingList];
                  listsRef.current = next;
                  persistState(
                    syncKeyRef.current,
                    next,
                    listTombstonesRef.current,
                    allItemsRef.current,
                    tombstonesRef.current,
                    lastClearedAtRef.current
                  );
                  return next;
                });
              }
            } else if (type === 'list:renamed') {
              const { id, name, updatedAt } = payload;
              setLists((prev) => {
                const next = prev.map((l) => {
                  if (l.id === id && (updatedAt || 0) >= (l.updatedAt || 0)) {
                    return { ...l, name, updatedAt: updatedAt || Date.now() };
                  }
                  return l;
                });
                listsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  next,
                  listTombstonesRef.current,
                  allItemsRef.current,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'list:color_updated') {
              const { id, color, updatedAt } = payload;
              setLists((prev) => {
                const next = prev.map((l) => {
                  if (l.id === id && (updatedAt || 0) >= (l.updatedAt || 0)) {
                    return { ...l, color, updatedAt: updatedAt || Date.now() };
                  }
                  return l;
                });
                listsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  next,
                  listTombstonesRef.current,
                  allItemsRef.current,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'list:deleted') {
              const { id, deletedAt } = payload;
              const ts = deletedAt || Date.now();
              listTombstonesRef.current[id] = ts;

              setLists((prev) => {
                const next = prev.filter((l) => l.id !== id);
                listsRef.current = next;
                return next;
              });

              setAllItems((prev) => {
                prev.forEach((i) => {
                  if (i.listId === id) {
                    tombstonesRef.current[i.id] = ts;
                  }
                });
                const next = prev.filter((i) => i.listId !== id);
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });

              if (activeListIdRef.current === id) {
                const remaining = listsRef.current.filter((l) => l.id !== id);
                if (remaining.length > 0) {
                  setActiveListId(remaining[0].id);
                  activeListIdRef.current = remaining[0].id;
                }
              }
            } else if (type === 'item:moved') {
              const { id, targetListId, updatedAt } = payload;
              setAllItems((prev) => {
                const next = prev.map((item) => {
                  if (item.id === id) {
                    return {
                      ...item,
                      listId: targetListId,
                      updatedAt: updatedAt || Date.now(),
                    };
                  }
                  return item;
                });
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'presence') {
              setPartnerActive(payload.onlineCount > 1);
              if (Array.isArray(payload.partnerNames) && payload.partnerNames.length > 0) {
                setPartnerName(payload.partnerNames[0]);
              }
            } else if (type === 'user:typing') {
              if (payload.senderId !== clientId.current) {
                if (payload.isTyping) {
                  setPartnerTyping({
                    isTyping: true,
                    name: payload.senderName || 'Partner',
                  });
                  if (typingResetTimeoutRef.current) clearTimeout(typingResetTimeoutRef.current);
                  typingResetTimeoutRef.current = setTimeout(() => {
                    setPartnerTyping(null);
                  }, 3500);
                } else {
                  setPartnerTyping(null);
                }
              }
            } else if (type === 'list:reorder') {
              if (payload.senderId !== clientId.current && Array.isArray(payload.itemIds)) {
                const idMap = new Map<string, GroceryItem>(allItemsRef.current.map((i) => [i.id, i]));
                const next: GroceryItem[] = [];
                for (const id of payload.itemIds) {
                  const it = idMap.get(id);
                  if (it) {
                    next.push(it);
                    idMap.delete(id);
                  }
                }
                for (const remaining of idMap.values()) {
                  next.push(remaining);
                }
                allItemsRef.current = next;
                setAllItems(next);
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
              }
            } else if (type === 'item:added') {
              const incoming: GroceryItem = payload.item;
              const tombstoneTs = tombstonesRef.current[incoming.id];
              const incomingUpdated = incoming.updatedAt || incoming.createdAt || 0;

              if (tombstoneTs && tombstoneTs >= incomingUpdated) return;
              if (lastClearedAtRef.current > 0 && lastClearedAtRef.current >= incomingUpdated) return;

              setAllItems((prev) => {
                const existingIdx = prev.findIndex((i) => i.id === incoming.id);
                let next: GroceryItem[];
                if (existingIdx >= 0) {
                  const curr = prev[existingIdx];
                  if (incomingUpdated >= (curr.updatedAt || curr.createdAt || 0)) {
                    next = [...prev];
                    next[existingIdx] = incoming;
                  } else {
                    return prev;
                  }
                } else {
                  next = [incoming, ...prev];
                }
                allItemsRef.current = next;
                delete tombstonesRef.current[incoming.id];
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'item:toggled') {
              const isRemote = payload.senderId !== clientId.current;
              setAllItems((prev) => {
                const next = prev.map((item) => {
                  if (item.id === payload.id) {
                    const incomingTs = payload.updatedAt || Date.now();
                    if (incomingTs >= (item.updatedAt || 0)) {
                      return {
                        ...item,
                        completed: payload.completed,
                        completedAt: payload.completed ? Date.now() : undefined,
                        completedBy: payload.completedBy,
                        updatedAt: incomingTs,
                      };
                    }
                  }
                  return item;
                });
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });

              if (isRemote && payload.completed && payload.itemText) {
                showTaskNotification(payload.itemText, payload.completedBy);
              }
            } else if (type === 'item:edited') {
              setAllItems((prev) => {
                const next = prev.map((item) => {
                  if (item.id === payload.id) {
                    const incomingTs = payload.updatedAt || Date.now();
                    if (incomingTs >= (item.updatedAt || 0)) {
                      return { ...item, text: payload.text, updatedAt: incomingTs };
                    }
                  }
                  return item;
                });
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'item:deleted') {
              const deletedTs = payload.deletedAt || Date.now();
              tombstonesRef.current[payload.id] = deletedTs;

              setAllItems((prev) => {
                const next = prev.filter((item) => item.id !== payload.id);
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            } else if (type === 'list:cleared') {
              const clearedTs = payload.clearedAt || Date.now();
              if (Array.isArray(payload.tombstonedIds)) {
                payload.tombstonedIds.forEach((id: string) => {
                  tombstonesRef.current[id] = clearedTs;
                });
              }

              const targetListId = payload.listId;
              const defaultId = listsRef.current[0]?.id || 'list-default';

              setAllItems((prev) => {
                let next: GroceryItem[] = [];
                if (payload.mode === 'completed') {
                  next = prev.filter((i) => {
                    const inThisList = !targetListId || (i.listId || defaultId) === targetListId;
                    return !(inThisList && i.completed);
                  });
                } else {
                  if (!targetListId) {
                    lastClearedAtRef.current = clearedTs;
                    next = [];
                  } else {
                    next = prev.filter((i) => (i.listId || defaultId) !== targetListId);
                  }
                }
                allItemsRef.current = next;
                persistState(
                  syncKeyRef.current,
                  listsRef.current,
                  listTombstonesRef.current,
                  next,
                  tombstonesRef.current,
                  lastClearedAtRef.current
                );
                return next;
              });
            }
          } catch (e) {
            console.error('Error handling sync message:', e);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setSyncStatus(navigator.onLine ? 'connecting' : 'offline');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2500);
        };

        ws.onerror = () => {
          if (isUnmounted) return;
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        setSyncStatus('offline');
      }
    }

    connect();

    const handleOnline = () => {
      isOnlineRef.current = true;
      performHttpReconcile(currentKey);
      connect();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setSyncStatus('offline');
      if (socketRef.current) {
        socketRef.current.close();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isUnmounted = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (typingResetTimeoutRef.current) clearTimeout(typingResetTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [
    getPendingQueue,
    performHttpReconcile,
    persistState,
    savePendingQueue,
    showTaskNotification,
    syncKey,
  ]);

  // Client Mutations
  const addItem = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentKey = syncKeyRef.current;
      const currentListId = activeListIdRef.current || listsRef.current[0]?.id || 'list-default';
      const now = Date.now();
      const newItem: GroceryItem = {
        id: 'item-' + now + '-' + Math.random().toString(36).substring(2, 6),
        listId: currentListId,
        text: trimmed,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      delete tombstonesRef.current[newItem.id];

      setAllItems((prev) => {
        const next = [newItem, ...prev];
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'item:add',
        payload: {
          syncKey: currentKey,
          item: newItem,
          senderId: clientId.current,
        },
      });

      broadcastTyping(false);
      triggerHaptic(15);
    },
    [broadcastTyping, persistState, sendEvent]
  );

  const toggleItem = useCallback(
    (id: string) => {
      const currentKey = syncKeyRef.current;
      const now = Date.now();

      setAllItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (!target) return prev;
        const nextCompleted = !target.completed;

        const next = prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? now : undefined,
              completedBy: nextCompleted ? 'You' : undefined,
              updatedAt: now,
            };
          }
          return item;
        });

        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );

        sendEvent({
          type: 'item:toggle',
          payload: {
            syncKey: currentKey,
            id,
            completed: nextCompleted,
            completedBy: userNameRef.current || 'Partner',
            updatedAt: now,
            senderId: clientId.current,
          },
        });

        if (nextCompleted) {
          playCompleteSound();
          triggerHaptic(25);
        } else {
          triggerHaptic(15);
        }

        return next;
      });
    },
    [persistState, sendEvent]
  );

  const editItem = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentKey = syncKeyRef.current;
      const now = Date.now();

      setAllItems((prev) => {
        const next = prev.map((item) => {
          if (item.id === id) {
            return { ...item, text: trimmed, updatedAt: now };
          }
          return item;
        });
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'item:edit',
        payload: {
          syncKey: currentKey,
          id,
          text: trimmed,
          updatedAt: now,
          senderId: clientId.current,
        },
      });
    },
    [persistState, sendEvent]
  );

  const restoreItem = useCallback(
    (itemToRestore: GroceryItem) => {
      const currentKey = syncKeyRef.current;
      const now = Date.now();
      delete tombstonesRef.current[itemToRestore.id];

      const restored: GroceryItem = {
        ...itemToRestore,
        updatedAt: now,
      };

      setAllItems((prev) => {
        const exists = prev.some((i) => i.id === restored.id);
        if (exists) return prev;
        const next = [restored, ...prev];
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'item:add',
        payload: {
          syncKey: currentKey,
          item: restored,
          senderId: clientId.current,
        },
      });

      triggerHaptic(20);
    },
    [persistState, sendEvent]
  );

  const deleteItem = useCallback(
    (id: string) => {
      const currentKey = syncKeyRef.current;
      const now = Date.now();
      const target = allItemsRef.current.find((i) => i.id === id);

      tombstonesRef.current[id] = now;

      setAllItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'item:delete',
        payload: {
          syncKey: currentKey,
          id,
          deletedAt: now,
          senderId: clientId.current,
        },
      });

      if (target) {
        setLatestToast({
          id: `del-${id}-${now}`,
          message: `Deleted "${target.text}"`,
          timestamp: now,
          undoAction: () => {
            restoreItem(target);
          },
        });
      }

      triggerHaptic(20);
    },
    [persistState, restoreItem, sendEvent]
  );

  const reorderItems = useCallback(
    (reorderedActiveItems: GroceryItem[]) => {
      const currentKey = syncKeyRef.current;
      const defaultId = listsRef.current[0]?.id || 'list-default';
      const currentListId = activeListIdRef.current || defaultId;

      setAllItems((prev) => {
        const otherListItems = prev.filter((i) => (i.listId || defaultId) !== currentListId);
        const next = [...reorderedActiveItems, ...otherListItems];
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'list:reorder',
        payload: {
          syncKey: currentKey,
          itemIds: reorderedActiveItems.map((i) => i.id),
          senderId: clientId.current,
        },
      });
    },
    [persistState, sendEvent]
  );

  const clearList = useCallback(
    (mode: 'completed' | 'all') => {
      const currentKey = syncKeyRef.current;
      const defaultId = listsRef.current[0]?.id || 'list-default';
      const currentListId = activeListIdRef.current || defaultId;
      const now = Date.now();
      const tombstonedIds: string[] = [];

      setAllItems((prev) => {
        let next: GroceryItem[] = [];
        if (mode === 'completed') {
          next = prev.filter((i) => {
            const inThisList = (i.listId || defaultId) === currentListId;
            if (inThisList && i.completed) {
              tombstonesRef.current[i.id] = now;
              tombstonedIds.push(i.id);
              return false;
            }
            return true;
          });
        } else {
          next = prev.filter((i) => {
            const inThisList = (i.listId || defaultId) === currentListId;
            if (inThisList) {
              tombstonesRef.current[i.id] = now;
              tombstonedIds.push(i.id);
              return false;
            }
            return true;
          });
        }

        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'list:clear',
        payload: {
          syncKey: currentKey,
          listId: currentListId,
          mode,
          clearedAt: now,
          tombstonedIds,
          senderId: clientId.current,
        },
      });

      triggerHaptic(30);
    },
    [persistState, sendEvent]
  );

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  // Multi-list operations within the session
  const switchList = useCallback((id: string) => {
    const target = listsRef.current.find((l) => l.id === id);
    if (!target) return;

    setActiveListId(target.id);
    activeListIdRef.current = target.id;
    try {
      localStorage.setItem(`checklist_active_list_id_${syncKeyRef.current}`, target.id);
      const url = new URL(window.location.href);
      url.searchParams.set('name', target.name);
      window.history.replaceState({}, '', url.toString());
    } catch {}
    triggerHaptic(15);
  }, []);

  const createList = useCallback(
    (name: string, color?: string) => {
      const trimmedName = name.trim() || 'New List';
      const currentKey = syncKeyRef.current;
      const now = Date.now();
      const newList: UserList = {
        id: `list-${now.toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmedName,
        color,
        createdAt: now,
        updatedAt: now,
      };

      const updatedLists = [...listsRef.current, newList];
      listsRef.current = updatedLists;
      setLists(updatedLists);
      setActiveListId(newList.id);
      activeListIdRef.current = newList.id;

      persistState(
        currentKey,
        updatedLists,
        listTombstonesRef.current,
        allItemsRef.current,
        tombstonesRef.current,
        lastClearedAtRef.current
      );

      try {
        localStorage.setItem(`checklist_active_list_id_${currentKey}`, newList.id);
        const url = new URL(window.location.href);
        url.searchParams.set('name', newList.name);
        window.history.replaceState({}, '', url.toString());
      } catch {}

      sendEvent({
        type: 'list:create',
        payload: {
          syncKey: currentKey,
          list: newList,
          senderId: clientId.current,
        },
      });

      triggerHaptic(25);
      return newList;
    },
    [persistState, sendEvent]
  );

  const updateListColor = useCallback(
    (id: string, color: string) => {
      const currentKey = syncKeyRef.current;
      const now = Date.now();

      setLists((prev) => {
        const updated = prev.map((l) => (l.id === id ? { ...l, color, updatedAt: now } : l));
        listsRef.current = updated;
        persistState(
          currentKey,
          updated,
          listTombstonesRef.current,
          allItemsRef.current,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return updated;
      });

      sendEvent({
        type: 'list:update_color',
        payload: {
          syncKey: currentKey,
          id,
          color,
          updatedAt: now,
          senderId: clientId.current,
        },
      });

      triggerHaptic(15);
    },
    [persistState, sendEvent]
  );

  const renameList = useCallback(
    (id: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const currentKey = syncKeyRef.current;
      const now = Date.now();

      setLists((prev) => {
        const updated = prev.map((l) => (l.id === id ? { ...l, name: trimmed, updatedAt: now } : l));
        listsRef.current = updated;
        persistState(
          currentKey,
          updated,
          listTombstonesRef.current,
          allItemsRef.current,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return updated;
      });

      if (activeListIdRef.current === id) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('name', trimmed);
          window.history.replaceState({}, '', url.toString());
        } catch {}
      }

      sendEvent({
        type: 'list:rename',
        payload: {
          syncKey: currentKey,
          id,
          name: trimmed,
          updatedAt: now,
          senderId: clientId.current,
        },
      });
    },
    [persistState, sendEvent]
  );

  const deleteList = useCallback(
    (id: string) => {
      const currentKey = syncKeyRef.current;
      const now = Date.now();
      const target = listsRef.current.find((l) => l.id === id);

      listTombstonesRef.current[id] = now;

      setLists((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((l) => l.id !== id);
        listsRef.current = remaining;

        if (activeListIdRef.current === id && remaining.length > 0) {
          const nextList = remaining[0];
          setActiveListId(nextList.id);
          activeListIdRef.current = nextList.id;
          try {
            localStorage.setItem(`checklist_active_list_id_${currentKey}`, nextList.id);
            const url = new URL(window.location.href);
            url.searchParams.set('name', nextList.name);
            window.history.replaceState({}, '', url.toString());
          } catch {}
        }

        return remaining;
      });

      // Tombstone items of the deleted list
      setAllItems((prev) => {
        prev.forEach((item) => {
          if (item.listId === id) {
            tombstonesRef.current[item.id] = now;
          }
        });
        const nextItems = prev.filter((item) => item.listId !== id);
        allItemsRef.current = nextItems;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          nextItems,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return nextItems;
      });

      sendEvent({
        type: 'list:delete',
        payload: {
          syncKey: currentKey,
          id,
          deletedAt: now,
          senderId: clientId.current,
        },
      });

      if (target) {
        setLatestToast({
          id: `del-list-${id}-${now}`,
          message: `Deleted list "${target.name}"`,
          timestamp: now,
        });
      }

      triggerHaptic(20);
    },
    [persistState, sendEvent]
  );

  const moveItemToList = useCallback(
    (itemId: string, targetListId: string) => {
      const targetList = listsRef.current.find((l) => l.id === targetListId);
      if (!targetList) return;

      const itemToMove = allItemsRef.current.find((i) => i.id === itemId);
      if (!itemToMove) return;

      const now = Date.now();
      const currentKey = syncKeyRef.current;
      const previousListId = itemToMove.listId || listsRef.current[0]?.id || 'list-default';

      setAllItems((prev) => {
        const next = prev.map((item) => {
          if (item.id === itemId) {
            return { ...item, listId: targetListId, updatedAt: now };
          }
          return item;
        });
        allItemsRef.current = next;
        persistState(
          currentKey,
          listsRef.current,
          listTombstonesRef.current,
          next,
          tombstonesRef.current,
          lastClearedAtRef.current
        );
        return next;
      });

      sendEvent({
        type: 'item:move',
        payload: {
          syncKey: currentKey,
          id: itemId,
          targetListId,
          updatedAt: now,
          senderId: clientId.current,
        },
      });

      setLatestToast({
        id: `move-${itemId}-${now}`,
        message: `Moved "${itemToMove.text}" to ${targetList.name}`,
        timestamp: now,
        undoAction: () => {
          setAllItems((prev) => {
            const reverted = prev.map((item) => {
              if (item.id === itemId) {
                return { ...item, listId: previousListId, updatedAt: Date.now() };
              }
              return item;
            });
            allItemsRef.current = reverted;
            persistState(
              currentKey,
              listsRef.current,
              listTombstonesRef.current,
              reverted,
              tombstonesRef.current,
              lastClearedAtRef.current
            );
            return reverted;
          });

          sendEvent({
            type: 'item:move',
            payload: {
              syncKey: currentKey,
              id: itemId,
              targetListId: previousListId,
              updatedAt: Date.now(),
              senderId: clientId.current,
            },
          });
        },
      });

      triggerHaptic(20);
    },
    [persistState, sendEvent]
  );

  return {
    items,
    allItems,
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
    restoreItem,
    reorderItems,
    clearList,
    // Multiple lists in this synced session
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
  };
}
