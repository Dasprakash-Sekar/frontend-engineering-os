---
name: project-architect
description: Main entry point for frontend work. Plans the architecture before anything substantial is built - inspects the repository and business requirements, sizes the application, asks the necessary questions in small groups, compares options for each significant decision, and produces an approved decision summary, Architecture Decision Records and an implementation plan. Use when starting a new frontend app, a migration, a large refactor, or a significant feature. Not for small, well-understood changes (use develop-frontend-feature directly).
argument-hint: [business requirements or goal]
---

# Project Architect

Requirements from the user: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

This skill plans. It does not modify project files. Implementation starts only after the user approves the plan.

## 1. Inspect first

If there is a repository, read before asking anything:

- `package.json`, the lockfile (which also identifies the package manager), `tsconfig` or `jsconfig`, framework and build config, Node version constraints (`.nvmrc`, `engines`).
- Routing, state and data libraries, styling approach, test setup, CI configuration, README, any existing ADRs.
- The shape of the code: how it is organized now, and whether that organization is working.

Record the detected stack. Never ask about something the repository or the request already answers. Do not open `.env` files that hold real values; `.env.example` is fine.

If there is no repository, say so and plan from the requirements.

## 2. Understand the business problem

Before any technology question, be able to state:

- Who the users are and what roles exist.
- The core workflows: what a user starts with, what they do, what "done" looks like for them.
- What must not go wrong (money, data loss, compliance, safety).
- What is known about growth: more users, more features, more teams, more products.

If these are unclear, ask about them first. Architecture chosen without them is guesswork.

## 3. Size the application

Classify it as small, medium or large using the table in the principles. State the size and the signals that led to it. This sets how much architecture is warranted; everything recommended later must be proportionate to it. When between two sizes, choose the smaller.

## 4. Ask questions in small groups

Ask three to five questions at a time and wait for answers before the next group. Skip anything already known. With each question give a brief recommendation and a one-line reason, so the user can simply agree.

**Group A - Scope and stack**
- Kind of work: new app, migration, refactor or feature.
- Language: JavaScript or TypeScript.
- React version: verify the current stable version with the package manager (`npm view react version`) instead of assuming; note any constraint that requires an older one.
- Framework and build tool, or keep the existing setup.
- Package manager and Node version constraints.

**Group B - Product**
- Pages, routes, roles and the key workflows from step 2, where still open.
- Content that must be indexable or fast on first load (this drives the rendering decision).

**Group C - Data and backend**
- API style and whether a contract exists (OpenAPI, GraphQL schema).
- Authentication method and where sessions live; authorization rules and who enforces them.
- Real-time, offline or large-data needs.

**Group D - Quality requirements**
- Performance targets and the devices and networks users really have.
- Accessibility level required.
- Security or compliance constraints.
- Supported browsers.
- Testing expectations.
- Deployment target, environments and who operates it.

**Group E - Constraints**
- Team size and experience with the candidate technologies.
- Deadlines, and anything already decided that cannot change.

## 5. Evaluate the architecture

Work through each area below. For areas marked with a skill, load that skill when the area involves a real decision for this project; skip it when the answer is obvious for the application's size.

| Area | What to decide | Reference |
|---|---|---|
| Rendering model and framework | Client-rendered, server-rendered, static, or mixed; which framework, if any | - |
| Structure | Flat, feature-based or layered; module boundaries and dependency direction | Load the `frontend-architecture` skill |
| Component architecture | Shared UI approach, design system or component library | `frontend-architecture` (same load) |
| State and data flow | Category and owner for each kind of state; server-state approach; URL state | Load the `frontend-state-architecture` skill |
| API integration | Client layer, typing, contract source, error shape | `frontend-architecture` (same load) |
| Authentication and authorization | Session handling, token storage, permission model, route protection | Load the `frontend-security-audit` skill when the app has login, roles or sensitive data |
| Error handling | Error classification, boundary layout, retry policy | Load the `frontend-resilience` skill when the app depends on remote data |
| Performance | Budgets tied to the targets from Group D; code-splitting approach | Decide here; detailed diagnosis is later work |
| Accessibility | Target level and how it will be checked | - |
| Testing | Levels and tools, and what is deliberately not tested | Load the `frontend-testing-strategy` skill for a medium or large app |
| Deployment and operations | Hosting, environments, configuration, monitoring, rollback | Load the `frontend-production-readiness` skill when a production release is in scope |
| Scalability and maintainability | What is expected to grow and how the structure absorbs it | - |

A small application typically needs only the structure and state rows considered explicitly. Do not load every reference by default.

**For every significant decision, compare options.** Follow the decision process in the principles: state the problem, list at least two real options including the simplest one, compare them against this project's facts, recommend one, and say what it commits the team to. Do not recommend a technology because it is common; recommend it because of something true about this project, and say what that is.

Prefer, in order: what the platform provides, what is already installed, and only then a new dependency.

## 6. Write Architecture Decision Records

Write an ADR for each decision that is expensive to reverse or that a future maintainer will question: framework and rendering model, structure, state and data approach, authentication approach, and any notable dependency. Use the ADR template in the `frontend-architecture` skill (context, options considered, decision, rationale, consequences).

Do not write ADRs for routine or easily reversed choices. For a small application, one or two ADRs, or none, may be right.

Present ADRs as proposed. They are saved to the repository only as part of the approved implementation.

## 7. Summarize and get approval

Present, before any implementation:

1. **Application size** and the signals behind it.
2. **Decisions**: a table of topic, choice and reason.
3. **ADRs** for the significant decisions.
4. **Implementation plan**: ordered milestones, each small enough to validate, with the validation step named.
5. **Deliberately left out**: what is not being built or added, and what would trigger adding it.
6. **Open questions and risks**.

Do not make major architectural decisions on the user's behalf. Wait for explicit approval.

## 8. Hand off

After approval, continue with the workflow that matches the work:

| Work | Next |
|---|---|
| New application | `build-frontend-app` |
| Migration or major version upgrade | `migrate-frontend-app` |
| Feature in an existing application | `develop-frontend-feature` |
| The current state must be assessed before deciding | `audit-frontend-quality`, then return here |

Pass the approved decisions along so they are not asked again.

## Mistakes to avoid

- Asking questions the repository already answers.
- Asking all questions at once.
- Recommending the same stack regardless of the application.
- Presenting one option as if there were no alternatives.
- Designing for scale nobody has asked for.
- Starting implementation before approval.
