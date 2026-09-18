# List 2.0

A minimalist checklist app that syncs in real-time between partners. No accounts, no sign-up — share a private sync key (or a link) and two people see each other's edits instantly, with offline support and completion notifications.

## Features

- **Real-time sync** over WebSockets, keyed by a private "sync key" instead of user accounts
- **Multiple lists** per sync key, each with its own pastel color, that you can swipe between
- **Offline-first**: edits queue locally and flush to the server once the connection returns; state is cached in `localStorage`
- **Conflict-free merging**: last-write-wins reconciliation with tombstones for deletes, so two offline edits merge safely (see [src/utils/syncMerge.ts](src/utils/syncMerge.ts))
- **Live presence & typing indicators**, partner name, and toast notifications when your partner checks something off
- **Gestures**: drag to reorder, swipe left/right to switch lists, pull-down-and-hold to clear
- **Installable PWA** with a service worker for offline access and update checks on focus/resume
- **Undo** for deletes and moving items between lists

## Tech stack

- [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) + TypeScript
- [Express](https://expressjs.com/) + [`ws`](https://github.com/websockets/ws) for the HTTP + WebSocket backend
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [Motion](https://motion.dev/) (`motion/react`) for animations and drag-to-reorder
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) (Gemini API) available server-side
- File-based JSON storage per sync key under [data/lists](data/lists) — no database required

## Getting started

Requires Node.js and either `npm` or `bun` (a `bun.lock` is included).

```bash
npm install
npm run dev
```

This starts the Express + Vite dev server at `http://localhost:3000`. Open it in two browser tabs (or on two devices) to see live sync — both will share the same default sync key until you generate/share a different one from the app's sync menu.

### Environment variables

Copy `.env.example` to `.env` and fill in the values if you need Gemini API access:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for Gemini AI API calls |
| `APP_URL` | The URL this app is hosted at (self-referential links, callbacks) |

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Express + Vite middleware, WebSocket enabled) |
| `npm run build` | Build the client with Vite and bundle `server.ts` into `dist/server.cjs` |
| `npm start` | Run the production build (`node dist/server.cjs`) |
| `npm run preview` | Preview the built client with Vite |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run clean` | Remove build output |

## How syncing works

Each list "session" is identified by a **sync key** (e.g. `mint-leaf`), generated client-side or supplied via a `?key=` URL parameter and share link. The server keeps one JSON record per sync key in [data/lists](data/lists), containing:

- `lists` — the user-created lists for that key, each with its own tombstone set for deletions
- `items` — checklist items across all lists, tagged with `listId`
- `tombstones` — deleted item IDs with a deletion timestamp, pruned after 14 days
- `lastClearedAt` — timestamp of the last "clear all" action

Clients keep a full local copy in `localStorage`, apply changes optimistically, and reconcile with the server both over WebSocket (`sync:join`/`sync:reconcile`) and a REST fallback (`POST /api/sync/reconcile`) that also wakes up a cold-started server before the socket connects. Reconciliation is last-write-wins by `updatedAt`, so simultaneous edits on two devices converge without data loss.

## Project structure

```
server.ts                 Express app, WebSocket server, per-key JSON persistence & merge logic
src/
  App.tsx                 Top-level layout, gestures (swipe/reorder), modals wiring
  types.ts                Shared types: GroceryItem, UserList, WSEvent union, SyncStatus
  hooks/
    useGrocerySync.ts      All sync/state logic: WebSocket client, offline queue, CRUD actions
    useSystemTheme.ts       Tracks OS light/dark theme
  components/              Header, list tab bar, item rows, modals (create/rename/clear/sync), toast
  utils/
    syncMerge.ts            Last-write-wins merge + tombstone logic (shared shape with server.ts)
    pastels.ts               Per-list color palette assignment
    words.ts                  Human-readable sync key generator (e.g. "mint-leaf")
    audio.ts                   Completion sound + haptic feedback
data/
  lists/<key>.json          Persisted state per sync key
  groceries.json             Legacy single-list data file (migrated automatically)
public/
  manifest.json, sw.js, icon.svg   PWA assets
```

## Notes

- There is no authentication — anyone with a sync key (or share link) can read and write that list. Treat sync keys like a shared secret.
- Deleted items/lists are soft-deleted via tombstones for 14 days to allow safe merging across offline clients before being pruned.
