---
name: frontend-resilience
description: Reference for making frontend applications fail safely and recover - classifying rendering, network, validation and business errors; React Error Boundary placement (app, route, component) and their limits; async and event-handler errors; API error normalization; timeouts; retries with exponential backoff and idempotency; cancellation with AbortController; offline handling; graceful degradation; fallback UX and recovery actions; centralized error reporting. Use when designing error handling, adding a new async flow, fixing a blank screen or unhandled rejection, or deciding whether and how to retry. Not for cache invalidation or optimistic rollback (use frontend-state-architecture) or monitoring setup (use frontend-production-readiness).
argument-hint: [flow, failure, or question]
---

# Frontend Resilience

Flow or failure: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns *what happens when something goes wrong*: how errors are classified, contained, shown, retried and reported.

It does not own:
- Cache invalidation, optimistic updates and their rollback: `frontend-state-architecture`.
- How error boundaries work internally: `react-internals`.
- Choosing and configuring a monitoring product, source maps, alerting: `frontend-production-readiness`.
- Input validation as a security control: `frontend-security-audit`.

## 2. When to consult

- Designing the error-handling approach for a new application.
- Adding a feature with requests, uploads, real-time connections or long operations.
- A failure blanks the whole screen, hangs forever, or disappears silently.
- Deciding whether a request should be retried.

Do not load this for a change with no new failure path.

## 3. Mental model

**Failure is a normal state, not an exception to design around later.** Every request can be slow, fail, time out, or return something unexpected. The design question is never "can this fail" but "what does the user see and what can they do next".

**Four kinds of error, four different responses.** Treating them alike is the root of most bad error handling.

| Kind | Example | Whose fault | Right response |
|---|---|---|---|
| Rendering | A component throws on `undefined.map` | Our bug | Contain with an error boundary, show a fallback, report it |
| Network / infrastructure | Offline, timeout, 502, 503 | Nobody's; transient | Tell the user, offer retry; retry automatically only if safe |
| Validation | Bad input, 400, 422 | The input | Show the message next to the field; do not report as an incident; never retry unchanged |
| Business | Insufficient balance, slot already taken, 409, 403 | A rule the user hit | Explain the rule and the next step in plain language; do not retry |

Authentication failure (401) is its own case: refresh the session once if the design supports it, otherwise send the user to sign in and preserve where they were.

**Contain the blast radius.** A failure should remove the smallest part of the UI that cannot work without the failed piece. A broken recommendations widget should not take down checkout.

**Every fallback needs a way forward.** Retry, go back, reload, contact support, or continue without the feature. A message with no action is a dead end.

**Silent failure is the worst failure.** A caught-and-ignored error leaves the user looking at wrong or missing data with no signal. Either handle it visibly or let it propagate to something that will.

## 4. Decision criteria

**What an Error Boundary catches**

| Catches | Does not catch |
|---|---|
| Errors thrown while rendering | Errors in event handlers |
| Errors in lifecycle methods and constructors below it | Errors in asynchronous code (promises, timers) |
| | Errors during server rendering |
| | Errors thrown in the boundary itself |

So a boundary alone is never a complete strategy. Event handlers and async code need their own handling. Many data libraries can re-throw a failed query during render so that a boundary catches it; check whether the project's library does and whether that option is on.

**Where to place boundaries**

| Level | Protects | Fallback |
|---|---|---|
| App root | Everything; last resort | Full-page message with reload; report the error |
| Route / layout | One page; navigation stays usable | Page-level message with retry and a way out |
| Feature or widget | An independent section whose failure should not affect siblings | Inline message or the section hidden, with retry |

Add a component-level boundary when the section is independent, fails for reasons the rest of the page does not share (third-party embed, experimental feature, risky rendering), and the page is still useful without it. Do not wrap every component: a boundary around something the page cannot function without just produces a broken page instead of an honest error.

Reset a boundary when what caused the error changes: a retry action, or a `key` tied to the route or input. Without a reset the fallback sticks after navigation.

Frameworks often provide route-level error handling (error elements or error files). Use the framework's mechanism where it exists instead of duplicating it.

**Event handlers and async code.** Wrap the awaited operation, set an error state the UI renders, and report unexpected errors. Unhandled promise rejections must not be the error-handling strategy. A global `unhandledrejection` listener is a safety net for reporting, not a substitute for handling.

**API error normalization.** Convert every failure into one shape at the API client, so features never inspect raw responses:

```ts
type AppError = {
  kind: 'network' | 'timeout' | 'aborted' | 'unauthorized' | 'forbidden'
      | 'not_found' | 'validation' | 'conflict' | 'rate_limited' | 'server' | 'unknown';
  message: string;            // safe to show
  status?: number;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
  cause?: unknown;            // original error, for reporting only
};
```

Adapt the fields to the backend's actual error contract. Never show raw server messages or stack traces to users. A response that parses but has the wrong shape is also an error: detect it at the boundary.

**Timeouts.** `fetch` has no default timeout. Set one for every request, sized to the operation: short for interactive reads, longer for uploads and reports. For long operations show progress and allow cancel.

**Retry: should I?**

| Condition | Retry automatically? |
|---|---|
| GET or other read; network error, timeout, 502, 503, 504 | Yes, a small number of times with backoff |
| 429 | Yes, after the delay the server gives (`Retry-After`) |
| 4xx other than 408 and 429 | No. The same request will fail the same way |
| Non-idempotent write (POST that creates, payment, send) | No, unless the server supports an idempotency key and you send one |
| Idempotent write (PUT, DELETE by id) | Usually safe; confirm with the API's semantics |
| User is offline | No. Wait for connectivity, then retry or let the user retry |

An unsafe automatic retry of a write can charge twice, send twice or create duplicates. When in doubt, do not retry automatically; offer a manual retry and make the outcome of the first attempt clear ("we could not confirm whether your order was placed").

**Retry: how.** Exponential backoff with jitter (for example about 1s, 2s, 4s, each randomized), a cap on attempts (two or three for interactive requests), and a cap on total time. Stop on abort and on non-retryable errors. Backoff without jitter makes many clients retry in step and prolongs an outage. If the project's data library already retries, configure it there; do not stack a second retry layer on top, or attempts multiply.

**Cancellation.** Create an `AbortController` per operation and pass its `signal` to the request. Abort when the component unmounts, the input changes, or the user cancels. Treat an abort as a non-error: do not show it or report it. Most data libraries pass a signal to the fetch function; use it so their cancellation actually stops the request.

**Race conditions in async UI**

| Race | Guard |
|---|---|
| Stale response overwrites a newer one | Abort the previous request, or ignore results whose request id is not the latest |
| State set after unmount | Abort in cleanup |
| Double submit | Disable the control while pending; idempotency key on the server |

Data-cache races (optimistic updates, refetch ordering): `frontend-state-architecture`.

**Offline**

| App need | Approach |
|---|---|
| Online-only app | Detect failure, say "you appear to be offline", keep what is on screen, retry on reconnect |
| Read while offline | Cache responses; label data as possibly out of date |
| Write while offline | Queue mutations, replay on reconnect, define conflict resolution. This is a significant feature; build it only when required |

`navigator.onLine` reports only whether a network interface exists. `false` is reliable; `true` does not mean the server is reachable. Treat real request failures as the signal.

**Graceful degradation.** Decide for each dependency whether the page can work without it:

| Dependency fails | Degrade to |
|---|---|
| Non-essential widget, analytics, recommendations | Hide it; continue |
| Feature flag or config service | Safe defaults built into the bundle |
| Image or avatar | Placeholder |
| Third-party script | The page works without it; never block rendering on it |
| Core data for the page | Honest error with retry; do not show an empty page as if there were no data |

**Fallback content.** Say what happened in plain words, what the user can do, and whether their work is safe. Preserve entered data across a failure. Distinguish "nothing here" (empty) from "could not load" (error): they need different messages and only one needs a retry button.

**Reporting.** Report in one place, through one function, with context (route, action, release version, a user identifier that is not personal data). Report rendering errors and unexpected failures. Do not report validation errors, expected business errors or aborts as incidents; they bury real signals. Never send passwords, tokens or personal data in error context.

## 5. Scenarios

**White screen in production after a deploy.** A render error with no boundary below the root, or no root boundary at all. Add a root boundary as last resort and route-level boundaries so navigation survives. Report the error with the release version.

**"Loading..." forever.** The request has no timeout, or its rejection was swallowed. Add a timeout and render the error state.

**Clicking "Pay" twice on a slow network charges twice.** No pending guard and no idempotency. Disable the button while pending and send an idempotency key; do not auto-retry.

**Old search results replace new ones.** Earlier request resolved last. Abort the previous request when the query changes.

**Error boundary did not catch a failed save.** The error was thrown in an event handler. Handle it there and set error state.

**After one widget fails, the whole dashboard shows the app-level error page.** No boundary around independent sections. Add one per widget with an inline retry.

**Fallback stays after navigating to another page.** The boundary was never reset. Key it by route or reset on navigation.

**Outage gets worse as traffic returns.** Every client retries immediately and indefinitely. Add backoff with jitter and a cap.

**Console shows "Uncaught (in promise)".** A promise without handling. Handle it where the operation starts.

**User sees "Error: Request failed with status code 500".** Raw error shown. Normalize and show a safe message with an action.

## 6. Anti-patterns

- `catch` blocks that do nothing, or only log to the console.
- One generic "Something went wrong" for every kind of error, with no action.
- Retrying non-idempotent requests automatically.
- Retrying 4xx responses.
- Unbounded retries, or retries without backoff.
- Retry logic in both the API client and the data library.
- Treating an aborted request as an error.
- Showing an empty state when the data failed to load.
- A single app-level boundary as the only containment.
- Boundaries around every component.
- Blocking the page on a third-party script.
- Trusting `navigator.onLine === true`.
- Reporting expected validation errors as exceptions.
- Losing the user's form input when a submit fails.

## 7. Version checks

Error-handling mechanisms depend on the stack. Confirm in the installed versions' official documentation: how the framework or router expresses route-level errors; whether the data library can throw errors to boundaries, what its default retry count is, and how it passes an abort signal; and which React version is installed, since error-reporting hooks on the root differ between versions.

## 8. Validation

Force each failure and observe the result. Do not infer resilience from reading the code.

- Throw inside a component: the nearest boundary shows its fallback, siblings keep working, and retry recovers.
- Offline mode and network throttling in browser DevTools: offline message, no infinite spinner, recovery on reconnect.
- Mock 400, 401, 403, 404, 409, 429, 500 and a malformed body: each shows the right message and action.
- Delay a response past the timeout: the timeout fires.
- Change input rapidly, navigate away mid-request, double-click submit: no stale data, no duplicate request, no state update after unmount.
- Confirm reports arrive for unexpected errors and do not arrive for validation errors and aborts.

Report which of these were actually exercised and which were not.
