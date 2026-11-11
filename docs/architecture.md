# FEOS architecture

How the skills are organized, what each one owns, and when each is loaded.

## Layout

```
frontend-engineering-os/
  .claude-plugin/marketplace.json     marketplace manifest, lists one plugin
  plugins/feos/                       the plugin; the only part installed on a user's machine
    .claude-plugin/plugin.json        plugin manifest
    skills/
      frontend-engineering-principles/   shared principles (1)
      project-architect/                 workflows (5)
      build-frontend-app/
      develop-frontend-feature/
      migrate-frontend-app/
      audit-frontend-quality/
      react-internals/                   specialist references (8)
      frontend-architecture/
      frontend-state-architecture/
      frontend-resilience/
      frontend-performance-engineering/
      frontend-security-audit/
      frontend-testing-strategy/
      frontend-production-readiness/
  docs/                               documentation for people; not installed
  scripts/validate.mjs                repository validator
```

Each skill is a folder with one `SKILL.md`. Documentation lives outside `plugins/feos/` so that only skill instructions are installed.

## Three layers

| Layer | Skills | Role |
|---|---|---|
| Workflows | 5 | Drive a task from start to finish. The user invokes these |
| Specialist references | 8 | Hold knowledge for one subject. Loaded by a workflow step, or invoked directly with a question |
| Principles | 1 | Shared mindset, decision process, common rules and the skill map. Loaded once per session by every other skill |

## Dependency rules

```
workflows  ->  references  ->  principles
workflows  ----------------->  principles
```

1. A workflow may load references and the principles.
2. A workflow never loads another workflow. It hands off: it tells the user which workflow comes next.
3. A reference loads only the principles. It never loads another reference or a workflow.
4. The principles skill loads nothing.

These rules make circular dependencies impossible and keep the amount of loaded context predictable. `scripts/validate.mjs` enforces them.

**How loading is expressed.** A skill loads another by the exact sentence form ``Load the `skill-name` skill``. The validator builds the dependency graph from that phrase. When a reference needs to point at a neighbouring subject it names the owner instead, for example "cache invalidation: `frontend-state-architecture`", which is a pointer for the reader and not a load.

**Why the principles are a skill.** A skill can be loaded by name with no file-read permission. A shared Markdown file beside the skill folders, and a copy inside each skill folder, were both tested and both required file-read permission, which fails in non-interactive sessions. The principles skill sets `user-invocable: false` so it stays out of the slash-command menu.

## One owner per topic

| Topic | Owner |
|---|---|
| Render and commit, reconciliation, identity, effects, memoization mechanics, concurrent features, version-specific React APIs | `react-internals` |
| Project structure, module boundaries, dependency direction, component architecture, routing and auth architecture, ADRs | `frontend-architecture` |
| State categories, ownership, server-state caching, invalidation, optimistic updates, data races | `frontend-state-architecture` |
| Error classification, error boundaries, retries, timeouts, cancellation, offline, recovery | `frontend-resilience` |
| Measurement, Core Web Vitals, bundles, loading, long tasks, memory | `frontend-performance-engineering` |
| XSS, CSRF, CSP, tokens and cookies, access control, uploads, third-party code | `frontend-security-audit` |
| Test levels, tooling, mocking, flakiness | `frontend-testing-strategy` |
| Configuration, CI/CD, monitoring, release, rollback | `frontend-production-readiness` |

Where two subjects meet, the split is fixed:

| Overlap | Split |
|---|---|
| Memoization | How it works: `react-internals`. Whether it pays off: `frontend-performance-engineering` |
| Race conditions | In cached data and optimistic updates: `frontend-state-architecture`. Cancellation mechanics and async UI: `frontend-resilience` |
| Error boundaries | How they work: `react-internals`. Where to place them: `frontend-resilience` |
| Auth | Where the session module sits: `frontend-architecture`. Token storage and controls: `frontend-security-audit` |
| Monitoring | In-app reporting function: `frontend-resilience`. Product setup, source maps, alerts: `frontend-production-readiness` |

## Activation

Skills are selected in two ways: the user invokes one by name, or Claude matches the request against skill descriptions. Each description states what the skill is for and what it is not for, to reduce accidental activation.

Within a workflow, references load on a stated condition.

| Situation | Start with | Always consulted | Consulted only if |
|---|---|---|---|
| New project | `project-architect`, then `build-frontend-app` | `frontend-architecture`, `frontend-state-architecture` (skipped for a small app where the answer is obvious) | `frontend-security-audit` (auth, roles, sensitive data); `frontend-resilience` (remote data); `frontend-testing-strategy` (test plan); `frontend-production-readiness` (before first release) |
| Feature in an existing app | `develop-frontend-feature` | none | `frontend-state-architecture` (new shared or server state); `react-internals` (identity, effect or re-render questions); `frontend-resilience` (new async flow); `frontend-security-audit` (permissions, user input, sensitive data) |
| Audit | `audit-frontend-quality` | `react-internals`, `frontend-security-audit` | the others, by scope |
| Migration | `migrate-frontend-app` | `react-internals`, `frontend-testing-strategy` | `frontend-architecture`, `frontend-state-architecture`, `frontend-production-readiness` |
| Performance investigation | `frontend-performance-engineering` | none | `react-internals` when the cause is rendering |
| Security review | `frontend-security-audit` | none | none |
| Before a release | `frontend-production-readiness` | none | `frontend-security-audit`, `frontend-testing-strategy` |

`develop-frontend-feature` has a fast path: a small, local, obvious change skips the analysis and loads no reference.

## Structure of a reference skill

Every specialist reference has the same eight sections, in this order:

1. **Scope and boundaries** - what it owns, and which skill owns the neighbouring subjects.
2. **When to consult** - and when not to.
3. **Mental model** - the few ideas the rest follows from.
4. **Decision criteria** - tables of situation, choice and reason.
5. **Scenarios** - symptom, root cause, fix.
6. **Anti-patterns**
7. **Version checks** - what to confirm against installed versions and official documentation.
8. **Validation** - what must be run or measured before a claim is made.

## Scaling to the application

The principles skill defines three sizes (small, medium, large) with signals for each. Workflows size the application first and scale everything else to it. A small application without layered architecture is correct; an unnecessary abstraction in a small application is a defect. When between two sizes, the smaller is chosen.
