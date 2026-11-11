---
name: develop-frontend-feature
description: Implements or changes a feature in an existing frontend application with engineering-level analysis first - traces the full workflow and existing code, identifies state ownership, rendering implications, API contract, race conditions, failure scenarios and permission requirements, writes acceptance criteria, proposes an approach for substantial changes, then implements within existing conventions with all UI states, cleanup, accessibility and tests, and validates. Has a fast path for small changes. Use for feature work and bug fixes in an existing codebase. Not for starting a new app (use project-architect) or a read-only review (use audit-frontend-quality).
argument-hint: [feature or change description]
---

# Develop Frontend Feature

Feature: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Choose the path

**Fast path** - use when all are true: the change is small and local (a few files), it adds no new shared state, no new API call, no change to contracts, routes or permissions, and the approach is obvious. Then: read the code involved, make the change in the existing style, cover the UI states it touches, add or update a test if logic changed, validate, report. Skip the analysis block and load no reference skills.

**Full path** - everything else. Follow sections 2 to 7.

If a fast-path change turns out to be larger than it looked, stop and switch to the full path.

## 2. Understand the requirement

- Restate what is being asked and why, in one or two sentences.
- Ask only for what is missing and cannot be found in the code: roles affected, edge cases, the API contract, the design.
- For a bug: reproduce it or trace it to its cause before changing anything. A report describes a symptom. Find every caller of the code you are about to change, and fix the cause where all of them pass through, not just the path that was reported.

## 3. Inspect the existing code

- Detect the stack and conventions from the repository.
- Trace the whole workflow the feature touches: entry route, components, hooks, state, API calls, and what happens after.
- Find what already exists to reuse: components, hooks, API functions, types, utilities, patterns for forms, tables, errors and permissions.
- Note how similar features are tested.

## 4. Analyze before implementing

Answer each item briefly. Where the answer is "not applicable", say so and move on. Load a reference skill only when its condition is met.

| Question | Consider | Load when |
|---|---|---|
| **Workflow** | Every step the user takes, including leaving midway, going back, refreshing, and arriving by direct link | - |
| **Dependencies** | Which existing components, hooks and modules are used or changed; who else uses them | - |
| **State ownership** | For each new piece of state: its category, its owner, its single source of truth | Load the `frontend-state-architecture` skill if the feature adds shared state, server state, URL state or a mutation with cache effects |
| **Rendering implications** | What re-renders, whether anything remounts or loses state, list keys, any effect being added and whether it is needed | Load the `react-internals` skill if there is an identity, effect, state-reset or re-render question, or a version-specific API |
| **API contract** | Endpoints, request and response shapes, error responses, pagination; whether the contract exists or must change | - |
| **Race conditions** | Rapid input, double submit, navigation mid-request, stale responses, concurrent edits | Load the `frontend-resilience` skill if the feature adds an async flow, upload, real-time connection or new failure path |
| **Failure scenarios** | Slow, failed, empty, partial, unauthorized, invalid, offline: what the user sees and can do in each | (same load) |
| **Security and permissions** | Who may see and do this; that the server enforces it; user input and where it is rendered; sensitive data | Load the `frontend-security-audit` skill if the feature involves permissions, auth, user-supplied content, redirects, uploads or sensitive data |
| **Accessibility** | Keyboard path, focus movement, labels, announcements for dynamic changes | - |
| **Performance** | Only if the feature renders large lists, loads heavy code, or sits on a critical path | Load the `frontend-performance-engineering` skill only if a real cost is expected or measured |

Then write the **acceptance criteria**: a short list of observable statements that must be true when the feature is done, including the failure and empty cases. Each should be checkable by a test or a manual step. Confirm them with the user if the request left them open.

## 5. Propose, for substantial changes

Present a proposal and get approval before implementing when the change:

- alters existing business logic or user workflows,
- changes an API contract, a route, or a permission rule,
- adds a dependency,
- introduces new shared state or a new pattern, or
- touches many files or a module other features depend on.

The proposal contains: files to add and change, state ownership, API usage, the acceptance criteria, risks, and any alternative seriously considered with the reason it was not chosen. For a decision that is expensive to reverse, use the decision process in the principles.

Changes that are none of the above proceed without a proposal.

## 6. Implement

- **Preserve conventions.** Match the existing structure, naming, patterns and libraries, even where you would choose differently. Reuse before creating.
- **Stay in scope.** Do not refactor, rename or reformat code unrelated to the feature. If something nearby is wrong, report it; do not fix it uninvited.
- **States.** Every data view handles loading, success, empty and error with a recovery action.
- **Async.** Cancel or ignore superseded requests; clean up subscriptions, timers and listeners; guard against double submission; keep user input when a submit fails.
- **Validation.** Validate input at the boundary and show errors next to the field. Client validation is for the user; the server remains the control.
- **Permissions.** Use the project's existing permission mechanism. Hide or disable what the user may not do, and handle the server's refusal anyway.
- **Accessibility.** Semantic elements, labels, keyboard operation, focus management, sufficient contrast.
- **Lists.** Stable keys from data.
- **Responsive.** Works at the project's supported widths.
- **No new dependency** without approval.

## 7. Test and validate

- Add or update tests that cover each acceptance criterion and the main failure paths, in the style the project already uses. For a bug fix, add a test that fails without the fix. Load the `frontend-testing-strategy` skill only if the right level or approach is unclear.
- Run lint, type check, tests and build where they exist.
- Exercise the feature in the running app when possible: the main path, each failure state, keyboard only, and a narrow viewport.

## 8. Report

- What changed, as a short list of files with one line each.
- Acceptance criteria and whether each is met and how it was checked.
- Each of lint, type check, tests and build: passed, failed (with output) or not run (with the reason).
- Anything left out, unverified, or noticed nearby that deserves a follow-up.
