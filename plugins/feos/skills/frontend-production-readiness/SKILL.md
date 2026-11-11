---
name: frontend-production-readiness
description: Reference and checklist for getting a frontend application ready to operate in production - production configuration and environment management, build-time vs runtime configuration, build optimization, CI/CD gates, source map handling, error monitoring, logging, Real User Monitoring, feature flags, release management and versioning, rollback strategy, cache and asset versioning, browser compatibility, deployment verification, production diagnostics and incident investigation. Use before a first or major release, when setting up a deployment pipeline or monitoring, or when investigating a production-only problem. Produces a readiness checklist with verified and unverified items. Never deploys or changes infrastructure without explicit approval.
argument-hint: [app, release, or incident]
---

# Frontend Production Readiness

Target: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

Never deploy, publish, change infrastructure, or alter production configuration without explicit approval. This skill prepares and verifies; the user releases.

## 1. Scope and boundaries

This skill owns *the gap between "works on my machine" and "operates reliably for users"*: configuration, pipeline, observability, release and recovery.

It does not own:
- What to test and how: `frontend-testing-strategy`.
- Security controls and their review: `frontend-security-audit`.
- Diagnosing a performance problem: `frontend-performance-engineering`.
- In-app error containment and fallbacks: `frontend-resilience`.

## 2. When to consult

- Before the first production release, or a major one.
- Setting up or reviewing CI/CD, environments, monitoring or flags.
- A problem appears only in production.

Do not load this for ordinary feature work on an application that already has a working release process.

## 3. Mental model

**Production is a different environment, not a bigger development one.** Minified code, real networks, old browsers, cached assets from earlier versions, real data volumes, and users who never report errors. Assume nothing carries over until it has been checked against a production build.

**You cannot fix what you cannot see.** Without monitoring, the only signal of a broken release is a user complaint, and most users simply leave. Observability is a precondition for release, not a later improvement.

**Every release needs a way back.** Before deploying, know how to return to the previous version and how long that takes. A release without a rollback path is a bet.

**Decouple deploy from release.** Deploying puts code in production; releasing exposes it to users. Feature flags and gradual rollout separate the two, so a problem affects few users and can be turned off without a redeploy.

**Old and new versions coexist.** During and after a deploy, some users run old JavaScript against the new API, or request chunks that no longer exist. Design for that overlap.

## 4. Decision criteria

**Configuration: build time or runtime**

| | Build-time (embedded at build) | Runtime (loaded when the app starts) |
|---|---|---|
| How | Environment variables inlined by the bundler | A config file or endpoint fetched at startup, or values injected into the HTML by the server |
| One build artifact for all environments | No; rebuild per environment | Yes; build once, promote the same artifact |
| Change without rebuild | No | Yes |
| Choose when | Simple setup, few environments | The same artifact must move through staging to production, or values must change without a deploy |

Either way: everything in the client is public. Only non-secret values belong there. Validate required configuration at startup and fail loudly with a clear message if something is missing; a silently undefined API URL is a production incident.

**Environments.** Keep staging as close to production as practical: same build mode, same kind of hosting, similar data shapes. Document every variable by name in `.env.example` with a description and no real values. Never commit real environment files.

**Build**

- Production mode, minification, and content-hashed file names for long-term caching.
- Check the output: build it, serve it locally with the production server or preview command, and click through critical paths. Development mode hides errors that only appear after minification or with production flags.
- Review bundle size against a budget (method: `frontend-performance-engineering`).
- Remove development-only code, debug logging and test hooks from the production bundle.
- Reproducible installs: committed lockfile, and the pipeline's clean-install command, not a floating install.
- Pin the Node.js version (an `engines` field or version file) so CI and local builds match.

**CI gates.** In this order, fastest first, each blocking the next:

1. Clean install from the lockfile.
2. Lint and type check.
3. Unit and component tests.
4. Production build.
5. End-to-end tests against the built artifact for critical journeys.
6. Optional: bundle-size budget, dependency audit, accessibility checks.

Only add a gate that someone will act on when it fails. A gate that is routinely overridden is noise.

**Source maps**

| Option | Result |
|---|---|
| Public source maps | Easy debugging; source is readable by anyone. Minified code is already public, but maps make it far more accessible |
| Hidden source maps uploaded to the monitoring service, not served | Readable stack traces in monitoring; source not published. Usually the right default |
| No source maps | Production errors are nearly impossible to interpret |

Whatever is chosen, verify it: load the production site and confirm whether `.map` files are served, and confirm that a reported error shows original file and line. Maps must match the exact release, so tie the upload to the release version.

**Error monitoring.** A production app needs, at minimum: capture of unhandled errors and promise rejections, capture of errors caught by error boundaries, a release identifier on every event, readable stack traces, and alerts that reach a person. Add context that helps and is not personal: route, action, feature flags in effect. Scrub tokens, passwords and personal data before sending. Filter known noise (browser extensions, aborted requests) so real signals stay visible. Decide the sampling rate knowingly.

**Logging.** The browser console is not a logging system in production. Keep console output quiet, send what matters to the monitoring service with a level, and never log secrets or personal data. Use a correlation or request id shared with the backend so a frontend error can be matched to server logs.

**Real User Monitoring.** Lab tests show what could happen; field data shows what does. Collect Core Web Vitals from real users, segmented by page, device class and release, so a regression can be tied to a deploy. Mind privacy rules and consent requirements for the data collected.

**Feature flags**

| Flag type | Lifetime | Example |
|---|---|---|
| Release | Short; remove after full rollout | New checkout behind a flag |
| Operational / kill switch | Long | Disable a heavy widget under load |
| Permission or plan | Long | Feature for a customer tier |
| Experiment | Short | A/B test |

Rules: safe defaults when the flag service is unreachable; flags evaluated in one place, not scattered conditionals; an owner and a removal date for every short-lived flag; and remember that a flag only hides UI. Code behind a client-side flag still ships to everyone, so it is not access control.

**Release and versioning**

- Every build has an identifier (version or commit) visible in monitoring and retrievable from the running app.
- Know what is in a release: changelog or commit range.
- Prefer small, frequent releases; each is easier to verify and to roll back.
- Coordinate with backend changes: deploy backward-compatible API changes first, then the frontend, then remove the old API path. Never require both to switch at the same instant.

**Rollback**

| Method | Speed | Notes |
|---|---|---|
| Re-point hosting to the previous build | Seconds to minutes | Requires previous artifacts to be kept. Preferred |
| Turn off a feature flag | Seconds | Only for flagged changes |
| Revert the commit and redeploy | Full pipeline time | Slowest; last resort |

Before release, answer: who can roll back, how, how long it takes, and is the previous version still compatible with the current backend and data? Rehearse it at least once.

**Caching and version skew**

- HTML: not cached, or revalidated on every request, so users get the new entry point.
- Hashed assets: cached for a long time, immutable.
- Keep the previous release's assets available for a period after deploy. Otherwise users with an open tab request chunks that no longer exist and lazy-loaded routes fail.
- Handle chunk-load failure in the app: detect it and prompt or perform a reload, guarded against reload loops.
- Decide how a long-lived tab learns of a new version: a prompt to refresh, or reload on next navigation.
- A service worker adds a second cache with its own update lifecycle. Have an update strategy and a way to disable it before shipping one.

**Browser compatibility.** Decide the supported browsers from real audience data, record them in the project's browser target configuration so the build tool and CSS tooling agree, and test on the oldest supported version of each engine. Check each newer platform API used against that support list; add a fallback or polyfill only where needed.

**Deployment verification.** After every deploy, check the live site, not the pipeline status:

1. The expected version identifier is served.
2. Critical journeys work (automated smoke test or manual pass).
3. No new errors in the browser console and network panel on key pages.
4. Error rate and Web Vitals in monitoring are in line with the previous release.
5. Configuration points at the right backend and services.

**Diagnosing production-only problems**

| Question | Where to look |
|---|---|
| Did it start with a release? | Error and metric timelines against deploy times |
| Who is affected? | Segment by browser, device, region, release, flag |
| Can it be reproduced? | Production build locally, the same browser and data shape, throttled network |
| What changed? | Diff between the last good and first bad release, including config, flags and backend |
| Is it the cache? | Old HTML or assets, service worker, CDN |
| Is it third-party? | Scripts, extensions, blocked requests |

Common production-only causes: missing or wrong environment configuration, minification exposing reliance on function or class names, stricter CSP, differing server routing for client-side routes (deep links returning 404), stale cached chunks, timezone and locale differences, and real data that is larger or dirtier than test data.

**Incident investigation.** First restore service (roll back or flag off), then investigate. Record the timeline, the trigger, the detection gap (how long before anyone knew, and how they found out), the fix, and one or two changes that would prevent or shorten a repeat. Blame the gap in the system, not the person.

## 5. Scenarios

**App deploys; API calls go to `undefined/users`.** A build-time variable was not set in the pipeline. Validate configuration at startup, and add the deploy-verification step that checks config.

**After a deploy, some users get a blank page when navigating.** Their open tab requests chunks deleted by the new release. Keep old assets for a period and handle chunk-load errors with a guarded reload.

**Error report shows `a.b is not a function at t (main.4f2a.js:1:28374)`.** No source maps in monitoring. Upload hidden source maps per release.

**Users on an older Safari see a broken layout.** Unsupported CSS or JS feature, no agreed browser targets. Define targets, configure the build, test the oldest supported version.

**Deep link works in development, returns 404 in production.** The host does not route unknown paths to the app's entry file. Configure a fallback for client-side routes.

**Release needs frontend and backend to deploy at the same moment.** A breaking contract change. Make the backend change backward compatible, deploy it, then the frontend, then clean up.

**Bug is live and rollback takes forty minutes.** Rollback means rebuilding. Keep previous artifacts and switch hosting back; put risky changes behind flags.

**Monitoring shows thousands of errors, all ignored.** Extension noise and expected errors drown the signal. Filter and classify so alerts mean something.

## 6. Anti-patterns

- Releasing without error monitoring.
- Testing only the development build.
- Secrets in client-exposed configuration.
- A different, hand-made build for production than the one tested.
- No rollback plan, or one never tried.
- Caching the HTML document long-term.
- Deleting old assets at deploy time.
- Treating a green pipeline as proof the release works.
- Permanent "temporary" feature flags.
- Using a client-side flag as access control.
- Logging personal data or tokens.
- Alerts nobody receives or everyone ignores.
- Big-bang releases bundling weeks of changes.

## 7. Version checks

Confirm in current official documentation: how the installed bundler or framework exposes environment variables and which prefixes become public; its production build, preview and output options; its source map modes; the hosting platform's routing, caching-header and rollback features; the monitoring SDK's setup for the installed framework version; and how the project's browser-target configuration is read by its tooling.

## 8. Validation

Produce the checklist below with a status for every item. Mark an item **verified** only if it was checked in this session and say how; otherwise **not verified** with the reason, or **not applicable**. Never report readiness on the basis of unverified items.

**Production readiness checklist**

Configuration
- [ ] Required configuration is validated at startup
- [ ] No secrets in client code or client-exposed variables
- [ ] `.env.example` documents every variable; no real env files committed

Build
- [ ] Production build succeeds from a clean install
- [ ] Production build was run and exercised locally
- [ ] Assets are content-hashed; bundle size reviewed
- [ ] Node.js version pinned; lockfile committed

Quality gates
- [ ] Lint, type check and tests run in CI and pass
- [ ] Critical journeys covered by automated tests

Observability
- [ ] Error monitoring captures unhandled errors and boundary errors with a release id
- [ ] Stack traces resolve to source; source map exposure is a deliberate choice
- [ ] Real-user performance data is collected
- [ ] Alerts reach a person

Release
- [ ] Release is identifiable in the running app and in monitoring
- [ ] Rollback method known, tested, and its duration known
- [ ] Previous assets remain available; chunk-load failure is handled
- [ ] HTML is not cached long-term
- [ ] Risky changes are behind flags with safe defaults

Compatibility and hosting
- [ ] Supported browsers defined and tested
- [ ] Client-side routes resolve on direct load and refresh
- [ ] Security headers and HTTPS in place (review: `frontend-security-audit`)

After deploy
- [ ] Live version verified; critical journeys smoke-tested
- [ ] Error rate and Web Vitals compared with the previous release

List open risks at the end, most serious first.
