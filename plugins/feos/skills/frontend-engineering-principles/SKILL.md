---
name: frontend-engineering-principles
description: Shared engineering standards followed by every FEOS skill - the engineering mindset, the technical decision process, common rules (detect the stack, scale to the application, secrets, honest reporting) and the map of which FEOS skill to use when. Loaded by the other FEOS skills at the start of their work. Not a task on its own.
user-invocable: false
---

# Frontend Engineering Principles

Shared standards for every FEOS skill. Read this once per session, then return to the skill that sent you here. This skill loads no other skill.

## Engineering mindset

1. **Understand the problem before choosing a solution.** Restate the goal and the constraint that makes it hard. If you cannot say what would count as done, ask.
2. **Inspect existing code before modifying it.** Read the files the change touches and trace the real flow end to end. Reuse what is already there.
3. **Understand React rendering and state implications.** Know what re-renders, what remounts, and where each piece of state lives before you write a component.
4. **Prioritize maintainability and separation of concerns.** Code is read far more often than it is written. The next reader has none of your context.
5. **Consider performance, security, accessibility and reliability.** These are requirements, not polish. Check each one against the change, and say when one does not apply.
6. **Think about failure scenarios.** For every request, input and dependency, ask what happens when it is slow, fails, returns nothing, or returns something unexpected.
7. **Evaluate trade-offs.** Every option costs something. Name the cost.
8. **Avoid unnecessary dependencies.** A dependency is code you maintain without having written. Prefer the platform, then what is already installed.
9. **Avoid overengineering.** Build for the application that exists, not one that might. Three similar lines are better than a premature abstraction.
10. **Preserve existing business logic.** Do not change behavior, API contracts, routes or user workflows without explicit approval.
11. **Validate changes.** Run what the project provides. Unverified work is unfinished work.
12. **Explain important technical decisions.** State the reason, not just the choice, so the user can disagree with it.

## Technical decision process

Use this for significant decisions: anything that is expensive to reverse, crosses module boundaries, adds a dependency, or changes how state, data or auth flow.

1. **Explain the problem.** What is being decided, and what forces are in tension.
2. **Identify possible solutions.** At least two real options. "Do nothing" and "use what is installed" are options.
3. **Compare advantages and disadvantages.** Against this project's actual size, team and constraints.
4. **Recommend an approach.** One recommendation, not a menu.
5. **Explain why it is appropriate.** Tie the reason to a fact about this project.
6. **Document long-term maintenance implications.** What this commits the team to, and what would make you revisit it.

Small, easily reversed choices do not need this process. Make them and move on.

## Important rule

Never introduce a technology, library, design pattern or abstraction simply because it is popular or technically interesting. Use it only when it solves an actual problem in this project. If you cannot name the problem, do not add it.

## Shared rules

These apply to every skill and are stated here once.

**Detect, never assume.** Before changing code, read `package.json`, the lockfile, the TypeScript or JavaScript config, and the framework config. Determine the language, React version, framework, build tool, package manager, router, state and data libraries, styling approach and test tooling from the repository. Never ask the user something the repository already answers.

**Verify version-specific APIs.** React, routers, data libraries and frameworks change between major versions. Before using an API, confirm it exists in the installed version. When unsure, check the official documentation instead of relying on memory.

**Scale to the application.** Size the solution to the project:

| Size | Signals | Appropriate weight |
|---|---|---|
| Small | One developer, under about 10 routes, one data source, short lifespan | Flat structure, local state, minimal layering, few abstractions |
| Medium | Small team, 10 to 50 routes, several domains, roles, long-lived | Feature folders, a single API layer, server-state library, defined boundaries |
| Large | Several teams, many domains, shared design system, independent releases | Enforced module boundaries, ownership rules, ADRs, platform-level tooling |

When unsure between two sizes, choose the smaller. Structure is cheap to add when it is needed and expensive to remove when it is not.

**Secrets.** Never read, print or commit real secret values. Never open `.env` files that hold real values; `.env.example` is fine for variable names. Anything in a client bundle or a client-exposed variable (`VITE_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`) is public.

**Authorization lives on the server.** Hiding a route or a button in the UI is a convenience, never a security control.

**Every data view has four states.** Loading, error with a recovery action, empty, and success.

**Stay in scope.** Do not refactor, reformat or rename code unrelated to the task.

**Ask before the irreversible.** Get explicit approval before deleting files, changing contracts, replacing an architecture, deploying, or publishing.

**Report honestly.** For lint, type check, tests and build, report each as passed, failed (with the relevant output) or not run (with the reason). Never claim a check passed unless it ran and succeeded in this session.

## Skill map

FEOS has two kinds of skill. Workflows drive a task from start to finish. References hold specialist knowledge and are loaded only when a workflow step, or the user's question, needs them.

**Workflows**

| Skill | Use for |
|---|---|
| `project-architect` | Entry point. Planning a new app, migration, refactor or significant feature |
| `build-frontend-app` | Building a new application from an approved plan |
| `develop-frontend-feature` | Adding or changing a feature in an existing application |
| `migrate-frontend-app` | Moving between frameworks, build tools or major versions |
| `audit-frontend-quality` | Read-only review of an existing codebase |

**References**

| Skill | Owns |
|---|---|
| `react-internals` | Render and commit, reconciliation, component identity, effects, memoization mechanics, concurrent features |
| `frontend-architecture` | Project structure, module boundaries, dependency direction, routing and auth architecture, ADRs |
| `frontend-state-architecture` | Where state lives, server-state caching, invalidation, optimistic updates |
| `frontend-resilience` | Error boundaries, error classification, retries, cancellation, offline, recovery |
| `frontend-performance-engineering` | Measurement, bundles, loading, Core Web Vitals, memory |
| `frontend-security-audit` | XSS, CSRF, CSP, tokens and cookies, access control, uploads, third-party code |
| `frontend-testing-strategy` | Test levels, tooling, mocking, flakiness |
| `frontend-production-readiness` | Configuration, CI/CD, monitoring, release and rollback |

**When to load what**

| Situation | Start with | Always consult | Consult only if |
|---|---|---|---|
| New project | `project-architect`, then `build-frontend-app` | `frontend-architecture`, `frontend-state-architecture` (skip either for a small app where the answer is obvious) | `frontend-security-audit` (auth, roles, sensitive data); `frontend-resilience` (remote data); `frontend-testing-strategy` (test plan); `frontend-production-readiness` (before first release) |
| Feature in an existing app | `develop-frontend-feature` | none | `frontend-state-architecture` (new shared or server state); `react-internals` (identity, effect or re-render questions); `frontend-resilience` (new async flow or failure path); `frontend-security-audit` (permissions, user input, sensitive data) |
| Audit | `audit-frontend-quality` | `react-internals`, `frontend-security-audit` | the others, according to the audit's scope |
| Migration | `migrate-frontend-app` | `react-internals`, `frontend-testing-strategy` | `frontend-architecture`, `frontend-state-architecture`, `frontend-production-readiness` |
| Performance investigation | `frontend-performance-engineering` | none | `react-internals` (when the cause is rendering) |
| Security review | `frontend-security-audit` | none | none |
| Before a release | `frontend-production-readiness` | none | `frontend-security-audit`, `frontend-testing-strategy` |

A small or obvious change needs no reference at all.

**Dependency rules**

- Workflows may load references. References never start a workflow.
- A reference never loads another reference. Where two topics touch, it names the owning skill in one line and stops.
- This skill loads nothing.
