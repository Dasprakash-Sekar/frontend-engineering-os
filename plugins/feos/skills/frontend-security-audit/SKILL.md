---
name: frontend-security-audit
description: Reference and review procedure for frontend security - XSS and unsafe HTML, CSRF, CORS, Content Security Policy, JWT and session token handling, secure cookies (HttpOnly, Secure, SameSite), token lifecycle, authentication vs authorization, role- and permission-based access control, route guards and the backend authorization boundary, URL validation and open redirects, file upload risks, sensitive data exposure, secrets in client bundles, dependency vulnerabilities, and third-party scripts. Use for a frontend security review, when implementing auth, permissions, uploads, redirects or rendering of user-supplied content, or when assessing where tokens are stored. Reports findings with realistic impact; read-only unless fixes are requested. Not a substitute for a backend or infrastructure security review.
argument-hint: [path, feature, or concern]
---

# Frontend Security Audit

Scope: $ARGUMENTS

## Before you start

Load the `frontend-engineering-principles` skill once per session, unless it is already loaded.
If it is unavailable, apply this minimum: understand the problem and the existing code before changing anything; choose the simplest design that solves the actual problem; never claim a check passed unless it ran.

When used as a review, do not modify files. Apply fixes only if the user asks afterwards.

## 1. Scope and boundaries

This skill owns *security properties of code that runs in the browser, and the frontend's side of each trust boundary*.

It does not own:
- Server-side authorization, input handling and infrastructure. This skill states what the server must enforce and flags where the frontend appears to rely on itself; it cannot verify the server.
- Where the session module sits in the codebase: `frontend-architecture`.
- Monitoring and release controls: `frontend-production-readiness`.

Never read, print or copy real secret values while reviewing. If a secret is found in the repository, report its location and type, not its value.

## 2. When to consult

- A security review is requested.
- Implementing or changing login, session handling, permissions or route guards.
- Rendering content that came from users or third parties.
- Handling redirects, URLs from input, file uploads, or `postMessage`.
- Adding a third-party script or SDK.

Do not load this for changes that touch none of these.

## 3. Mental model

**Everything in the browser belongs to the user, and to any attacker who can run script in the page.** Client code can be read, modified and bypassed. Any value sent from the client can be forged. The frontend's job is to avoid creating vulnerabilities and to give a good experience; enforcement lives on the server.

**Trust boundaries.** Data crosses a boundary when it enters from: user input, the URL, API responses, storage, `postMessage`, or third-party scripts. Treat it as untrusted until validated or safely encoded for the context where it is used.

**Authentication is who you are. Authorization is what you may do.** A valid login says nothing about permission for a specific action on a specific record. Both are decided on the server for every request.

**Defense in depth.** No single control is assumed to hold. Output encoding plus CSP; HttpOnly cookies plus short lifetimes plus server checks. Recommend layers, and say which layer is the real control and which are backups.

**Realistic impact.** Rate a finding by what an attacker can actually do with it in this application, not by its category name.

## 4. Decision criteria

**XSS: where it enters**

| Sink | Risk | Safe approach |
|---|---|---|
| JSX text and attributes | Escaped by React | Safe by default |
| `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` | Executes markup | Avoid. If rich HTML is required, sanitize with a maintained sanitizer immediately before rendering, with an allowlist |
| `href`, `src`, `action`, `formAction` from data | `javascript:` and `data:` URLs execute | Parse with `URL` and allow only expected schemes (`http:`, `https:`, `mailto:` as needed) |
| `eval`, `new Function`, string arguments to `setTimeout` / `setInterval` | Executes strings | Do not use with any dynamic input |
| Markdown or rich-text rendering | Often passes raw HTML | Disable raw HTML or sanitize the output |
| Server-rendered state embedded in HTML | Breaking out of the script block | Use the framework's serialization; never hand-concatenate JSON into a script tag |
| Spreading untrusted objects as props (`{...data}`) | Can inject `dangerouslySetInnerHTML` or handlers | Pick known fields |

Sanitize at the point of output, not on the way into storage. Escaping must match the context (HTML, attribute, URL, CSS, script).

**Content Security Policy.** CSP limits damage when an injection gets through. It is a backup, not the fix. A useful policy avoids `unsafe-inline` and `unsafe-eval` for scripts, uses nonces or hashes, restricts `script-src`, `connect-src` and `frame-ancestors`, and is rolled out in report-only mode first. Note CSP-incompatible patterns in the code (inline scripts, inline event handlers, `eval`) as findings because they block adopting a strong policy. Setting headers is a server or hosting task; state what is needed.

**Token storage**

| Storage | Readable by injected script | Sent automatically | Notes |
|---|---|---|---|
| Cookie with `HttpOnly; Secure; SameSite` | No | Yes | Preferred for session or refresh tokens when the backend supports it. Needs CSRF protection |
| In memory (variable) | Yes, while the page lives | No | Lost on reload; pair with a refresh cookie |
| `localStorage` / `sessionStorage` | Yes, trivially and persistently | No | Any XSS becomes token theft. Avoid for long-lived or high-value tokens |

An HttpOnly cookie does not stop XSS from *acting as* the user while the page is open; it stops the token being stolen and reused elsewhere. Say so when recommending it.

**Token lifecycle.** Short-lived access tokens; refresh handled in one place with a single in-flight refresh shared by concurrent requests; refresh-token rotation on the server; logout that invalidates on the server and clears client state and caches; behavior defined for expiry mid-session. Never log tokens or put them in URLs. A JWT payload is readable by anyone: it is encoded, not encrypted, so it must not contain secrets, and the client must not make security decisions by trusting its claims.

**Cookies**

| Attribute | Purpose |
|---|---|
| `HttpOnly` | Not readable from JavaScript |
| `Secure` | Sent over HTTPS only |
| `SameSite=Lax` or `Strict` | Not sent on most cross-site requests; primary CSRF mitigation. `None` requires `Secure` and reintroduces CSRF exposure |
| Narrow `Path` / `Domain`, `__Host-` prefix | Limits where the cookie applies |

**CSRF.** Relevant whenever credentials are sent automatically (cookies). Controls, in combination: `SameSite` cookies; an anti-CSRF token or a custom header the server requires; server-side `Origin` checks; and no state changes on GET. An API authenticated only by an `Authorization` header set by script is not exposed to classic CSRF, but that usually means the token is script-readable, which trades CSRF risk for XSS risk.

**CORS.** CORS relaxes the same-origin policy for reading responses; it is not an access-control mechanism and does not protect the server. Flag: `Access-Control-Allow-Origin: *` together with credentials (browsers reject it, and attempts to work around it by reflecting any origin are a vulnerability); reflected origins without an allowlist; and frontend code that assumes CORS prevents requests from being sent. Configuration is server-side; report what you can observe.

**Access control in the UI**

| Layer | Role |
|---|---|
| Route guard | Redirects users who should not see a page. Convenience and UX |
| Hidden or disabled control | Avoids offering actions that will fail |
| Server check on every request | The actual control |

Findings to look for: data fetched and merely hidden in the UI; ids in URLs or requests that the server may not check against the current user (insecure direct object reference; flag for backend verification); authorization decisions made from client-stored roles or decoded token claims; sensitive routes whose code and data load before the guard runs. Prefer permission checks (`can('invoice:approve')`) over role-name checks; ownership of that structure: `frontend-architecture`.

**URLs and redirects**

- Redirect targets taken from query parameters (`?next=`, `?returnUrl=`) must be validated: allow only same-origin relative paths, or an explicit allowlist. Reject `//host`, absolute URLs, and backslash tricks; parse with `URL` against the current origin and compare origins.
- `target="_blank"` links to untrusted sites: ensure `rel="noopener"` (modern browsers default to it; older ones do not).
- `postMessage`: always check `event.origin` against an allowlist when receiving, and never send with target origin `*` when the message contains anything sensitive.

**File uploads**

| Risk | Frontend role | Real control |
|---|---|---|
| Wrong type or size | Check for UX; show clear errors | Server validates type by content, size and count |
| Malicious content | None reliable | Server-side scanning; store outside the web root or on a separate origin |
| Uploaded HTML or SVG executing script | Do not render user uploads inline from the app's origin | Serve from a separate domain with `Content-Disposition: attachment` and correct content types |
| File names | Never trust or reflect them unescaped | Server generates storage names |

Client-side checks of extension or MIME type are trivially bypassed. State that plainly.

**Sensitive data exposure**

- Secrets in the bundle: API keys, private tokens, internal URLs. Anything in a client-exposed variable (`VITE_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`) ships to every user. A key that must be public (for example a publishable key) must be restricted on the provider's side.
- Source maps published with full source; decide deliberately (ownership of the release decision: `frontend-production-readiness`).
- Personal data or tokens in `localStorage`, URLs, logs, analytics events or error reports.
- Over-fetching: responses that include fields the UI does not show. Flag for backend.
- Caches not cleared on logout, leaving the previous user's data.
- Autocomplete on sensitive fields, and sensitive values left in component state after use.

**Dependencies and third-party scripts**

- Run the package manager's audit command if it is safe and read-only in this environment; report results as run, not assumed. Triage by reachability: a vulnerability in a build-only tool differs from one in shipped code.
- Lockfile committed; no unpinned installs from URLs or git branches in production dependencies.
- Every third-party script runs with the page's full privileges. For each: is it necessary, is it loaded from a pinned version with Subresource Integrity where the host supports it, can it be sandboxed in an iframe, and does CSP restrict it. Tag managers allow others to add script without code review; flag it.

**Clickjacking.** The app should not be frameable by other origins unless intended: `frame-ancestors` in CSP (or `X-Frame-Options`). Server-side header; report its absence if observable.

## 5. Scenarios

**Comments render with `dangerouslySetInnerHTML`.** Stored XSS: one user's script runs in every viewer's session and can act as them. Render as text, or sanitize with an allowlist at output. If tokens are in `localStorage`, impact rises to account takeover.

**Access token in `localStorage`, valid for 30 days.** Any XSS, including from a compromised dependency, yields a reusable token. Recommend HttpOnly refresh cookie plus short-lived in-memory access token, if the backend can support it; note the CSRF controls this then requires.

**Admin page hidden by `user.role === 'admin'` read from a decoded JWT.** A user can edit client state and reach the page. Harmless only if every admin API call is authorized on the server. Flag for backend verification and say the UI check is not a control.

**`/login?next=https://evil.example`.** Open redirect: a trusted link sends users to a phishing page after login. Allow only same-origin paths.

**`<a href={user.website}>`.** A `javascript:` URL executes on click. Validate the scheme.

**`VITE_PAYMENT_SECRET_KEY` in the env example.** A server secret exposed to every client. It must move to the server; the key should be rotated because it must be assumed leaked.

**Avatar upload accepts SVG and displays it from the app origin.** SVG can contain script. Serve uploads from a separate origin or convert to a raster format on the server.

**An analytics snippet loaded from a third-party CDN without integrity.** If that host is compromised, the script runs with full access to the page. Pin the version, add integrity where possible, restrict with CSP.

**`window.addEventListener('message', e => handle(e.data))`.** Any site that can frame or open the app can send messages. Check `e.origin`.

## 6. Anti-patterns

- Treating a route guard or hidden button as authorization.
- Trusting client-side validation as a security control.
- Secrets in client-exposed environment variables.
- Long-lived tokens in `localStorage`.
- Sanitizing on input instead of encoding on output.
- Home-made sanitizers and regex-based HTML filtering.
- Disabling a security lint rule or CSP directive to make something work.
- `Access-Control-Allow-Origin` reflecting any origin with credentials.
- Tokens or personal data in URLs, logs or analytics.
- Reporting a category name without explaining what an attacker gains here.
- Declaring the application "secure". A review reports what was checked and what was found.

## 7. Version checks

Confirm against current official sources before asserting specifics: browser default behavior for `SameSite` and `noopener`, which changes over time; the framework's own protections and escape hatches (its HTML-escaping rules, its server-action or API-route CSRF handling, how it exposes environment variables to the client); the sanitizer library's current recommended configuration; and current OWASP guidance for the topic under review.

## 8. Validation

**Procedure for a review**

1. Detect the stack and how auth works (cookie or token, where stored, how refreshed).
2. Search for the sinks and patterns in section 4. Report the searches run.
3. Trace sensitive data flows: where tokens, personal data and permissions enter, are stored, and leave.
4. Run dependency audit if safe; record the command and outcome, or record that it was not run and why.
5. List what could not be verified from the frontend (server authorization, headers, cookie attributes set by the server) as items for backend confirmation, not as passes.

**Finding format**

- Severity: Critical, High, Medium or Low, by realistic impact in this application.
- Location: `file:line`.
- Issue: what the code does.
- Root cause: why it is unsafe.
- Impact: what an attacker could realistically do, and what they would need.
- Recommendation: the fix, and which layer is the real control.

End with: checks run and their results, checks not run, and items needing backend verification. Do not state that the application is secure.
