import { GroceryItem, UserList } from '../types';

export interface ReconciledResult {
  items: GroceryItem[];
  tombstones: Record<string, number>;
  lastClearedAt: number;
}

export interface ReconciledListsResult {
  lists: UserList[];
  listTombstones: Record<string, number>;
}

/**
 * Reconciles two arrays of UserList using Last-Write-Wins (LWW) and deletion tombstones.
 */
export function mergeUserLists(
  listsA: UserList[] = [],
  tombstonesA: Record<string, number> = {},
  listsB: UserList[] = [],
  tombstonesB: Record<string, number> = {}
): ReconciledListsResult {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const mergedTombstones: Record<string, number> = {};

  const absorbTombstones = (tb: Record<string, number> | undefined) => {
    if (!tb) return;
    for (const [id, ts] of Object.entries(tb)) {
      if (typeof ts === 'number' && ts > fourteenDaysAgo) {
        mergedTombstones[id] = Math.max(mergedTombstones[id] || 0, ts);
      }
    }
  };

  absorbTombstones(tombstonesA);
  absorbTombstones(tombstonesB);

  const listMap = new Map<string, UserList>();

  const absorbList = (list: UserList) => {
    if (!list || !list.id || typeof list.id !== 'string') return;
    const tombstoneTs = mergedTombstones[list.id];
    const listUpdated = list.updatedAt || list.createdAt || 0;
    if (tombstoneTs && tombstoneTs >= listUpdated) return;

    const existing = listMap.get(list.id);
    if (!existing) {
      listMap.set(list.id, { ...list });
      return;
    }

    const existingUpdated = existing.updatedAt || existing.createdAt || 0;
    if (listUpdated > existingUpdated) {
      listMap.set(list.id, { ...list });
    }
  };

  listsA.forEach(absorbList);
  listsB.forEach(absorbList);

  let mergedLists = Array.from(listMap.values());

  if (mergedLists.length === 0) {
    mergedLists = [
      {
        id: 'list-default',
        name: 'Groceries',
        createdAt: Date.now(),
      },
    ];
  } else {
    // Stable order by createdAt
    mergedLists.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  return {
    lists: mergedLists,
    listTombstones: mergedTombstones,
  };
}

/**
 * Reconciles two versions of a checklist using Last-Write-Wins (LWW) and deletion tombstones.
 * Guarantees that cold-started server caches never wipe out client data,
 * and legitimately deleted items or cleared lists stay deleted.
 */
export function mergeLists(
  itemsA: GroceryItem[] = [],
  tombstonesA: Record<string, number> = {},
  clearedAtA: number = 0,
  itemsB: GroceryItem[] = [],
  tombstonesB: Record<string, number> = {},
  clearedAtB: number = 0
): ReconciledResult {
  const mergedClearedAt = Math.max(clearedAtA || 0, clearedAtB || 0);

  // Merge tombstones and prune those older than 14 days
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const mergedTombstones: Record<string, number> = {};

  const absorbTombstones = (tb: Record<string, number> | undefined) => {
    if (!tb) return;
    for (const [id, ts] of Object.entries(tb)) {
      if (typeof ts === 'number' && ts > fourteenDaysAgo) {
        mergedTombstones[id] = Math.max(mergedTombstones[id] || 0, ts);
      }
    }
  };

  absorbTombstones(tombstonesA);
  absorbTombstones(tombstonesB);

  // Group candidate items by ID
  const itemMap = new Map<string, GroceryItem>();

  const absorbItem = (item: GroceryItem) => {
    if (!item || !item.id || typeof item.id !== 'string') return;

    const existing = itemMap.get(item.id);
    if (!existing) {
      itemMap.set(item.id, { ...item });
      return;
    }

    const existingUpdated = existing.updatedAt || existing.createdAt || 0;
    const incomingUpdated = item.updatedAt || item.createdAt || 0;

    if (incomingUpdated > existingUpdated) {
      itemMap.set(item.id, {
        ...item,
        listId: item.listId || existing.listId,
      });
    } else if (incomingUpdated === existingUpdated) {
      // If timestamps tie, favor completed status and fuller content
      itemMap.set(item.id, {
        ...existing,
        completed: existing.completed || item.completed,
        completedAt: existing.completedAt || item.completedAt,
        completedBy: existing.completedBy || item.completedBy,
        text: item.text.length > existing.text.length ? item.text : existing.text,
        listId: item.listId || existing.listId,
      });
    }
  };

  itemsA.forEach(absorbItem);
  itemsB.forEach(absorbItem);

  // Filter out any items that have been deleted or cleared
  const activeItems: GroceryItem[] = [];

  for (const [id, item] of itemMap.entries()) {
    const itemUpdated = item.updatedAt || item.createdAt || 0;
    const tombstoneTs = mergedTombstones[id];

    // Was item deleted at or after its last update?
    if (tombstoneTs && tombstoneTs >= itemUpdated) {
      continue;
    }

    // Was the entire list cleared after this item was last modified?
    if (mergedClearedAt > 0 && mergedClearedAt >= itemUpdated) {
      continue;
    }

    activeItems.push(item);
  }

  // Stable sort: keep newest items at the top
  activeItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return {
    items: activeItems,
    tombstones: mergedTombstones,
    lastClearedAt: mergedClearedAt,
  };
}
