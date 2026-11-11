---
name: audit-frontend-quality
description: Read-only engineering audit of a frontend codebase - React rendering and reconciliation, component identity, hooks and effects, state ownership, component architecture, module boundaries, API architecture, error handling and recovery, performance, security, accessibility, responsive design, testing quality, dependency health, production readiness, maintainability and technical debt. Each finding gives severity, file and line, technical explanation, root cause, real-world impact and recommended solution. Supports full or scoped audits. Does not modify code unless fixes are explicitly requested afterwards. Use to assess an existing codebase. Not for reviewing a single pending diff.
argument-hint: [path, or focus area such as "state", "security", "performance"]
---

# Audit Frontend Quality

Scope: $ARGUMENTS (default: whole repository, all areas)

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

**Do not modify any files during the audit.** Do not fix, reformat, or "quickly correct" anything. Apply fixes only if the user explicitly asks after seeing the report. Commands run during the audit must be read-only.

## 1. Set the scope

Decide what is being audited before reading code:

| Request | Scope |
|---|---|
| No focus given | All areas in section 3, whole repository |
| A path | All areas, that path only |
| A focus area ("security", "performance", "state", ...) | That area in depth; note anything serious noticed elsewhere in one line each |
| Large repository, full audit | Agree a sampling plan: critical workflows first, then the most-changed and largest modules. State what was not read |

Review only the areas in scope. Load only the reference skills that scope needs.

## 2. Understand the application

- Detect the stack: language, React and framework versions, build tool, package manager, router, state and data libraries, styling, test setup, CI.
- Identify the critical workflows and where they live.
- Estimate the application's size (small, medium, large). **Judge the code against what is appropriate for its size.** A small app without a layered architecture is correct, not a finding. An unnecessary abstraction in a small app is a finding.
- Read the structure before the details: how the code is organized and whether that organization is holding.

## 3. Review areas

For each area in scope, look for the listed problems. Load the named skill for the criteria and scenarios when the area is in scope; the two marked *always* are loaded for every full audit.

**React rendering, reconciliation and identity** - *always*: load the `react-internals` skill.
Components defined inside components; unstable identity causing remounts or lost state; index or random keys on dynamic lists; conditional structure that resets state; impure render logic; costly unnecessary re-renders (only where the cost is real); ineffective or premature memoization.

**Hooks and effects** (same skill).
Rules of Hooks violations; effects that only sync state from other state; derived values stored in state; missing or wrong dependencies; missing cleanup; stale closures; suppressed lint rules.

**State ownership** - load the `frontend-state-architecture` skill when in scope.
Server data copied into client stores; duplicate sources of truth; state held higher than needed; global state used by default; missing URL state for shareable views; query keys missing variables; mutations that do not invalidate what they change; unsafe optimistic updates; impossible state combinations.

**Component architecture and module boundaries** - load the `frontend-architecture` skill when in scope.
Structure that no longer fits the size; features importing each other's internals; circular dependencies; shared code depending on features; components with too many responsibilities or boolean props; business rules in presentational components; dumping-ground utility modules; abstractions without a second user; scattered role checks.

**API architecture** (same skill).
Direct `fetch` calls spread through components; no single client; untyped or unvalidated responses; backend shapes leaking through the UI; inconsistent error handling; hardcoded URLs.

**Error handling and recovery** - load the `frontend-resilience` skill when in scope.
Missing loading, error or empty states; no error boundaries, or only one at the root; swallowed errors; unhandled promise rejections; no timeouts; missing cancellation and race conditions; automatic retry of non-idempotent requests; error states with no recovery action; no central reporting.

**Performance** - load the `frontend-performance-engineering` skill when in scope.
No route-level code splitting; heavy dependencies on the initial path; unoptimized or undimensioned images; long unvirtualized lists; leaks from missing cleanup; layout thrashing. Report measurements only if actually taken; otherwise label findings as static observations with expected, unmeasured impact.

**Security** - *always*: load the `frontend-security-audit` skill.
Unsafe HTML rendering; unvalidated URLs and redirects; token storage; client-only authorization; secrets in client code or client-exposed variables; unsafe `postMessage`; upload handling; third-party scripts; vulnerable dependencies. List what needs backend verification separately.

**Accessibility.**
Non-semantic interactive elements; missing labels and alternative text; keyboard traps or unreachable controls; missing focus management on route change and in dialogs; insufficient contrast; ARIA misuse; motion without `prefers-reduced-motion`.

**Responsive design.**
Fixed widths; overflow and horizontal scrolling; touch targets too small; breakpoints inconsistent or missing; content hidden without an alternative.

**Testing quality** - load the `frontend-testing-strategy` skill when in scope.
Critical workflows untested; tests coupled to implementation; mocking of the app's own modules; only success paths tested; large snapshots; fixed sleeps and other flakiness sources; skipped or disabled tests.

**Dependency health.**
Outdated major versions with known issues; deprecated or unmaintained packages; duplicate libraries for one purpose; unused dependencies; missing lockfile; unpinned sources. Run the package manager's audit and outdated commands only if they are read-only and safe here; otherwise note them as not run.

**Production readiness** - load the `frontend-production-readiness` skill when in scope.
Missing startup validation of configuration; no error monitoring; source map handling undecided; no CI gates; no Node pinning; committed environment files; no client-route fallback; caching problems.

**Maintainability and technical debt.**
Dead code; duplication that has already diverged; very large files and functions; inconsistent patterns for the same job; outdated or misleading comments and documentation; `any` and suppressed checks; TODOs marking real gaps. Distinguish debt that is costing something now from debt that is merely untidy.

## 4. Verify before reporting

- Confirm each finding in the code. Open the file and read the surrounding context; a pattern match is not a finding.
- Check whether the problem is real in this application: is the code reachable, is the list actually dynamic, is the cost actually incurred.
- Drop what you cannot substantiate, or report it as a question with what would confirm it.
- Do not pad the report. Ten confirmed findings are worth more than fifty possible ones.

## 5. Report

**Severity**

| Level | Meaning |
|---|---|
| Critical | Security exposure, data loss, or a broken critical workflow. Act now |
| High | Bugs users will hit, or structural problems actively causing defects |
| Medium | Real problems with limited impact, or debt that is slowing work |
| Low | Minor issues and cleanups |

**Each finding has all six fields:**

- **Severity**
- **Location**: `file:line`
- **Technical explanation**: what the code does and what is wrong with it
- **Root cause**: why it came to be this way, the underlying mistake or missing piece, not the symptom
- **Real-world impact**: what a user, the business or the team actually experiences, and how likely
- **Recommended solution**: the specific change, at the place that fixes the cause

Group findings by severity, most serious first. Where several findings share one root cause, report the cause once and list the locations.

**Then add:**

1. **Summary**: overall state in a few sentences, and the three to five changes that would matter most.
2. **What is done well**: patterns worth keeping, briefly.
3. **Checks run**: each command or tool, with its actual result.
4. **Checks not run**, with the reason.
5. **Not reviewed**: areas, paths or files outside the scope or sample.
6. **Needs verification elsewhere**: backend authorization, server headers, production configuration.

Never state that the code is secure, performant, accessible or production-ready as a blanket conclusion. Report what was checked and what was found.

## 6. After the report

Stop. If the user asks for fixes, confirm which findings to address, then apply them through the `develop-frontend-feature` workflow, most severe first, one root cause at a time, validating after each.
