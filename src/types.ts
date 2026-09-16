export interface GroceryItem {
  id: string;
  listId?: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  completedBy?: string;
  updatedAt: number;
  deleted?: boolean;
  deletedAt?: number;
  sortOrder?: number;
}

export interface UserList {
  id: string;
  name: string;
  color?: string;
  syncKey?: string;
  createdAt: number;
  updatedAt?: number;
  order?: number;
}

export interface SyncedListRecord {
  syncKey: string;
  lists: UserList[];
  listTombstones?: Record<string, number>;
  items: GroceryItem[];
  tombstones: Record<string, number>;
  lastClearedAt: number;
  updatedAt: number;
}

export type WSEvent =
  | {
      type: 'sync:join';
      payload: {
        syncKey: string;
        senderId: string;
        userName?: string;
        cachedLists?: UserList[];
        listTombstones?: Record<string, number>;
        cachedItems?: GroceryItem[];
        tombstones?: Record<string, number>;
        lastClearedAt?: number;
      };
    }
  | {
      type: 'sync:init';
      payload: {
        syncKey: string;
        lists: UserList[];
        listTombstones?: Record<string, number>;
        items: GroceryItem[];
        tombstones?: Record<string, number>;
        lastClearedAt?: number;
        onlineCount: number;
        partnerNames?: string[];
      };
    }
  | {
      type: 'sync:reconcile';
      payload: {
        syncKey: string;
        lists?: UserList[];
        listTombstones?: Record<string, number>;
        items: GroceryItem[];
        tombstones?: Record<string, number>;
        lastClearedAt?: number;
        senderId: string;
      };
    }
  | {
      type: 'list:create';
      payload: {
        syncKey: string;
        list: UserList;
        senderId: string;
      };
    }
  | {
      type: 'list:created';
      payload: {
        syncKey: string;
        list: UserList;
        senderId: string;
      };
    }
  | {
      type: 'list:rename';
      payload: {
        syncKey: string;
        id: string;
        name: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:renamed';
      payload: {
        syncKey: string;
        id: string;
        name: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:update_color';
      payload: {
        syncKey: string;
        id: string;
        color: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:color_updated';
      payload: {
        syncKey: string;
        id: string;
        color: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:delete';
      payload: {
        syncKey: string;
        id: string;
        deletedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:deleted';
      payload: {
        syncKey: string;
        id: string;
        deletedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:add';
      payload: {
        syncKey: string;
        item: GroceryItem;
        senderId: string;
      };
    }
  | {
      type: 'item:added';
      payload: {
        syncKey: string;
        item: GroceryItem;
        senderId: string;
      };
    }
  | {
      type: 'item:toggle';
      payload: {
        syncKey: string;
        id: string;
        completed: boolean;
        completedBy?: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:toggled';
      payload: {
        syncKey: string;
        id: string;
        completed: boolean;
        completedBy?: string;
        updatedAt: number;
        senderId: string;
        itemText?: string;
      };
    }
  | {
      type: 'item:edit';
      payload: {
        syncKey: string;
        id: string;
        text: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:edited';
      payload: {
        syncKey: string;
        id: string;
        text: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:delete';
      payload: {
        syncKey: string;
        id: string;
        deletedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:deleted';
      payload: {
        syncKey: string;
        id: string;
        deletedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:move';
      payload: {
        syncKey: string;
        id: string;
        targetListId: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'item:moved';
      payload: {
        syncKey: string;
        id: string;
        targetListId: string;
        updatedAt: number;
        senderId: string;
      };
    }
  | {
      type: 'list:reorder';
      payload: {
        syncKey: string;
        itemIds: string[];
        senderId: string;
      };
    }
  | {
      type: 'list:clear';
      payload: {
        syncKey: string;
        listId?: string;
        mode: 'completed' | 'all';
        clearedAt: number;
        tombstonedIds: string[];
        senderId: string;
      };
    }
  | {
      type: 'list:cleared';
      payload: {
        syncKey: string;
        listId?: string;
        mode: 'completed' | 'all';
        clearedAt: number;
        tombstonedIds: string[];
        senderId: string;
      };
    }
  | {
      type: 'user:typing';
      payload: {
        syncKey: string;
        senderId: string;
        senderName?: string;
        isTyping: boolean;
      };
    }
  | {
      type: 'user:update_name';
      payload: {
        syncKey: string;
        senderId: string;
        userName: string;
      };
    }
  | {
      type: 'presence';
      payload: {
        syncKey: string;
        onlineCount: number;
        partnerNames?: string[];
      };
    };

export type SyncStatus = 'connected' | 'connecting' | 'offline';
