---
name: migrate-frontend-app
description: Migrates a frontend application between frameworks, build tools or major versions (for example Next.js to Vite + React, Create React App to Vite, a React major upgrade) while preserving functionality and business logic. Inventories the source, checks dependency and React-version compatibility, flags incompatible features for decisions, records a baseline, migrates incrementally with a rollback point at every step, verifies against the baseline, and reports gaps. Never deletes the original implementation without approval. Use for stack migrations and major upgrades. Not for ordinary feature work or dependency patch updates.
argument-hint: [source -> target, e.g. "Next.js -> Vite + React"]
---

# Migrate Frontend App

Migration: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

**Three rules that hold throughout:**

1. The original implementation stays intact and runnable until the user approves removing it.
2. Behavior is preserved: business logic, API contracts, route paths and user workflows do not change as a side effect. A migration is not the moment to redesign.
3. Every step can be undone.

## 1. Confirm the goal

State why the migration is happening and what success means. If the reason is vague ("it is more modern"), say what the migration will cost and ask whether a smaller change would meet the real need. Some migrations should not happen; say so when the evidence points that way.

Identify the kind:

| Kind | Main risk |
|---|---|
| Framework change (e.g. server-rendering framework to client-rendered app) | Losing server features: rendering, data loading, API routes, middleware |
| Build tool change (e.g. CRA to Vite) | Configuration, environment variables, asset handling, test runner |
| React major upgrade | Removed APIs, changed behavior, incompatible dependencies |
| Router or state library change | Every route or every consumer changes |

## 2. Inventory the source (read-only)

Record each of these. Do not change anything yet.

- **Routes**: every path, layouts, dynamic segments, redirects, rewrites, guards, not-found handling.
- **Rendering**: which pages are server-rendered, static, or client-rendered, and which rely on that for SEO or first-load speed.
- **Framework-specific APIs in use.** For Next.js, for example: Server Components, Server Functions, `getServerSideProps`, `getStaticProps`, incremental regeneration, API routes and route handlers, middleware, the image, link, font and head or metadata APIs, and headers and rewrites in the config. For other frameworks, the equivalent list.
- **Dependencies**: each with its version, and whether it is tied to the source framework or to a React version.
- **State**: libraries, global stores, server-state layer, persisted state and its storage format.
- **Authentication and authorization**: how sessions are created, stored, refreshed and checked, and whether any of it runs on the framework's server side.
- **API integration**: client code, contracts, and any backend-for-frontend logic living in the frontend repository.
- **Styling and assets**: approach, global styles, fonts, images, static files.
- **Environment variables**: names only, never real values. Note which are server-only and which are client-exposed.
- **Tests**: what exists, at which levels, and whether they assert behavior or implementation.
- **Build and deployment**: commands, hosting, headers, redirects, server requirements.

## 3. Check compatibility

Load the `react-internals` skill to check React-version-specific APIs and behavior changes.

**Dependency compatibility matrix.** For each dependency:

| Dependency | Current | Works with target? | Action |
|---|---|---|---|
| name | version | yes / needs upgrade to X / no equivalent | keep / upgrade / replace with Y / remove |

Check each against its own documentation or release notes for the target React and framework versions. Do not assume. Flag any with no compatible version; these can block the migration.

**For a React major upgrade**, additionally: read the official upgrade guide for the target version; list removed and deprecated APIs found in the codebase; note behavior changes (for example batching, Strict Mode effect behavior, ref handling); run the official codemods where they exist and review their output; and upgrade one major version at a time.

**Environment variables.** Map prefixes to the target's convention (for example `NEXT_PUBLIC_*` to `VITE_*`). A server-only variable must never become a client-exposed one. If server-side code used a secret, that code needs a server to live on; it cannot move into the client.

## 4. Decide on what does not carry over

Produce the migration checklist as a table: item, how the source does it, target approach, status. Mark every feature with no direct equivalent and **ask the user to decide** each one. Typical decisions:

| Feature lost | Options to offer |
|---|---|
| Server rendering for SEO or first-load speed | Prerender those pages; keep them on a server-rendering solution; accept client rendering with the stated cost |
| API routes or server functions | Move to a separate backend or serverless functions; keep a thin server |
| Middleware (auth, redirects, headers) | Hosting-level rules; a backend; client-side guards plus server enforcement |
| Server-side session handling | Move to the backend; redesign token handling (load the `frontend-security-audit` skill for this decision) |
| Image optimization | A CDN or image service; build-time optimization; plain responsive images |

If the application depends heavily on server rendering, say plainly that the target may be the wrong choice before work starts.

Load the `frontend-architecture` skill if the target requires a different project structure or routing model, and the `frontend-state-architecture` skill if state or data-fetching libraries change.

## 5. Record a baseline

Before changing anything, capture what "the same as before" means:

- The full route list with what each shows.
- The key user workflows, as steps that can be repeated.
- Results of the existing lint, type check, tests and build.
- Bundle size of the production build, and load-performance numbers for the main pages if tooling is available.
- Screenshots of key pages if the visual result matters.

Load the `frontend-testing-strategy` skill to plan regression coverage. If behavior-level tests are thin, add characterization tests for the critical workflows on the *source* first, so they can be run against the target. Tests coupled to the source framework's internals will not survive and do not count.

State which baseline items could not be captured.

## 6. Plan the increments and the way back

Choose the approach:

| Approach | Use when |
|---|---|
| In place, step by step | Version upgrades and build-tool changes where the app stays runnable at each step |
| New app alongside, feature by feature | Framework changes; the source keeps running until cutover |
| Both running in production, routes moved gradually | Large applications where a single cutover is too risky; needs routing support at the host |

For each step define: what changes, how it is validated, and how to undo it. Work on a branch or in a new directory. Commit at each validated step so there is always a known-good point to return to. Present the plan and get approval.

## 7. Migrate incrementally

Typical order:

1. Scaffold or reconfigure the target; get an empty app building.
2. Configuration, environment variables, aliases, lint and test tooling.
3. Routing shell: every path resolves, with placeholder content, guards and not-found handling.
4. Shared code: components, styles, utilities, API client.
5. State and data layer.
6. Features, one at a time, most independent first.
7. Authentication and authorization.
8. Remaining gaps from the checklist.

Rules while migrating:

- Replace framework APIs with their target equivalents; do not rewrite business logic while moving it.
- Keep route paths and API calls identical unless a change was approved.
- Validate after every step: build and type check at minimum, plus the tests for the area moved.
- If a step fails and the cause is not quickly found, return to the last good commit instead of pushing forward on a broken base.
- Update the checklist status as you go.

## 8. Verify against the baseline

- Run lint, type check, tests and the production build on the target.
- Walk every route in the baseline list and every key workflow, including direct links and refresh.
- Compare bundle size and load performance with the baseline. Explain significant differences in either direction. Load the `frontend-performance-engineering` skill if the target is measurably worse.
- Check authentication end to end: sign in, expiry, sign out, protected routes, each role.
- Check that no server-only variable or secret reached the client bundle.

## 9. Deployment implications

List what must change, without performing it: build command and output directory, routing fallback for client-side routes, headers and redirects previously handled by the framework, server requirements added or removed, environment variable names per environment, caching rules, and monitoring configuration. Load the `frontend-production-readiness` skill when planning the cutover.

Recommend a cutover with a way back: keep the source deployable, switch traffic, watch error rates and key workflows, and define what would trigger switching back.

## 10. Report

- Checklist with the final status of every item.
- Dependency matrix with actions taken.
- Validation results: each of lint, type check, tests and build as passed, failed (with output) or not run (with the reason).
- Baseline comparison: routes, workflows, bundle size, performance, with what was and was not measured.
- Remaining gaps and decisions still needed.
- Deployment changes required, none of which were performed.
- Rollback: how to return to the source at this point.

Do not delete the source implementation. Ask for approval, and only after the target has been verified.
