---
name: frontend-performance-engineering
description: Reference for measuring, diagnosing and improving frontend performance - establishing baselines; Core Web Vitals (LCP, INP, CLS); the critical rendering path and layout, paint and compositing; network waterfalls; bundle analysis, tree shaking, code splitting and lazy loading; image and font optimization; React Profiler and render cost; virtualization; long tasks and Web Workers; memory leaks; caching and prefetching. Use when a page or interaction is slow, a bundle is too large, a Web Vitals metric is failing, memory grows, or before claiming something is optimized. Enforces measure-first. Not for explaining why React re-renders (use react-internals) or for animation frame jank specifically.
argument-hint: [page, interaction, or metric]
---

# Frontend Performance Engineering

Target: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns *finding out what is slow, proving why, and proving the fix worked*.

It does not own:
- The rules of React rendering, component identity and memoization mechanics: `react-internals`.
- Cache freshness and invalidation design: `frontend-state-architecture`.
- Build pipeline configuration and production monitoring setup: `frontend-production-readiness`.

## 2. When to consult

- A page loads slowly or an interaction feels slow.
- A bundle, a metric or memory use is over budget.
- Someone proposes an optimization and there is no measurement behind it.

Do not load this to add `memo` to a component nobody has measured.

## 3. Mental model

**Measure, then change one thing, then measure again.** Intuition about performance is wrong often enough that an unmeasured optimization is a guess that adds complexity. The method is fixed:

1. Define the problem as a number: which metric, on which page or interaction, on what device and network.
2. Record a baseline under repeatable conditions.
3. Find the largest contributor. Fix that first.
4. Make one change.
5. Measure again under the same conditions.
6. Keep the change only if the number improved meaningfully. Record before and after.

**Lab and field measure different things.** Lab tools (Lighthouse, DevTools) give repeatable, diagnosable numbers on a simulated device. Field data (real-user monitoring) shows what users actually experience across real devices and networks. Use lab data to diagnose and field data to decide what matters. INP especially is a field metric; lab runs only approximate it.

**Test on conditions like your users'.** A developer laptop on fast Wi-Fi hides most problems. Throttle CPU and network. Test a production build; development builds are much slower and unrepresentative.

**Where time goes during load**

```
navigation -> HTML (TTFB) -> parse HTML -> discover CSS/JS/fonts/images
           -> download and execute (render-blocking resources delay first paint)
           -> first render -> LCP element painted -> hydration / JS runs -> interactive
```

**Where time goes during an interaction**

```
input -> event handlers (JS) -> framework render -> style -> layout -> paint -> composite -> next frame
```

Anything on the main thread longer than about 50 ms is a long task and delays the response to input. Changing layout-affecting properties forces layout and paint; changing only `transform` or `opacity` can be handled by the compositor.

**Core Web Vitals**

| Metric | Measures | Good (75th percentile) | Usual causes |
|---|---|---|---|
| LCP, Largest Contentful Paint | When the main content appears | At or under 2.5 s | Slow server response, render-blocking CSS or JS, late-discovered or unoptimized hero image, client-side rendering of above-the-fold content |
| INP, Interaction to Next Paint | Responsiveness to input across the visit | At or under 200 ms | Long tasks, heavy handlers, large synchronous renders, hydration, third-party scripts |
| CLS, Cumulative Layout Shift | Unexpected movement of content | At or under 0.1 | Images or embeds without dimensions, late-loading fonts, content inserted above existing content |

Confirm current thresholds in the official Web Vitals documentation; they are occasionally revised.

## 4. Decision criteria

**Which tool for which question**

| Question | Tool |
|---|---|
| Overall page health, quick list of opportunities | Lighthouse (lab) |
| What blocks loading, what loads late | DevTools Network panel, waterfall |
| What runs on the main thread, long tasks, layout thrash | DevTools Performance panel |
| Which components render, how long, why | React DevTools Profiler |
| What is in the bundle | The bundler's analyzer or visualizer |
| Does memory grow | DevTools Memory panel, heap snapshots |
| What real users experience | Real-user monitoring with the `web-vitals` library or a monitoring product |

**Slow load: diagnose in this order**

| Check | If bad | Fix |
|---|---|---|
| Server response time (TTFB) | Backend, no caching, no CDN | Fix at the server or edge; the frontend cannot compensate |
| Render-blocking resources | Large synchronous CSS or scripts in `<head>` | Defer or async scripts, split CSS, inline only what the first view needs |
| LCP resource discovery | Hero image referenced from CSS or loaded by JS | Put it in the HTML, preload it, set high fetch priority; never lazy-load the LCP image |
| LCP resource size | Oversized or wrong format | Responsive `srcset` and `sizes`, modern formats, correct dimensions, compression |
| JavaScript size and execution | Large initial bundle | Split by route, lazy-load below-the-fold and rarely used code, remove or replace heavy dependencies |
| Request waterfall | Requests that wait on each other | Fetch in parallel, fetch at the route level, preload |
| Rendering strategy | Blank page until JS runs | Consider server rendering or prerendering for content pages; this is an architecture decision, not a tweak |

**Slow interaction: diagnose in this order**

1. Record the interaction in the Performance panel with CPU throttling. Find the long task.
2. Is the time in your handler, in React rendering, or in style and layout?
3. Handler: move work out of the handler, do less, or defer non-urgent work.
4. React rendering: use the Profiler to see what rendered and why. Then, in order of preference: render less (move state down, split components), render fewer items (virtualize, paginate), mark the update non-urgent (transition or deferred value), and only then memoize. Mechanics: `react-internals`.
5. Layout: avoid reading layout (`offsetHeight`, `getBoundingClientRect`) after writing styles in the same frame; batch reads then writes.
6. Still too heavy and not DOM work: move computation to a Web Worker.

**Bundle size**

- Analyze before acting. The biggest box in the analyzer is the first target.
- Split at routes first; that alone usually gives most of the gain.
- Lazy-load heavy components that are not needed at first paint: editors, charts, maps, modals.
- Tree shaking needs ES modules and side-effect-free packages. Import the specific function, and check that the library supports it; a namespace import from a non-shakeable package pulls in everything.
- Look for duplicates (two versions of the same library) and for large dependencies used for one small function.
- Do not over-split: many tiny chunks add request overhead and waterfalls.

**Images and fonts**

| Asset | Do |
|---|---|
| Images | Set `width` and `height` (or aspect-ratio) to reserve space; serve the size actually displayed; modern formats; lazy-load below the fold only |
| Fonts | Self-host or preconnect; preload the one or two critical files; `font-display: swap` or `optional`; subset; limit weights. Metric-compatible fallbacks reduce shift |

**Long lists.** Rendering thousands of DOM nodes is slow regardless of memoization. Paginate, or virtualize so only visible rows exist. Virtualization costs: in-page find, accessibility and variable heights need care. Use it when the list is actually long (hundreds of rows or more), not by default.

**Memory leaks: usual suspects**

- Event listeners, intervals, timeouts, observers and subscriptions without cleanup.
- Closures or module-level caches that keep large data or detached DOM nodes alive.
- Unbounded caches.

Confirm with heap snapshots: perform an action, undo it, force garbage collection, snapshot; repeat several times. Retained growth across cycles is a leak.

**Caching and prefetching**

| Technique | Use when |
|---|---|
| Long-lived HTTP caching for content-hashed assets | Always, for hashed files. The HTML document must not be cached long |
| CDN | Static assets, always; pages where possible |
| Prefetch next route's code or data on hover or viewport | Navigation targets that are likely; watch data cost on mobile |
| `preconnect` | A third-party origin needed early |
| `preload` | A critical resource the browser discovers late. Overuse competes with other critical resources |
| Service worker caching | Repeat visits and offline needs justify the complexity and the update risk |

**Is it worth optimizing?** Yes when a user-facing metric is over budget, or users or data report a problem. No when the number is already good, the change adds complexity for an unmeasured gain, or the slow path is rarely used. Stop when the target is met.

## 5. Scenarios

**LCP of 4.8 s on a marketing page.** Waterfall shows the hero image starts after the JS bundle runs, because the page is client-rendered and the image is lazy-loaded. Put the image in the server-rendered or static HTML, remove lazy loading from it, preload it and size it correctly. Measure again.

**Typing in a filter box lags.** Profiler shows 2,000 rows re-rendering per keystroke. Virtualize the list; keep the input urgent and defer the filtered result. Memoizing rows alone would not fix 2,000 DOM nodes.

**Initial JS is 1.4 MB.** Analyzer shows a charting library, a date library with all locales, and an editor on the main chunk. Lazy-load the chart and editor at their routes; import only needed locales or replace the date library.

**Layout shifts as the page loads.** Images without dimensions and a banner injected at the top. Reserve space with dimensions and a min-height for the banner slot.

**Memory climbs during a long session on a dashboard.** A polling interval and a resize listener are never cleaned up; each visit to the page adds another. Add cleanup; confirm with heap snapshots across navigation cycles.

**"We added `useMemo` everywhere and it is not faster."** No measurement identified render cost as the problem. Profile first; remove memoization that does not move the number.

**INP is poor only in field data.** Lab runs on a fast machine look fine. Throttle CPU by 4x to 6x, record real interactions, and check third-party scripts; real devices are far slower.

**Scroll stutters.** A scroll handler reads layout and writes styles each event. Use passive listeners, `IntersectionObserver`, or CSS; batch reads and writes.

## 6. Anti-patterns

- Optimizing without a baseline.
- Reporting an improvement without before and after numbers.
- Measuring a development build, or only on a fast machine and network.
- Changing several things at once and not knowing which helped.
- `memo`, `useMemo` and `useCallback` applied broadly instead of where measured.
- Lazy-loading the LCP image or above-the-fold content.
- Preloading everything.
- Importing a whole library for one function.
- Splitting into dozens of tiny chunks.
- Virtualizing short lists.
- Chasing a Lighthouse score instead of a user-facing metric.
- Treating a single lab run as truth; results vary between runs.

## 7. Version checks

Confirm in the installed versions' official documentation: the bundler's code-splitting and analysis tooling (it differs between bundlers and major versions); the framework's image, font and script components and its rendering modes; whether the React Compiler is enabled, which changes what manual memoization is worth; and current Web Vitals definitions and thresholds.

## 8. Validation

A performance claim needs all of the following, or it must be stated as unverified:

- The metric and the scenario measured.
- The conditions: production build, device or throttling profile, network profile, cold or warm cache.
- Baseline number and after number, each the median of several runs.
- The single change made between them.
- A check that behavior did not regress: tests pass, and the page still works.

If measurement tools are not available in the session, say so, describe the expected effect as a hypothesis, and give the user the exact steps to measure it.
