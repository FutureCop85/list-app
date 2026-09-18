import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GroceryItem, SyncedListRecord, UserList } from './src/types';
import { mergeLists, mergeUserLists } from './src/utils/syncMerge';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const LISTS_DIR = path.join(DATA_DIR, 'lists');
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'groceries.json');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LISTS_DIR)) {
  fs.mkdirSync(LISTS_DIR, { recursive: true });
}

function sanitizeKey(key?: string): string {
  if (!key) return 'default';
  const clean = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').slice(0, 64);
  return clean || 'default';
}

const listsCache = new Map<string, SyncedListRecord>();

function getListFilePath(cleanKey: string): string {
  return path.join(LISTS_DIR, `${cleanKey}.json`);
}

function loadListRecord(rawKey?: string): SyncedListRecord {
  const cleanKey = sanitizeKey(rawKey);
  if (listsCache.has(cleanKey)) {
    return listsCache.get(cleanKey)!;
  }

  const defaultList: UserList = {
    id: 'list-default',
    name: 'Groceries',
    createdAt: 1700000000000,
  };

  const filePath = getListFilePath(cleanKey);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Support structured record format
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        const lists: UserList[] = Array.isArray(parsed.lists) && parsed.lists.length > 0
          ? parsed.lists
          : [defaultList];

        const primaryListId = lists[0]?.id || 'list-default';

        const normalizedItems: GroceryItem[] = parsed.items.map((item: GroceryItem) => ({
          ...item,
          listId: item.listId || primaryListId,
        }));

        const record: SyncedListRecord = {
          syncKey: cleanKey,
          lists,
          listTombstones: parsed.listTombstones || {},
          items: normalizedItems,
          tombstones: parsed.tombstones || {},
          lastClearedAt: parsed.lastClearedAt || 0,
          updatedAt: parsed.updatedAt || Date.now(),
        };
        listsCache.set(cleanKey, record);
        return record;
      }

      // Backward compatibility for legacy array format
      if (Array.isArray(parsed)) {
        const record: SyncedListRecord = {
          syncKey: cleanKey,
          lists: [defaultList],
          listTombstones: {},
          items: parsed.map((item) => ({ ...item, listId: 'list-default' })),
          tombstones: {},
          lastClearedAt: 0,
          updatedAt: Date.now(),
        };
        listsCache.set(cleanKey, record);
        return record;
      }
    }
  } catch (err) {
    console.error(`Failed to load list record for key [${cleanKey}]:`, err);
  }

  // Check legacy groceries.json file if key is 'default'
  if (cleanKey === 'default' && fs.existsSync(LEGACY_DATA_FILE)) {
    try {
      const content = fs.readFileSync(LEGACY_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const record: SyncedListRecord = {
          syncKey: cleanKey,
          lists: [defaultList],
          listTombstones: {},
          items: parsed.map((item) => ({ ...item, listId: 'list-default' })),
          tombstones: {},
          lastClearedAt: 0,
          updatedAt: Date.now(),
        };
        saveListRecord(cleanKey, record);
        return record;
      }
    } catch {}
  }

  // Default initial items only for brand new 'default' list
  let initialItems: GroceryItem[] = [];
  if (cleanKey === 'default') {
    initialItems = [
      {
        id: 'item-1',
        listId: 'list-default',
        text: 'Oat milk',
        completed: false,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'item-2',
        listId: 'list-default',
        text: 'Avocados (ripe)',
        completed: false,
        createdAt: Date.now() - 3000000,
        updatedAt: Date.now() - 3000000,
      },
      {
        id: 'item-3',
        listId: 'list-default',
        text: 'Sourdough bread',
        completed: false,
        createdAt: Date.now() - 2500000,
        updatedAt: Date.now() - 2500000,
      },
    ];
  }

  const newRecord: SyncedListRecord = {
    syncKey: cleanKey,
    lists: [defaultList],
    listTombstones: {},
    items: initialItems,
    tombstones: {},
    lastClearedAt: 0,
    updatedAt: Date.now(),
  };

  saveListRecord(cleanKey, newRecord);
  return newRecord;
}

function saveListRecord(cleanKey: string, record: SyncedListRecord) {
  listsCache.set(cleanKey, record);
  const filePath = getListFilePath(cleanKey);
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`Failed to save list [${cleanKey}]:`, err);
    try {
      // Direct fallback if rename fails across partitions
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {}
  }
}

function flushAllToDisk() {
  for (const [key, record] of listsCache.entries()) {
    try {
      const filePath = getListFilePath(key);
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {}
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: flushing lists to disk');
  flushAllToDisk();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: flushing lists to disk');
  flushAllToDisk();
  process.exit(0);
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '2mb' }));

  // API health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', cachedListsCount: listsCache.size });
  });

  // API items endpoint
  app.get('/api/items', (req, res) => {
    const key = (req.query.key as string) || 'default';
    const record = loadListRecord(key);
    res.json(record.items);
  });

  // Robust REST reconciliation endpoint (wakes up container & reconciles before WS)
  app.post('/api/sync/reconcile', (req, res) => {
    try {
      const { syncKey, lists, listTombstones, items, tombstones, lastClearedAt } = req.body || {};
      const cleanKey = sanitizeKey(syncKey);
      const currentRecord = loadListRecord(cleanKey);

      const reconciledLists = mergeUserLists(
        currentRecord.lists || [],
        currentRecord.listTombstones || {},
        Array.isArray(lists) ? lists : [],
        listTombstones || {}
      );

      const reconciledItems = mergeLists(
        currentRecord.items,
        currentRecord.tombstones,
        currentRecord.lastClearedAt,
        Array.isArray(items) ? items : [],
        tombstones || {},
        typeof lastClearedAt === 'number' ? lastClearedAt : 0
      );

      const updatedRecord: SyncedListRecord = {
        syncKey: cleanKey,
        lists: reconciledLists.lists,
        listTombstones: reconciledLists.listTombstones,
        items: reconciledItems.items,
        tombstones: reconciledItems.tombstones,
        lastClearedAt: reconciledItems.lastClearedAt,
        updatedAt: Date.now(),
      };

      saveListRecord(cleanKey, updatedRecord);

      res.json({
        syncKey: cleanKey,
        lists: reconciledLists.lists,
        listTombstones: reconciledLists.listTombstones,
        items: reconciledItems.items,
        tombstones: reconciledItems.tombstones,
        lastClearedAt: reconciledItems.lastClearedAt,
      });
    } catch (err) {
      console.error('REST reconcile error:', err);
      res.status(500).json({ error: 'Reconciliation failed' });
    }
  });

  // Track room per connected WebSocket
  const clientRooms = new Map<WebSocket, string>();
  const clientNames = new Map<WebSocket, string>();

  function getRoomClients(cleanKey: string): WebSocket[] {
    const clients: WebSocket[] = [];
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === cleanKey) {
        clients.push(client);
      }
    });
    return clients;
  }

  function broadcastToRoom(cleanKey: string, data: any, exceptClient?: WebSocket) {
    const message = JSON.stringify(data);
    const roomClients = getRoomClients(cleanKey);
    roomClients.forEach((client) => {
      if (client !== exceptClient && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function notifyRoomPresence(cleanKey: string) {
    const roomClients = getRoomClients(cleanKey);
    const onlineCount = roomClients.length;
    roomClients.forEach((client) => {
      const partnerNames = roomClients
        .filter((other) => other !== client)
        .map((other) => clientNames.get(other) || 'Partner');

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'presence',
            payload: { syncKey: cleanKey, onlineCount, partnerNames },
          })
        );
      }
    });
  }

  wss.on('connection', (ws, req) => {
    // Parse key from URL query if provided: ws://host/?key=xyz
    let initialKey = 'default';
    if (req.url) {
      try {
        const url = new URL(req.url, 'http://localhost:3000');
        const queryKey = url.searchParams.get('key') || url.searchParams.get('list');
        if (queryKey) initialKey = sanitizeKey(queryKey);
      } catch {}
    }

    clientRooms.set(ws, initialKey);
    notifyRoomPresence(initialKey);

    ws.on('message', (raw) => {
      try {
        const action = JSON.parse(raw.toString());
        const { type, payload } = action;

        if (type === 'sync:join' || type === 'sync:reconcile') {
          const oldRoom = clientRooms.get(ws);
          const newRoom = sanitizeKey(payload.syncKey);
          clientRooms.set(ws, newRoom);
          if (payload.userName) {
            clientNames.set(ws, payload.userName.trim());
          }

          if (oldRoom && oldRoom !== newRoom) {
            notifyRoomPresence(oldRoom);
          }

          // Bidirectional merge with client's cached state
          const currentRecord = loadListRecord(newRoom);
          const incomingLists = Array.isArray(payload.cachedLists || payload.lists)
            ? (payload.cachedLists || payload.lists)
            : [];
          const incomingListTombstones = payload.listTombstones || {};

          const incomingItems = Array.isArray(payload.cachedItems || payload.items)
            ? (payload.cachedItems || payload.items)
            : [];
          const incomingTombstones = payload.tombstones || {};
          const incomingClearedAt = payload.lastClearedAt || 0;

          const reconciledLists = mergeUserLists(
            currentRecord.lists || [],
            currentRecord.listTombstones || {},
            incomingLists,
            incomingListTombstones
          );

          const reconciledItems = mergeLists(
            currentRecord.items,
            currentRecord.tombstones,
            currentRecord.lastClearedAt,
            incomingItems,
            incomingTombstones,
            incomingClearedAt
          );

          const updatedRecord: SyncedListRecord = {
            syncKey: newRoom,
            lists: reconciledLists.lists,
            listTombstones: reconciledLists.listTombstones,
            items: reconciledItems.items,
            tombstones: reconciledItems.tombstones,
            lastClearedAt: reconciledItems.lastClearedAt,
            updatedAt: Date.now(),
          };

          saveListRecord(newRoom, updatedRecord);

          const roomClients = getRoomClients(newRoom);
          const partnerNames = roomClients
            .filter((other) => other !== ws)
            .map((other) => clientNames.get(other) || 'Partner');

          // Reply with verified reconciled state to the joining client
          ws.send(
            JSON.stringify({
              type: 'sync:init',
              payload: {
                syncKey: newRoom,
                lists: reconciledLists.lists,
                listTombstones: reconciledLists.listTombstones,
                items: reconciledItems.items,
                tombstones: reconciledItems.tombstones,
                lastClearedAt: reconciledItems.lastClearedAt,
                onlineCount: roomClients.length,
                partnerNames,
              },
            })
          );

          // Broadcast reconciled updates to other clients in this room
          broadcastToRoom(
            newRoom,
            {
              type: 'sync:reconcile',
              payload: {
                syncKey: newRoom,
                lists: reconciledLists.lists,
                listTombstones: reconciledLists.listTombstones,
                items: reconciledItems.items,
                tombstones: reconciledItems.tombstones,
                lastClearedAt: reconciledItems.lastClearedAt,
                senderId: payload.senderId,
              },
            },
            ws
          );

          notifyRoomPresence(newRoom);
          return;
        }

        const currentKey = sanitizeKey(payload?.syncKey || clientRooms.get(ws) || 'default');
        const currentRecord = loadListRecord(currentKey);

        if (type === 'list:create') {
          const { list, senderId } = payload;
          if (list && list.id) {
            if (!currentRecord.lists) currentRecord.lists = [];
            const exists = currentRecord.lists.some((l) => l.id === list.id);
            if (!exists) {
              currentRecord.lists.push(list);
              if (currentRecord.listTombstones) {
                delete currentRecord.listTombstones[list.id];
              }
              currentRecord.updatedAt = Date.now();
              saveListRecord(currentKey, currentRecord);
            }
            broadcastToRoom(currentKey, {
              type: 'list:created',
              payload: {
                syncKey: currentKey,
                list,
                senderId,
              },
            });
          }
        } else if (type === 'list:rename') {
          const { id, name, updatedAt, senderId } = payload;
          const target = currentRecord.lists?.find((l) => l.id === id);
          if (target) {
            target.name = name.trim();
            target.updatedAt = updatedAt || Date.now();
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'list:renamed',
              payload: {
                syncKey: currentKey,
                id,
                name: target.name,
                updatedAt: target.updatedAt,
                senderId,
              },
            });
          }
        } else if (type === 'list:update_color') {
          const { id, color, updatedAt, senderId } = payload;
          const target = currentRecord.lists?.find((l) => l.id === id);
          if (target) {
            target.color = color;
            target.updatedAt = updatedAt || Date.now();
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'list:color_updated',
              payload: {
                syncKey: currentKey,
                id,
                color: target.color,
                updatedAt: target.updatedAt,
                senderId,
              },
            });
          }
        } else if (type === 'list:delete') {
          const { id, deletedAt, senderId } = payload;
          const ts = deletedAt || Date.now();

          if (currentRecord.lists) {
            currentRecord.lists = currentRecord.lists.filter((l) => l.id !== id);
            if (!currentRecord.listTombstones) currentRecord.listTombstones = {};
            currentRecord.listTombstones[id] = ts;

            // Also tombstone all items in that list
            currentRecord.items.forEach((item) => {
              if (item.listId === id) {
                currentRecord.tombstones[item.id] = ts;
              }
            });
            currentRecord.items = currentRecord.items.filter((item) => item.listId !== id);
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'list:deleted',
              payload: {
                syncKey: currentKey,
                id,
                deletedAt: ts,
                senderId,
              },
            });
          }
        } else if (type === 'item:move') {
          const { id, targetListId, updatedAt, senderId } = payload;
          const target = currentRecord.items.find((i) => i.id === id);
          if (target) {
            target.listId = targetListId;
            target.updatedAt = updatedAt || Date.now();
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'item:moved',
              payload: {
                syncKey: currentKey,
                id,
                targetListId,
                updatedAt: target.updatedAt,
                senderId,
              },
            });
          }
        } else if (type === 'item:add') {
          const newItem: GroceryItem = payload.item;
          const exists = currentRecord.items.some((i) => i.id === newItem.id);

          if (!exists) {
            currentRecord.items = [newItem, ...currentRecord.items];
            delete currentRecord.tombstones[newItem.id];
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);
          }

          broadcastToRoom(currentKey, {
            type: 'item:added',
            payload: {
              syncKey: currentKey,
              item: newItem,
              senderId: payload.senderId,
            },
          });
        } else if (type === 'item:toggle') {
          const { id, completed, completedBy, updatedAt, senderId } = payload;
          const target = currentRecord.items.find((i) => i.id === id);

          if (target) {
            target.completed = completed;
            target.completedAt = completed ? Date.now() : undefined;
            target.completedBy = completed ? completedBy || clientNames.get(ws) || 'Partner' : undefined;
            target.updatedAt = updatedAt || Date.now();
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'item:toggled',
              payload: {
                syncKey: currentKey,
                id,
                completed,
                completedBy: target.completedBy,
                itemText: target.text,
                updatedAt: target.updatedAt,
                senderId,
              },
            });
          }
        } else if (type === 'item:edit') {
          const { id, text, updatedAt, senderId } = payload;
          const target = currentRecord.items.find((i) => i.id === id);

          if (target) {
            target.text = text.trim();
            target.updatedAt = updatedAt || Date.now();
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(currentKey, {
              type: 'item:edited',
              payload: {
                syncKey: currentKey,
                id,
                text: target.text,
                updatedAt: target.updatedAt,
                senderId,
              },
            });
          }
        } else if (type === 'item:delete') {
          const { id, deletedAt, senderId } = payload;
          const ts = deletedAt || Date.now();

          currentRecord.items = currentRecord.items.filter((i) => i.id !== id);
          currentRecord.tombstones[id] = ts;
          currentRecord.updatedAt = Date.now();
          saveListRecord(currentKey, currentRecord);

          broadcastToRoom(currentKey, {
            type: 'item:deleted',
            payload: {
              syncKey: currentKey,
              id,
              deletedAt: ts,
              senderId,
            },
          });
        } else if (type === 'list:clear') {
          const { mode, listId, clearedAt, tombstonedIds, senderId } = payload;
          const ts = clearedAt || Date.now();

          if (mode === 'completed') {
            const completed = currentRecord.items.filter(
              (i) => i.completed && (!listId || (i.listId || 'list-default') === listId)
            );
            completed.forEach((i) => {
              currentRecord.tombstones[i.id] = ts;
            });
            currentRecord.items = currentRecord.items.filter(
              (i) => !(i.completed && (!listId || (i.listId || 'list-default') === listId))
            );
          } else if (mode === 'all') {
            const inList = currentRecord.items.filter(
              (i) => !listId || (i.listId || 'list-default') === listId
            );
            inList.forEach((i) => {
              currentRecord.tombstones[i.id] = ts;
            });
            if (!listId) {
              currentRecord.lastClearedAt = ts;
              currentRecord.items = [];
            } else {
              currentRecord.items = currentRecord.items.filter(
                (i) => (i.listId || 'list-default') !== listId
              );
            }
          }

          if (Array.isArray(tombstonedIds)) {
            tombstonedIds.forEach((id) => {
              currentRecord.tombstones[id] = ts;
            });
          }

          currentRecord.updatedAt = Date.now();
          saveListRecord(currentKey, currentRecord);

          broadcastToRoom(currentKey, {
            type: 'list:cleared',
            payload: {
              syncKey: currentKey,
              listId,
              mode,
              clearedAt: ts,
              tombstonedIds: tombstonedIds || [],
              senderId,
            },
          });
        } else if (type === 'user:typing') {
          const { isTyping, senderId, senderName } = payload;
          broadcastToRoom(
            currentKey,
            {
              type: 'user:typing',
              payload: {
                syncKey: currentKey,
                senderId,
                senderName: senderName || clientNames.get(ws) || 'Partner',
                isTyping: Boolean(isTyping),
              },
            },
            ws
          );
        } else if (type === 'user:update_name') {
          const rawName = typeof payload.userName === 'string' ? payload.userName.trim().slice(0, 30) : '';
          if (rawName) {
            clientNames.set(ws, rawName);
          }
          const currentRoom = clientRooms.get(ws) || sanitizeKey(payload.syncKey || 'default');
          notifyRoomPresence(currentRoom);
        } else if (type === 'list:reorder') {
          const { itemIds, sortOrders, senderId } = payload;
          if (Array.isArray(itemIds) && itemIds.length > 0) {
            const idToItem = new Map(currentRecord.items.map((i) => [i.id, i]));
            const reorderedItems: GroceryItem[] = [];
            for (const id of itemIds) {
              const item = idToItem.get(id);
              if (item) {
                const sortOrder = sortOrders?.[id];
                if (typeof sortOrder === 'number') {
                  item.sortOrder = sortOrder;
                }
                reorderedItems.push(item);
                idToItem.delete(id);
              }
            }
            for (const remaining of idToItem.values()) {
              reorderedItems.push(remaining);
            }
            currentRecord.items = reorderedItems;
            currentRecord.updatedAt = Date.now();
            saveListRecord(currentKey, currentRecord);

            broadcastToRoom(
              currentKey,
              {
                type: 'list:reorder',
                payload: {
                  syncKey: currentKey,
                  itemIds,
                  sortOrders,
                  senderId,
                },
              },
              ws
            );
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      const room = clientRooms.get(ws);
      clientRooms.delete(ws);
      clientNames.delete(ws);
      if (room) {
        notifyRoomPresence(room);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Checklist server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
