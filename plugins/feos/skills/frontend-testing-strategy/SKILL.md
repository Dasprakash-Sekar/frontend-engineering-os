---
name: frontend-testing-strategy
description: Reference for building a reliable frontend test suite - choosing what to test at unit, component, integration and end-to-end levels; the test pyramid and its trade-offs; testing user-visible behavior with React Testing Library; Vitest and Playwright usage; API mocking at the network boundary; contract testing; accessibility testing with axe-core; visual regression; performance checks; regression strategy; diagnosing and fixing flaky tests. Use when planning a test strategy, deciding what tests a change needs, reviewing test quality, or fixing brittle, slow or flaky tests. Detects the project's existing tools instead of assuming these. Not for the production release checklist (use frontend-production-readiness).
argument-hint: [feature, suite, or problem]
---

# Frontend Testing Strategy

Target: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns *what to test, at which level, and how to keep tests trustworthy*.

It does not own:
- CI pipeline design and release gates: `frontend-production-readiness`.
- Which failure paths exist in a flow: `frontend-resilience` defines them; this skill says how to test them.
- Measuring real performance: `frontend-performance-engineering`.

Use the test tools the repository already has. The tools named here are common examples; do not introduce a second runner or library alongside an existing one.

## 2. When to consult

- Setting up testing for a new project.
- Deciding which tests a feature or fix needs.
- Tests break on refactors that did not change behavior.
- Tests are slow, or pass and fail without code changes.

Do not load this to add one obvious test next to existing similar tests.

## 3. Mental model

**A test's value is the confidence it gives that users can do what they need, divided by what it costs to write, run and maintain.** A test that fails when behavior is fine has negative value: it teaches the team to ignore failures.

**Test behavior, not implementation.** A user sees text, roles and results; they do not see state variables, hook calls or component names. Tests that assert on internals break on every refactor and miss real bugs. Tests that act like a user survive refactors and catch regressions.

**The levels**

| Level | Exercises | Speed | Confidence | Fails because |
|---|---|---|---|---|
| Static (types, lint) | Everything, without running it | Instant | Catches a class of errors only | Type or rule violation |
| Unit | A pure function or hook in isolation | Milliseconds | Narrow: this logic is right | That logic changed |
| Component / integration | One or several components rendered together, with network mocked | Tens of milliseconds | High for UI behavior | Behavior changed |
| End-to-end | The real app in a real browser, often a real backend | Seconds | Highest, for the paths covered | Almost anything, including environment |

**Shape.** More tests where they are cheap and still meaningful, fewer where they are slow. For most frontends the bulk of the value sits in component and integration tests that render a feature and drive it like a user, supported by unit tests for real logic and a small set of end-to-end tests for the journeys the business cannot afford to break. The classic pyramid and the "trophy" are both guides; let the project's risk decide the mix.

**Coverage is a flashlight, not a goal.** Use it to find untested important code. A percentage target produces tests written to execute lines, not to verify behavior.

## 4. Decision criteria

**What level for what**

| Subject | Level |
|---|---|
| Calculation, formatter, validator, reducer, parser | Unit |
| Custom hook with real logic | Unit through a hook-rendering utility, or through a component that uses it |
| Form: validation, submit, error display | Component / integration |
| A feature: list loads, filters, item edits, error and empty states | Component / integration with mocked network |
| Routing, guards, redirects | Integration with the router, plus one end-to-end path |
| Login, checkout, payment, signup, the core workflow of the product | End-to-end |
| Cross-browser or real-layout behavior | End-to-end in the browsers that matter |
| Third-party wrapper with no logic of your own | Usually none |
| Trivial presentational component | Usually none; it is covered by the features that use it |

**What to prioritize.** Rank by damage if broken times likelihood of breaking:

1. The workflows that make or lose money or data.
2. Logic with branches, money, dates, permissions or parsing.
3. Bugs that already happened: each fix gets a test that fails without it.
4. Failure paths: error, empty, slow, unauthorized, invalid input.
5. Everything else, as it is touched.

Do not aim to test everything. State what is deliberately not tested and why.

**Queries (React Testing Library style).** Prefer in this order, because it mirrors how users and assistive technology find things:

1. By role with accessible name (`getByRole('button', { name: /save/i })`).
2. By label text for form fields.
3. By visible text.
4. By test id, only when nothing semantic exists.

If an element cannot be found by role or label, that is often an accessibility defect worth fixing in the component. Use the user-event style API for interaction so that focus, keyboard and pointer behave as in a browser. Await results with async queries and waits; never with fixed sleeps.

**What to mock**

| Thing | Mock? |
|---|---|
| Network | Yes, at the network boundary (a request-interception tool), so the real API client, serialization and error handling run. Avoid mocking your own API module or `fetch` per test |
| Time, randomness, ids | Yes, control them for determinism |
| Browser APIs missing in the test environment | Minimal stubs |
| Your own components, hooks and stores | No. Mocking them tests the mock |
| Third-party UI libraries | No, unless impossible in the test environment |
| Analytics, monitoring | Stub and, where it matters, assert the call |

Each mock is a place where the test and reality can diverge. The more of the real code path runs, the more a passing test means.

**Keeping mocks honest: contract testing.** Network mocks drift from the real API. Reduce drift, cheapest first: generate types and mock shapes from the API schema (OpenAPI or GraphQL) so a contract change breaks compilation; validate mock responses against the schema; add consumer-driven contract tests when frontend and backend are released independently by different teams; keep a few end-to-end tests against a real backend as the final check.

**End-to-end (Playwright style)**

- Few, covering critical journeys end to end. Not a second copy of the component tests.
- Use role- and label-based locators and the tool's auto-waiting assertions. No fixed timeouts.
- Each test creates its own data and does not depend on other tests or on order.
- Authenticate once through saved session state, not by driving the login form in every test.
- Decide deliberately what is real: a real backend in a test environment gives the most confidence and the most flakiness; a mocked backend gives stability and less coverage.
- Capture traces, screenshots and video on failure.

**Accessibility testing**

| Method | Catches |
|---|---|
| Role and label queries in component tests | Missing names and semantics, as a side effect |
| Automated checks with axe-core, in component or end-to-end tests | A portion of issues: contrast, missing labels, invalid ARIA |
| Keyboard-only walkthrough of critical flows | Focus order, traps, unreachable controls |
| Screen reader spot check | Announcements and meaning |

Automated checks find only part of accessibility problems. Passing them is not conformance. Say so.

**Visual regression.** Useful for a design system or pages where appearance is the product. Costs: flaky diffs from fonts, animation and rendering differences, and review effort. Stabilize by fixing viewport and fonts, disabling animation, running in one consistent environment, and snapshotting components, not whole dynamic pages. Skip it if nobody will review the diffs.

**Performance testing.** Budgets in CI (bundle size limits, lab metric thresholds) catch regressions. They are lab numbers with variance, so use thresholds with margin and track trends. Real diagnosis: `frontend-performance-engineering`.

**Regression strategy**

- A bug fix starts with a test that reproduces the bug and fails, then passes with the fix.
- Before a refactor or migration, make sure behavior-level tests cover the area; add characterization tests if they do not. Tests coupled to implementation will not help here.
- Run the fast suite on every change and the full suite before merge or release.

**Flaky tests: causes and fixes**

| Cause | Fix |
|---|---|
| Fixed sleeps or racing the UI | Await a condition the user would see |
| Shared state between tests (module state, storage, database rows, cache) | Reset in setup and teardown; isolate data per test |
| Order dependence | Each test sets up what it needs |
| Real time, timezone, locale, randomness | Fake timers, fixed timezone and locale, seeded values |
| Real network or third-party services | Mock at the boundary |
| Animations and transitions | Disable in tests |
| Unawaited promises, state updates after the test ends | Await everything; clean up |
| Resource contention in parallel runs | Isolate ports, files and accounts per worker |

Method: reproduce by running the test repeatedly and in isolation, read the trace, find the cause, fix it. Automatic retries hide the symptom and the real bug behind it; use them only as a temporary measure with the test tracked for repair. Quarantine, do not delete, a flaky test that blocks others, and fix it promptly.

## 5. Scenarios

**Every refactor breaks thirty tests although the app works.** Tests assert on internal state, call counts or component structure, or use shallow rendering. Rewrite the important ones to render the feature and assert what the user sees.

**All tests pass; production form submit is broken.** The API module was mocked, so the real request code never ran. Mock at the network boundary.

**Suite takes forty minutes.** Most coverage is end-to-end. Move behavior coverage down to component tests; keep a small journey set end to end; run in parallel.

**Test passes locally and fails in CI one run in five.** A timing assumption or shared state. Reproduce by repetition, check for sleeps and leaked state, fix the cause.

**Coverage is 90% and bugs still ship.** Tests execute lines without asserting behavior, and failure paths are absent. Add tests for error, empty and permission cases on critical flows.

**A date test fails every evening.** Depends on the real clock or timezone. Fix time and timezone in the test.

**Snapshot files change in every pull request.** Large snapshots of whole component trees get approved without reading. Replace with specific assertions.

**New feature, unclear what to test.** List acceptance criteria; one component-level test per criterion, plus the failure states; unit tests for any non-trivial logic; an end-to-end test only if this is a critical journey.

## 6. Anti-patterns

- Asserting on implementation details: internal state, private functions, hook call counts.
- Mocking the module under test, or most of its collaborators.
- Large snapshots as the main assertion.
- Fixed `sleep` or `waitForTimeout` calls.
- Tests that depend on each other or on run order.
- Chasing a coverage percentage.
- Testing only the success path.
- Duplicating the same scenario at every level.
- End-to-end tests for every edge case.
- Retrying flaky tests indefinitely instead of fixing them.
- Disabling or deleting a failing test to make the build pass.
- Test ids used where a role or label exists.
- Claiming accessibility is verified because an automated check passed.

## 7. Version checks

Read the installed test runner, testing library, mocking tool and end-to-end tool with their versions, and confirm APIs in their official documentation: configuration format, timer and module mocking APIs, the interaction API (its setup differs between major versions), and the mocking tool's handler syntax, which has changed across major versions. Confirm how the framework expects components that depend on its router or server features to be tested.

## 8. Validation

- Run the tests you add and report the actual result. Never report tests as passing without running them.
- Prove a new test can fail: break the behavior temporarily, or confirm it failed before the fix. A test that cannot fail verifies nothing.
- For a flaky-test fix, run the test many times in a row and in CI-like conditions before calling it fixed.
- Report what is covered, what was deliberately left untested and why, and anything that could not be run in this environment.
