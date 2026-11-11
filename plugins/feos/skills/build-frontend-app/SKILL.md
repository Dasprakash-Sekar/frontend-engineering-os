---
name: build-frontend-app
description: Builds a complete new frontend application from approved requirements and architecture, in validated milestones - scaffold, structure and module boundaries, TypeScript standards, routing, API layer, state and server-state caching, layered error handling and error boundaries, authentication and authorization, accessible responsive UI, performance, security, tests, production readiness and documentation. Use after project-architect decisions are approved. Not for adding to an existing app (use develop-frontend-feature) or moving an existing app to another stack (use migrate-frontend-app).
argument-hint: [app description or reference to the approved plan]
---

# Build Frontend App

Input: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 0. Preconditions

- **Approved decisions are required**: application size, language, React version, framework, package manager, Node version, structure, state and data approach, auth approach, UI approach, testing approach. If any are missing, stop and run the `project-architect` workflow first. Do not fill gaps with defaults silently.
- **Confirm the target directory.** Never scaffold over an existing project or non-empty directory without approval.
- **Build to the approved size.** Everything below scales with it. Sections marked *medium and up* are skipped for a small application unless the plan says otherwise.

## How to work

Build in milestones. After each one: run the checks that exist (type check, lint, tests, build), fix failures before continuing, and tell the user briefly what now works. Never stack several unvalidated milestones.

| Milestone | Done when |
|---|---|
| 1. Scaffold | App starts, production build succeeds, lint and type check pass |
| 2. Skeleton | Routes render placeholder pages, layout and navigation work, 404 exists |
| 3. Foundations | API client, error handling, auth and state layers work end to end for one real request |
| 4. Features | Each feature complete with its states and tests, one at a time |
| 5. Hardening | Accessibility, performance, security and production checks done |
| 6. Documentation | README and environment documentation accurate |

## 1. Scaffold

- Use the official scaffolder for the approved stack with the approved package manager.
- Pin the approved React version. After install, verify the installed versions match.
- Configure the language, lint (including the React hooks rules), formatting if wanted, and path aliases.
- Pin the Node version (`engines` or a version file). Commit the lockfile.
- Save the approved ADRs to the repository.

## 2. Structure and module boundaries

Load the `frontend-architecture` skill if the structure is feature-based or layered, or if any boundary question comes up.

- Create the approved structure. Create a folder when there is a file to put in it; no empty folders or placeholder files.
- Dependencies point one way: app composes features, features use shared code, shared code knows nothing about features.
- Features do not import each other's internals. Each exposes a small public surface.
- Shared components receive data through props and do not call the API.

## 3. TypeScript standards

Where the project uses TypeScript:

- `strict` on. No `any` without a comment explaining why; prefer `unknown` and narrowing at boundaries.
- Type API responses at the client boundary; generate types from the API schema when one exists instead of writing them by hand.
- Model states that exclude each other as unions, not sets of booleans.
- Type component props explicitly. Do not export types nobody imports.
- No type assertions (`as`) to silence errors; fix the type or narrow.

## 4. Components and rendering

- Components are defined at module scope, never inside another component.
- Compute derived values during render; do not store them in state or sync them with effects.
- Effects are for external systems only, and always clean up.
- Lists use stable ids from the data as keys.
- Do not add `memo`, `useMemo` or `useCallback` without a measured or obvious cost.

Load the `react-internals` skill if a question about identity, effects, state reset or re-rendering comes up, or before using an API that depends on the React version.

## 5. Routing

- A route for every approved page, a not-found route, and code splitting at route boundaries.
- Protected routes guarded in one place. This is navigation convenience; the server enforces access.
- State that should survive reload or be shareable lives in the URL.

## 6. API layer

- One client module owns the base URL (from configuration), credentials, request cancellation, timeouts and conversion of every failure into one error shape.
- Features call typed functions; they do not call `fetch` directly or inspect raw responses.
- Preserve the API contract exactly. Do not invent or alter endpoints.

## 7. State and server state

Load the `frontend-state-architecture` skill before introducing shared state, a store, or the server-state layer.

- Classify each piece of state before placing it. Colocate by default.
- Server data goes through the approved server-state mechanism, with query keys that include everything the request depends on, and stated freshness per resource.
- Every mutation names what it invalidates.
- A global store only for genuinely shared client state. Never a copy of server data.

## 8. Error handling

Load the `frontend-resilience` skill when the app has remote data, which is nearly always.

Build the layers:

1. API client normalizes errors and applies timeouts and cancellation.
2. Data layer applies the retry policy: reads only, bounded, with backoff. No automatic retry of non-idempotent writes.
3. Each data view renders loading, error with a recovery action, empty, and success.
4. Error boundaries: one at the root as last resort, one per route, and around independent sections where the page is still useful without them.
5. One reporting function that every unexpected error goes through.

## 9. Authentication and authorization

Load the `frontend-security-audit` skill before implementing login, session handling, permissions, uploads, redirects, or rendering of user-supplied content.

- One module owns the session. Use the approved token storage; prefer HttpOnly cookies when the backend supports them.
- Express access as permissions checked through one function, not role names scattered through components.
- No secrets in client code or client-exposed variables.
- Clear user data and caches on logout.

## 10. UI

- Semantic HTML first. Every input has a label; every interactive element works by keyboard and has a visible focus state; images have text alternatives; color contrast meets the approved level.
- Manage focus on route change and when dialogs open and close.
- Responsive from the smallest supported width; no horizontal scrolling of the page.
- Consistent spacing, type and color through tokens or the chosen library.
- Animation only where it helps understanding, on `transform` and `opacity`, honoring `prefers-reduced-motion`.

## 11. Performance

- Route-level code splitting; lazy-load heavy components not needed at first paint.
- Images sized, dimensioned and in suitable formats; the main above-the-fold image is not lazy-loaded.
- No speculative optimization. If a performance target exists in the plan, measure against it.

Load the `frontend-performance-engineering` skill only when a target is being missed or a measurement is requested.

## 12. Tests

Load the `frontend-testing-strategy` skill for a medium or large application, or when the test approach is unclear.

- Tests for critical workflows and for logic with branches, using the approved tools.
- Test user-visible behavior, including error and empty states.
- Mock the network at the boundary, not the app's own modules.
- State what is deliberately not tested.

## 13. Production readiness

*Medium and up, or whenever a production release is in scope.* Load the `frontend-production-readiness` skill and complete its checklist, marking each item verified or not verified.

At minimum for every application: required configuration validated at startup, `.env.example` with variable names and no values, a production build that has actually been run and exercised.

Do not deploy.

## 14. Documentation

README covering: what the app is, prerequisites, setup, scripts, environment variable names with descriptions (never values), project structure and its rules, how to test, and deployment notes. Keep it accurate to what was built.

## 15. Validate and report

Run install, lint, type check, tests and the production build. Report each as passed, failed (with the relevant output) or not run (with the reason). Then list:

- What was built, by milestone.
- What was deliberately left out, and when it would be worth adding.
- Open risks and anything unverified.

## Do not add to a small application

Unless the approved plan calls for it: a global state library, a layered or domain architecture, a custom design system, a monorepo, micro-frontends, generic repository or service abstractions, a form library for simple forms, internationalization scaffolding, feature flags, or configuration for values that never change. Each of these solves a problem; add it when the problem exists.
