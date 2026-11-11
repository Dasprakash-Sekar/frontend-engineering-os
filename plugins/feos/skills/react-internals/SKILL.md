---
name: react-internals
description: Reference for how React actually renders - render and commit phases, reconciliation, Fiber, component identity, state preservation and reset, update queues and batching, effects and stale closures, memoization mechanics, context propagation, concurrent rendering, transitions, Suspense, the React Compiler, and version-specific APIs (useSyncExternalStore, useTransition, useDeferredValue, useOptimistic, useActionState, Server Components). Use when diagnosing unexpected re-renders, remounts, lost or stale state, effect loops, or when deciding whether an effect or memoization is needed. Not for measuring page performance (use frontend-performance-engineering) or choosing where state should live (use frontend-state-architecture).
argument-hint: [component, symptom, or question]
---

# React Internals

Question or symptom: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns the *mechanics* of React rendering: what triggers a render, what is preserved or destroyed, and when code runs.

It does not own:
- Whether a slow page is slow because of rendering at all, and how to measure it: `frontend-performance-engineering`.
- Which category a piece of state belongs to and which library holds it: `frontend-state-architecture`.
- How failures are classified and recovered from: `frontend-resilience`.

## 2. When to consult

- A component re-renders, remounts, or loses state and you cannot say why.
- State is stale inside a callback, timer or effect.
- An effect runs too often, loops, or runs twice.
- You are about to add `useEffect`, `memo`, `useMemo` or `useCallback`.
- You are about to use an API that exists only in some React versions.

Do not load this for routine component work that raises none of these questions.

## 3. Mental model

**Rendering is calling your function.** A render computes what the UI should be. It does not touch the DOM.

**Three things cause a component to render:** its own state changed, its parent rendered, or a context it reads changed. "Props changed" is not a trigger; a parent rendering is, and by default every child renders with it whether or not its props changed.

**Two phases.**

| Phase | What happens | Rules |
|---|---|---|
| Render | React calls components and diffs the result against the previous tree | Must be pure. May be paused, restarted or thrown away under concurrent rendering, so it may run more than once per commit |
| Commit | React applies DOM changes, attaches refs, runs layout effects, then the browser paints, then passive effects run | Synchronous and uninterruptible |

Order within a commit: DOM mutations, then `useLayoutEffect` (before paint, blocks it), then paint, then `useEffect`.

**Fiber.** Each component instance is a fiber: a node holding its type, props, state and hooks. React keeps a current tree and builds a work-in-progress tree, which is what makes rendering interruptible. The practical consequences are the ones in this document: hooks are stored by call order on the fiber (hence the Rules of Hooks), and state belongs to a *position in the tree*, not to your function.

**Reconciliation and identity.** For each position in the tree React compares the new element with the old one:

| Old vs new at the same position | Result |
|---|---|
| Same component type, same key | Instance kept, state preserved, re-rendered with new props |
| Different type | Old subtree unmounted (state destroyed, effects cleaned up), new one mounted |
| Same type, different key | Treated as a different instance: unmount and mount |

Among siblings, `key` is the identity. Without keys React uses position.

**State updates are queued.** `setState` does not change the variable in the running function. It schedules a render in which the value will be new. Updates are processed in order; updater functions (`setCount(c => c + 1)`) receive the result of the previous queued update. Setting a value that is `Object.is`-equal to the current one bails out.

**Batching.** Multiple updates in the same tick produce one render. From React 18 this applies everywhere, including promises, timeouts and native handlers. Before 18 it applied only inside React event handlers.

**Each render has its own snapshot.** Props, state and every function defined in the component belong to the render that created them. A callback captured by a timer or subscription keeps seeing that render's values. This is the entire cause of "stale closures".

**Context.** When a provider's value changes (by `Object.is`), every component reading that context re-renders, and `memo` does not stop it. There is no built-in selector.

**Concurrent rendering** (roots created with `createRoot`). React can prepare a new tree in the background, yield to urgent input, and abandon work in progress. Consequences: render must have no side effects; external mutable sources read during render can produce inconsistent UI unless read through `useSyncExternalStore`.

**Strict Mode** in development deliberately calls components twice and, from React 18, mounts, unmounts and remounts effects once. This exposes impure renders and missing cleanup. It does not happen in production. Never "fix" it by removing Strict Mode.

## 4. Decision criteria

**Do I need an effect?**

| You want to | Use | Not |
|---|---|---|
| Compute a value from props or state | Calculate during render (`useMemo` only if measured as costly) | State plus an effect that syncs it |
| Respond to a user action | The event handler | An effect watching a flag |
| Reset all state when an identity changes | A `key` on the component | An effect that calls setters |
| Adjust some state when a prop changes | Derive it, or store the minimal source (an id, not the object) | An effect |
| Subscribe to an external store | `useSyncExternalStore` | Effect plus `setState` |
| Fetch data | The project's data library or framework loader | A bare effect, unless the project has nothing else (then handle races and cleanup) |
| Synchronize with something outside React (DOM API, widget, socket, timer) | `useEffect` with cleanup | — this is what effects are for |
| Measure layout before paint, avoid a visible flicker | `useLayoutEffect` | `useEffect` |

**Should I memoize?**

1. Check whether the React Compiler is enabled (look for it in the build config). If it is, components and values are memoized automatically; do not add manual memoization without a specific, measured reason.
2. Otherwise memoize only when one of these is true:
   - A render is measurably slow and the component re-renders often with unchanged props.
   - A value is a dependency of an effect or another memo and must be referentially stable.
   - A context value object would otherwise be recreated every render.
3. `memo` works only if every prop is stable. One inline object, array, function or `children` element defeats it.
4. Before memoizing, try restructuring: move state down to the component that uses it, or pass expensive subtrees as `children` so they are created by a parent that does not re-render.

**State lost or wrongly kept?**

| Symptom | Cause | Fix |
|---|---|---|
| State resets unexpectedly | Component type or position changed between renders | Keep the same type at the same position; never define a component inside another component |
| State survives when it should reset (e.g. switching user) | Same type at same position | Give it a `key` tied to the identity |
| List item state attaches to the wrong row | Index keys on a list that reorders, inserts or removes | Stable id from the data |

**Urgent or not?**

| Need | Use |
|---|---|
| Keep input responsive while a large subtree updates, and you control the state update | `useTransition` / `startTransition` |
| Same, but the value comes from props or a library | `useDeferredValue` |
| Show a fallback while a subtree waits for code or data | `Suspense` |
| Show the expected result of a mutation before the server confirms | `useOptimistic` (React 19) or the data library's optimistic update; ownership of the rollback strategy: `frontend-state-architecture` |

Transitions make an update *interruptible*; they do not make the render faster.

## 5. Scenarios

**Input loses focus on every keystroke.** A component is defined inside another component's body. Each parent render creates a new function, which is a new *type*, so React unmounts and remounts the subtree. Move the component to module scope and pass what it needs as props.

**Form keeps the previous user's data after navigating to another user.** Same component at the same position, so state is preserved. Add `key={userId}` to the form.

**Counter in `setInterval` stops at 1.** The interval callback closed over the first render's `count`. Use the updater form (`setCount(c => c + 1)`), or include the dependency and re-create the interval with cleanup.

**Effect runs in an infinite loop.** The effect sets state that changes one of its own dependencies, usually an object or array recreated each render. Derive the value instead; if an effect is truly needed, depend on primitives.

**Data fetched twice in development.** Strict Mode remounting effects. Correct behavior. Make the effect safe to run twice by adding cleanup that ignores or aborts the first request.

**`memo` component still re-renders.** A prop is a new reference each time (inline `style={{}}`, `onClick={() => ...}`, `children`). Stabilize the prop, or restructure so the parent does not re-render.

**Everything re-renders when one field in a context changes.** A single context holds unrelated values in one object. Split it by rate of change, memoize the value object, or move fast-changing state to an external store read with selectors.

**Typing in a search box lags while filtering a long list.** The list render blocks the input update. Keep the input state urgent and derive the list from `useDeferredValue(query)`. If the list is very long, rendering fewer rows matters more: `frontend-performance-engineering`.

**UI briefly shows inconsistent values from a custom store.** The store is read directly during a concurrent render. Read it through `useSyncExternalStore`, and make `getSnapshot` return the same reference when nothing changed.

**Layout jumps after mount when positioning a tooltip.** Measurement happens in `useEffect`, after paint. Measure in `useLayoutEffect`.

## 6. Anti-patterns

- Defining components inside components.
- Storing in state something that can be computed from props or other state.
- `useEffect` whose only job is to call `setState` from other state.
- Disabling the exhaustive-deps lint rule to stop an effect running. Fix the dependency.
- Reading or writing refs during render.
- Mutating state or props in place.
- Using `key={Math.random()}` or index keys on dynamic lists.
- Wrapping everything in `memo`, `useMemo` and `useCallback` "to be safe".
- Side effects in the render body or in updater functions.
- Calling `flushSync` to work around ordering problems instead of fixing the data flow.

## 7. Version checks

Read the installed version from `package.json` and the lockfile before using any of these. When in doubt, confirm in the official React documentation for that version.

| API or behavior | Available from |
|---|---|
| `createRoot`, automatic batching everywhere, `useTransition`, `useDeferredValue`, `useId`, `useSyncExternalStore`, Strict Mode effect remount | React 18 |
| `use`, `useOptimistic`, `useActionState`, form Actions, `ref` as a normal prop, `<Context>` as provider | React 19 |
| `useFormStatus` | React 19, imported from `react-dom` |
| `useEffectEvent` | Check the installed version's docs; it was experimental for a long time before becoming stable |
| React Compiler | Separate build-time tool; present only if configured in the build. Confirm in the build config |
| Server Components, Server Functions (`"use server"`) | Only inside a framework that implements them. Not available in a plain client-rendered app |

Server Components specifics, where the framework supports them: they run only on the server, cannot use state, effects or browser APIs, and can only pass serializable props to Client Components. `"use client"` marks a boundary, not a single file's behavior: everything imported from that file becomes client code. Server Functions are public HTTP endpoints, so validate input and check authorization inside every one.

Error boundary mechanics, for reference: only class components can be boundaries; they catch errors thrown during rendering, in lifecycle methods and in constructors below them; they do not catch errors in event handlers, asynchronous code, or the boundary itself. Design of the boundary layout belongs to `frontend-resilience`.

## 8. Validation

Do not claim a rendering explanation or fix without evidence:

- Reproduce the symptom first. State the exact steps.
- Use React DevTools: the Profiler's "why did this render" information and "highlight updates" show what rendered; the Components tab shows whether an instance was preserved or replaced.
- If DevTools is unavailable, a temporary log in the render body and in an effect's setup and cleanup shows renders and mounts. Remember Strict Mode doubles them in development. Remove the logs afterwards.
- After the fix, repeat the steps and confirm the symptom is gone and no new renders or remounts appeared.
- Say plainly if you reasoned from the code without running it.
