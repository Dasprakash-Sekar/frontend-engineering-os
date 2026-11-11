---
name: frontend-state-architecture
description: Reference for designing correct, predictable frontend state - classifying state as local UI, shared client, server, URL, form or persistent; colocation and ownership; derived state; normalization; server-state caching, query keys, invalidation, stale data, deduplication, pagination and infinite queries; optimistic updates and rollback; data race conditions; synchronizing state across tabs and sources. Covers TanStack Query and Zustand as examples without assuming them. Use when deciding where state should live, choosing a state or data library, designing cache invalidation, or fixing duplicated, stale or out-of-sync state. Not for React render mechanics (use react-internals) or request retry and cancellation mechanics (use frontend-resilience).
argument-hint: [state, feature, or question]
---

# Frontend State Architecture

State or question: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns *what kind of state something is, who owns it, and how it stays correct over time*.

It does not own:
- Why a state change causes a particular render or remount: `react-internals`.
- Retry policy, timeouts, `AbortController` mechanics and error classification: `frontend-resilience`.
- Whether tokens belong in storage or cookies: `frontend-security-audit`.

## 2. When to consult

- Introducing state that more than one component needs.
- Choosing or questioning a state or data-fetching library.
- Data on screen is stale, duplicated, or disagrees with another part of the screen.
- Designing a mutation: what to invalidate, whether to update optimistically.

Do not load this for a `useState` that one component owns.

## 3. Mental model

**Classify first, choose tools second.** Most state problems come from treating one category as another, especially treating server data as client state.

| Category | What it is | Source of truth | Typical home |
|---|---|---|---|
| Local UI | Open/closed, hover, input draft, selected tab | The component | `useState` / `useReducer` in the component |
| Shared client | UI state several distant components need: theme, sidebar, wizard progress, selection across panes | The client | Lifted state, context, or a small store |
| Server | Data owned by the backend that the client merely caches | The server | A server-state library or framework loader |
| URL | State that must survive reload, be shareable, or respond to back/forward: filters, page, selected id, tab | The URL | Router params and search params |
| Form | Values, touched, errors, submission status | The form, until submitted | Native form, component state, or a form library for complex forms |
| Persistent | Preferences or drafts that outlive the session | Browser storage or the server | `localStorage` / IndexedDB, or a server setting |

**Server state is a cache, not state you own.** It can be stale the moment it arrives, other users change it, and it needs loading, error, refetch, deduplication and invalidation. Copying it into a client store creates a second source of truth that must then be synchronized by hand. That hand-synchronization is where the bugs are.

**One source of truth per fact.** If the same fact exists in two places, they will disagree. Store it once; derive everything else.

**Colocate.** State lives in the lowest component that covers every consumer. Lift only when a second consumer appears. State placed too high re-renders more than necessary and couples unrelated components.

**Store the minimum.** Keep ids and raw inputs; compute the rest during render. `selectedId` is state. `selectedItem` is `items.find(...)`.

## 4. Decision criteria

**Where does this state go?** Ask in order and stop at the first yes:

1. Does it come from the server? It is server state. Use the project's data layer.
2. Should it survive reload or be shareable by link? Put it in the URL.
3. Is it form input before submission? Form state.
4. Does only one component, or a parent and its children, use it? Local state, lifted as far as needed.
5. Do distant parts of the tree need it? Shared client state. Start with context if it changes rarely; use a store if it changes often or has many consumers.
6. Must it outlive the session? Persist it, and decide what happens when the stored shape is old or invalid.

**Do I need a library?**

| Need | Start with | Add a library when |
|---|---|---|
| Server data | What the framework provides, if it has loaders or built-in caching | You need caching, deduplication, background refetch, pagination or mutations and nothing installed provides them. A server-state library such as TanStack Query fits |
| Shared client state | Lifted state, then context | Updates are frequent, consumers are many, or you need selectors to limit re-renders. A small store such as Zustand fits |
| Forms | Native form handling and component state | Many fields, cross-field validation, dynamic field arrays, or performance problems from controlled inputs |

Use what the repository already has before adding anything. Do not add a global store to hold server data, and do not add a store to avoid passing a prop through two levels.

**Context versus store**

| | Context | External store |
|---|---|---|
| Re-renders | Every consumer on any value change | Only components whose selected slice changed |
| Good for | Rarely changing values: theme, locale, current user, dependency injection | Frequently changing shared state |
| Cost | None to install; splitting needed as it grows | A dependency and a pattern to learn |

**Derived state**

- Compute during render. Memoize only when measured as expensive.
- Never copy props into state unless the intent is explicitly "initial value only", and name the prop accordingly (`initialValue`).
- If two state variables must always change together, they are one state. If some combinations are impossible, model the valid states explicitly (a status union instead of three booleans).

**Normalization.** Normalize (entities by id, plus lists of ids) only for client-owned collections that are edited in several places. For server data, let the server-state cache hold responses as returned; normalizing a cache by hand recreates the synchronization problem.

**Query keys.** A key must contain everything the request depends on: resource, id, filters, page, and anything else that changes the result. A missing variable in the key shows one user's or one filter's data for another. Build keys from one factory per resource so invalidation can target them reliably.

**Staleness.** Decide per resource how fresh data must be:

| Data | Freshness setting |
|---|---|
| Changes rarely (reference lists, config) | Long stale time; refetch seldom |
| Changes by the user's own actions | Invalidate on the related mutation |
| Changes by others, and correctness matters (stock, balances) | Short stale time, refetch on focus, or push updates |
| Must never be shown stale (confirmation of a payment) | Fetch fresh; do not serve from cache |

A library's default is a default, not a decision. State the choice.

**Invalidation after a mutation.** List what the mutation changes on the server, then choose:

| Strategy | Use when | Risk |
|---|---|---|
| Invalidate and refetch affected queries | Default. Simple and correct | Extra requests; brief stale view until refetch |
| Write the mutation response into the cache | The response contains the full updated entity | Lists, counts and aggregates containing that entity still need invalidating |
| Optimistic update | The action nearly always succeeds and instant feedback matters (toggle, like, reorder) | Rollback complexity; wrong UI if the server disagrees |

Invalidate by the broadest key that is correct. Forgetting a dependent list or count is the common bug.

**Optimistic updates.** Use only when all are true: failure is rare, the result is predictable without the server, and a wrong intermediate state is harmless. Never for payments, irreversible actions, or results the server computes. The sequence:

1. Cancel in-flight fetches for the affected keys so they cannot overwrite the optimistic value.
2. Snapshot the current cache.
3. Apply the optimistic value.
4. On error, restore the snapshot and tell the user.
5. On settle, invalidate to reconcile with the server.

**Pagination and infinite lists**

| Pattern | Use when |
|---|---|
| Page numbers in the URL | Users need to jump, share or return to a page; tables |
| Cursor-based infinite query | Feeds, or data that changes while browsing (offset pagination skips or repeats rows when items are inserted) |

Keep the previous page visible while the next loads to avoid layout flashes. Long infinite lists need virtualization: `frontend-performance-engineering`. Reset pagination when filters change, and put the filter in the query key.

**Data races**

| Race | Guard |
|---|---|
| Slow response for an old input arrives after a newer one | Key requests by input so the cache serves only the current key; cancel superseded requests |
| Refetch overwrites an optimistic update | Cancel in-flight queries before applying it |
| Two mutations on the same entity | Serialize them, disable the control while pending, or send a version for the server to reject stale writes |
| Double submit | Disable while pending; make the endpoint idempotent where possible |
| Response arrives after unmount or navigation | Cancellation or ignoring the result (mechanics: `frontend-resilience`) |

**Synchronization**

- Across tabs: the `storage` event or `BroadcastChannel` for logout, theme and similar; refetch on window focus for server data.
- With the URL: the URL is the source; do not mirror it into state and sync both ways. Read it, and write to it on change.
- With storage: read once at startup, validate the shape, write on change. Storage is an external system; read it through a store or `useSyncExternalStore`, not during render.
- Real-time updates: apply server pushes to the same cache queries use, so there is still one source of truth.

## 5. Scenarios

**List shows old data after editing an item on a detail page.** The mutation updated the detail query but not the list. Invalidate the list key as well.

**User A's data flashes when user B logs in.** Query keys do not include the user or tenant, or the cache is not cleared on logout. Clear the cache on logout; include identity in keys where data is per-user.

**A Redux or Zustand slice holds `users`, `usersLoading`, `usersError`, with effects that refetch.** Server state managed by hand. Move it to the server-state layer; keep the store for client state only.

**Filters reset on refresh and cannot be shared.** Filter state lives in component state. Move it to search params.

**Two components show different totals for the same cart.** The total is stored in two places. Store line items once and derive the total.

**Search results show the previous query's results.** A slow earlier response landed last. Key by query and cancel superseded requests.

**Toggling a "like" flickers back and forth.** A background refetch overwrote the optimistic value. Cancel in-flight queries first, and reconcile on settle.

**`isLoading`, `isError` and `data` allow impossible combinations.** Model one status union: idle, loading, success, error.

**Whole app re-renders on every keystroke in a search box.** Input state is held in a top-level context. Colocate it with the input; publish only the committed value.

## 6. Anti-patterns

- Copying server responses into a client store.
- A global store as the default home for all state.
- Mirroring props into state and syncing with an effect.
- Two-way sync between the URL and component state.
- Storing values that can be derived.
- Query keys that omit a variable the request uses.
- Optimistic updates for irreversible or server-computed outcomes.
- Invalidating "everything" after each mutation to hide not knowing what changed.
- Booleans that together encode impossible states.
- Persisting state with no version or validation, then crashing on an old shape.
- Putting sensitive data in `localStorage` (ownership of that decision: `frontend-security-audit`).

## 7. Version checks

Data and state libraries change their APIs between major versions (option names, hook signatures, default behaviors such as stale time and refetch triggers). Read the installed version, and confirm option names and defaults in that version's official documentation before writing configuration. Framework-provided data loading (loaders, server components, built-in fetch caching) differs by framework and version; check which mechanism the project actually uses before adding a client-side cache alongside it.

## 8. Validation

- For each new piece of state, state its category, owner and source of truth in one line. If you cannot, the design is not finished.
- For each mutation, list the queries it affects and show that each is invalidated or updated.
- Test the races you guarded: slow network (throttle), rapid input changes, double click, navigation during a request, failure of an optimistic update.
- Reload and deep-link to confirm URL state restores the view.
- Report which of these you ran and which you reasoned about.
