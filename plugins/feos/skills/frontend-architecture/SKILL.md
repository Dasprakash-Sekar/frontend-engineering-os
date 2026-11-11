---
name: frontend-architecture
description: Reference for designing frontend structure that stays maintainable as an application grows - feature-based vs layered organization, component architecture, module boundaries and dependency direction, shared code, routing, authentication and multi-role architecture, API contract boundaries, design systems, when micro-frontends are justified, and writing Architecture Decision Records (ADRs). Use when choosing or reviewing project structure, deciding where code belongs, untangling coupled features, or recording a significant technical decision. Not for where individual state lives (use frontend-state-architecture) or for React rendering behavior (use react-internals).
argument-hint: [decision, area, or question]
---

# Frontend Architecture

Decision or area: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

## 1. Scope and boundaries

This skill owns how code is *organized and allowed to depend on other code*: folders, modules, boundaries, the shape of routing and auth, and how decisions are recorded.

It does not own:
- Which category a piece of state falls into, caching and invalidation: `frontend-state-architecture`.
- Error boundary placement and recovery design: `frontend-resilience`.
- Token storage, CSRF and other security controls: `frontend-security-audit`.
- Build pipeline and deployment: `frontend-production-readiness`.

## 2. When to consult

- Choosing a structure for a new project, or deciding whether an existing one should change.
- Deciding where a new piece of code belongs.
- Features import each other's internals, or a change in one place breaks unrelated places.
- A decision is expensive to reverse and should be recorded.

Do not load this to add a component to an existing, well-organized feature.

## 3. Mental model

**Architecture is the set of decisions that are expensive to change.** Everything else is implementation. Spend design effort in proportion to the cost of being wrong.

**Structure exists to limit what you must understand to make a change.** A good boundary lets someone change a feature while reading only that feature. If a small change requires opening ten folders, the boundaries are in the wrong place regardless of how tidy the tree looks.

**Dependencies point one way.** Code that changes often should depend on code that changes rarely, never the reverse:

```
app (composition: routes, providers)
  -> features (business capabilities)
    -> shared (ui components, hooks, lib, api client, types)
```

`shared` knows nothing about features. Features do not import from other features' internals. `app` wires features together.

**Coupling and cohesion.** Put together what changes together; separate what changes for different reasons. Organizing by technical type (`components/`, `hooks/`, `services/`) groups things that merely look alike. Organizing by feature groups things that change together.

**Duplication is cheaper than the wrong abstraction.** Two features that look similar today often diverge. Extract shared code after a real third use, when the common shape is known.

## 4. Decision criteria

**Structure**

| Option | Shape | Choose when | Cost |
|---|---|---|---|
| Flat / by type | `components/`, `hooks/`, `pages/` | Small app, one developer, few domains | Breaks down past a few dozen files per folder; features become scattered |
| Feature-based | `features/<name>/{components,hooks,api,...}` plus `shared/` | Several domains, more than one developer, long-lived | Needs discipline on boundaries; some early judgment about feature edges |
| Layered (domain, application, infrastructure, ui) | Layers with strict inward dependencies | Heavy client-side business rules that must be tested without UI or network | High ceremony; overkill when the frontend is mostly forms over an API |
| Micro-frontends | Independently built and deployed apps composed at runtime or build time | Several teams that must release independently, and the organization cost is already real | Duplicate dependencies, version skew, shared-state and routing complexity, harder testing |

Default for a medium application: feature-based, with a thin `shared` layer. Use the size table in the principles document; when unsure, choose the lighter option.

Always follow an existing convention that works. Do not restructure a repository as a side effect of another task.

**A feature folder** contains only what that feature needs. Create subfolders when there are files to put in them, not before.

```
features/orders/
  components/      # UI used only by this feature
  hooks/           # feature logic
  api/             # requests, query keys, response mapping
  types.ts
  index.ts         # the public surface; other code imports only from here
```

**Module boundaries**

- Each feature exposes a public surface. Everything else is private.
- Feature-to-feature use goes through that surface, or is lifted: if `orders` and `invoices` both need something, move it to `shared` or compose both in `app`.
- A cycle between two features means they are one feature, or a third concept is missing.
- Enforce boundaries with tooling only when the team is large enough to break them by accident (lint import rules, path restrictions). On a small project, convention is enough.

**Component architecture**

| Question | Guidance |
|---|---|
| Should this be one component or several? | Split when a part has its own state, its own reason to change, or is reused. Do not split just to shorten a file |
| How do I make it reusable? | Prefer composition (`children`, slots) to a growing list of boolean props. Many boolean props mean several components pretending to be one |
| Where does data fetching go? | In the feature, close to the route or the component that needs it. Shared UI components receive data by props and know nothing about the API |
| Controlled or uncontrolled? | Uncontrolled by default for simple inputs; controlled when the parent must read or constrain the value on every change |
| Is this a shared component yet? | Only after a real second consumer in a different feature |

**Design patterns.** Use a pattern when it removes a concrete problem you can point to:

| Problem | Pattern |
|---|---|
| Logic reused across components | Custom hook |
| Related components sharing implicit state (tabs, menus) | Compound components with context |
| Vendor SDK or API details leaking everywhere | Adapter or facade at the boundary |
| Component needs flexible inner content | Composition via `children` or render slots |
| Behavior varies by type with a growing `switch` | Lookup map or strategy object |

Do not introduce containers, repositories, factories or dependency injection without the problem they solve.

**SOLID, applied to React**

- Single responsibility: a component or hook has one reason to change.
- Open/closed: extend through composition and props, not by editing a shared component for each new caller.
- Interface segregation: pass the fields a component needs, not an entire entity "in case".
- Dependency inversion: features depend on a small interface (a hook, a function), not on a vendor SDK directly.

Liskov substitution rarely applies. Do not force it.

**Domain concepts.** Borrow from domain-driven design only what helps: use the business's own words for names, and draw feature boundaries along business capabilities. Map API responses to the shapes the UI needs at the API boundary so backend naming does not spread through components. Full tactical DDD (aggregates, repositories, domain events) is rarely justified in a frontend.

**Routing architecture**

- Routes are composition, not logic. A route file wires a feature's page to a path and its data needs.
- Split code at route boundaries.
- Put state that must survive reload or be shared by link in the URL.
- Guards belong at the route level, in one place, not repeated inside pages.

**Authentication and multi-role architecture**

- One module owns the session: login, logout, refresh, and "who is the current user". Nothing else reads tokens.
- Express access as *permissions* (`order:refund`), derived from roles in one place. Components ask "can the user do X", never "is the user an admin". Role names change; capabilities are stable.
- Decide whether roles differ by *navigation and screens* (separate route trees or layouts per role) or by *actions within shared screens* (permission checks on controls). Mixing the two ad hoc is the usual source of tangled conditionals.
- UI checks decide what to show. The server decides what is allowed.

**API contracts**

- One client module owns base URL, auth attachment, error normalization and cancellation. Features call typed functions, not `fetch`.
- Treat the response as untrusted at the boundary: validate or narrow where a wrong shape would cause damage.
- If an OpenAPI or GraphQL schema exists, generate types from it. Do not hand-maintain duplicates.
- A contract change is a coordinated change. Do not alter request or response shapes unilaterally.

**Design system**

| Situation | Approach |
|---|---|
| One app, small team | A `shared/ui` folder of components and design tokens |
| Several apps that must look alike | A versioned package |
| Existing library meets the need | Use it and wrap only where behavior must be constrained |

Build a custom design system only when consistency across products is a real requirement and someone will own it.

## 5. Scenarios

**"Every change touches five folders."** By-type structure in an app that has outgrown it. Introduce feature folders incrementally: move one feature at a time, starting with the one changed most often. Do not big-bang.

**`features/checkout` imports `features/cart/components/CartLine`.** Reaching into internals. Either export it from `cart`'s public surface if `cart` truly owns it, or move it to `shared` if it is generic.

**A `shared/utils` folder with 80 unrelated files.** `shared` became a dumping ground. Move single-consumer utilities back into their feature; group the rest by purpose.

**A `Button` with fourteen boolean props.** Several components merged into one. Split into composable parts or separate variants.

**`if (user.role === 'admin' || user.role === 'manager')` in thirty files.** No permission layer. Introduce a single `can(permission)` and map roles to permissions once.

**Team proposes micro-frontends for a four-developer app.** No independent-release problem exists. Feature folders with enforced boundaries give the isolation without the runtime cost.

**Backend renames a field and forty components break.** API shapes used directly in the UI. Map responses at the API boundary so one mapping changes.

## 6. Anti-patterns

- Choosing an architecture because a large company uses it.
- Empty folders and abstractions created "for later".
- A `common` or `utils` module that everything imports and nobody owns.
- Circular dependencies between features.
- Shared components that import from features.
- Business rules inside presentational components.
- Role-name checks scattered through the UI.
- One global store or context used as the integration point for all features.
- Restructuring a working codebase without a problem that the new structure solves.
- Barrel files (`index.ts` re-exports) at every level; they slow tooling and hide cycles. Use one per feature as its public surface.

## 7. Version checks

Routing, data loading and rendering models differ sharply between frameworks and major versions (for example, file-based versus configured routes, and loader-based versus component-based data fetching). Read the installed framework and router versions, and confirm the recommended structure in that version's official documentation before proposing one.

## 8. Validation

- For a proposed structure: walk one real feature through it. Where does each file go? What may it import? If the answer needs a judgment call every time, the rules are not clear enough.
- For a boundary claim: search imports to confirm no feature reaches into another's internals and that no cycles exist. Report what you searched.
- For a restructure: build, type check and tests must pass after each moved feature, not only at the end.

## Architecture Decision Records

Write an ADR for a decision that is expensive to reverse, affects several features, or that a future maintainer will question. Do not write one for routine choices.

Store ADRs with the code (commonly `docs/adr/NNNN-short-title.md`), numbered, and never rewrite an accepted one; supersede it with a new record.

```markdown
# NNNN. Short title of the decision

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD

## Context
The situation and the forces in tension. Facts about this project, not general theory.

## Options considered
1. Option A: what it is, advantages, disadvantages.
2. Option B: ...
3. Do nothing / keep current approach: ...

## Decision
The option chosen, stated in one or two sentences.

## Rationale
Why this option fits this project, tied to the context above.

## Consequences
What becomes easier, what becomes harder, what the team is now committed to,
and what would make us revisit this decision.
```
