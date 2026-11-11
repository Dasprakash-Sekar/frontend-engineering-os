# Using FEOS

## Skill names

How you type a skill depends on how FEOS was installed.

| Installation | Form | Example |
|---|---|---|
| Plugin | `/feos:<skill>` | `/feos:project-architect` |
| Manual | `/<skill>` | `/project-architect` |

The examples below use the plugin form. With a manual installation, remove `feos:`.

You can also describe the task in plain language and let Claude choose a skill from its description. Invoking by name is more predictable, especially for the workflows.

## Which skill to start with

| You want to | Start with |
|---|---|
| Start a new app, plan a migration, or plan a large refactor or feature | `project-architect` |
| Build a new app from an approved plan | `build-frontend-app` |
| Add or change a feature, or fix a bug, in an existing app | `develop-frontend-feature` |
| Move to another framework, build tool or major version | `migrate-frontend-app` |
| Review an existing codebase without changing it | `audit-frontend-quality` |
| Understand a re-render, remount, lost state or effect problem | `react-internals` |
| Decide where state should live or how to invalidate a cache | `frontend-state-architecture` |
| Decide on structure, boundaries, or record a decision | `frontend-architecture` |
| Design error handling, retries or offline behavior | `frontend-resilience` |
| Investigate a slow page, interaction or large bundle | `frontend-performance-engineering` |
| Review security, or implement auth, uploads or redirects | `frontend-security-audit` |
| Plan tests or fix flaky ones | `frontend-testing-strategy` |
| Prepare a release or investigate a production-only problem | `frontend-production-readiness` |

When unsure, start with `project-architect`. It routes to the right workflow.

## Arguments

Every skill accepts free text after its name.

```text
/feos:project-architect Booking portal for a clinic: patients book and reschedule, staff manage the calendar, admins configure services
```

```text
/feos:develop-frontend-feature Add CSV export to the orders table, respecting the current filters
```

```text
/feos:audit-frontend-quality state
```

```text
/feos:migrate-frontend-app React 17 -> React 19
```

`audit-frontend-quality` accepts a path, a focus area, or nothing (whole repository, all areas). Focus areas include `rendering`, `state`, `architecture`, `errors`, `performance`, `security`, `accessibility`, `testing`, `dependencies` and `production`.

## Workflow: new application

1. Run `project-architect` with the requirements.
2. Answer the questions. They arrive in groups of three to five, each with a recommendation you can accept.
3. Review the output: application size, decision table, proposed ADRs, milestone plan, what is deliberately left out, open risks.
4. Approve, or push back on any decision. Nothing is built until you approve.
5. `build-frontend-app` builds in six milestones (scaffold, skeleton, foundations, features, hardening, documentation) and validates after each.
6. Read the final report. Each of install, lint, type check, tests and build is marked passed, failed or not run.

FEOS does not deploy. Deployment remains your step.

## Workflow: feature in an existing app

1. Run `develop-frontend-feature` with the feature description.
2. For a small, local, obvious change it takes the fast path: read, change, test, validate, report.
3. Otherwise it traces the existing code and analyzes workflow, dependencies, state ownership, rendering, API contract, race conditions, failure scenarios, permissions, accessibility and, where relevant, performance.
4. It writes acceptance criteria.
5. If the change alters business logic, a contract, a route or a permission, adds a dependency, or introduces new shared state, it presents a proposal and waits.
6. It implements within existing conventions and does not touch unrelated code.
7. The report lists each acceptance criterion with how it was checked.

## Workflow: bug fix

Use `develop-frontend-feature` and describe the bug. The skill reproduces or traces the bug to its cause, finds every caller of the code involved, fixes the cause where all callers pass through, and adds a test that fails without the fix.

## Workflow: audit

1. Run `audit-frontend-quality`, optionally with a path or focus area.
2. Findings are grouped by severity (Critical, High, Medium, Low). Each has location, technical explanation, root cause, real-world impact and recommended solution.
3. The report ends with: summary, what is done well, checks run, checks not run, what was not reviewed, and what needs verification elsewhere (for example on the backend).
4. No files are changed. To fix findings, say which ones; they are then handled through `develop-frontend-feature`.

## Workflow: migration

1. Run `migrate-frontend-app` with source and target.
2. The skill inventories the source, builds a dependency compatibility matrix, and lists features with no direct equivalent in the target. You decide each of those.
3. It records a baseline: routes, workflows, check results, bundle size.
4. It proposes increments, each with a validation step and a way back, and waits for approval.
5. It migrates step by step, validating after each.
6. It verifies against the baseline and reports gaps and required deployment changes.

The original implementation is never deleted without your approval.

## Asking a specialist reference directly

References answer questions without running a workflow.

```text
/feos:react-internals My effect runs twice in development and the request fires twice
```

```text
/feos:frontend-resilience Should the "send invoice" request retry automatically on a 503?
```

```text
/feos:frontend-testing-strategy Our Playwright suite fails about one run in ten
```

## What to expect

- **Questions before code.** The workflows ask what they cannot determine from the repository. They do not ask what the repository already answers.
- **Proposals before substantial changes.** Architecture decisions, contract changes and deletions wait for approval.
- **Proportionate solutions.** The application is sized first. A small app does not get a layered architecture.
- **Honest reporting.** Checks are reported as passed, failed or not run. Measurements are reported only if taken.

## Limits

- FEOS guides how Claude approaches frontend work. It does not guarantee correct output. Review the results as you would any contribution.
- The security and audit skills review the frontend. They list what needs backend verification; they cannot verify the server.
- Skills advise checking version-specific behavior against official documentation. Treat specific API claims as something to confirm for your installed versions.
- FEOS targets Claude Code. Other products and platforms are untested.
