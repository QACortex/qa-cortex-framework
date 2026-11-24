# ADR 0003 — S3: Playwright artifacts leak secrets; treat them as secrets, keep them off in production

- Status: accepted (spike S3, 2026-11-23)
- Spike code: `spikes/s3-trace-secrets/`. Raw matrices are in `results/leak-matrix-{baseline,lean}.md`.
- Versions tested: Node 26.13.1, `@playwright/test` 1.65.1, Chromium only (build 1255)

## Question
Which Playwright artifacts contain secret values used during a test, and can configuration alone prevent that?

## Method
- **Canaries.** One unique random canary per channel, 27 in all. They are generated at run time into `out/canaries.json` and never written into test source, because traces and the HTML report embed source code.
- **App under test.** A local Node server issues a session cookie, renders an API key, and returns a token from `/api/token`.
- **Artifacts produced:**
  - trace, video and screenshots
  - HTML, blob, JSON, JUnit and list reporters
  - error-context for failures
  - a `storageState` file
- **Scanner (`scan.mjs`).** It recurses into every zip, including traces nested inside blob and HTML reports, and into the base64 zip embedded in the HTML report's `index.html`. It searches each canary as plain text, UTF-16, base64 at all three byte alignments, and the encoded Basic-auth header.
- **Two variants:**
  - **baseline:** `trace: 'on'`, video and screenshots on.
  - **lean:** trace on with `snapshots: { dom: false, screen: false, aria: false }` and `sources: false` (the object form added in 1.63), plus video and screenshots off.
- **One extra check** ran a real, unexpected failure (not `test.fail()`) and looked at the runner's stdout.
- **Release notes 1.61–1.65 checked:** there is **no built-in redaction or masking option** for traces or reports.

## Findings

### Leaks (baseline). The trace is the hub, and both reports embed a full copy of it.
| Channel | Where it ends up |
|---|---|
| `fill()` / `pressSequentially()` value, **including `type="password"`** | action params, action log line (`fill("…")`), DOM snapshot (`__playwright_value_`), form POST in the network log |
| URL query string | `goto` params, network log, HTML report test steps |
| `page.evaluate` args **and return values** | action params and call results |
| browser `console.log` | trace events |
| `extraHTTPHeaders`, API `Authorization: Bearer` | network log request headers, `newContext`/`fetch` params, API log lines |
| API request JSON body; response bodies containing tokens | trace resources and call results |
| cookies (from `addCookies` or `Set-Cookie`) and `localStorage` | network log, `addCookies` params, `storageState()` result, storageState file |
| server-rendered sensitive data | DOM snapshots, **screenshots (readable)**, video (by inference: it records the same pages) |
| selectors containing values | action params, HTML report steps |
| `test.step` titles and `params`, custom `expect` messages | trace, HTML, blob and JSON reports |
| **expected value of a *passing* assertion** (`expect(x).toBe(secret)`) | trace call params |
| `console.log` in test code | runner stdout, JSON, JUnit, HTML and blob reports, trace |
| `testInfo.attach` bodies; annotations | all reports; annotations also in JUnit |
| **failed assertion** on a text or password field | error message `Received: "…"` and the **error-context aria snapshot** (`textbox "Password": <value>`). Lands in the HTML, blob and JSON reports, and in the **runner stdout of a real failure (CI logs)** |

### Not leaked
- **`httpCredentials` (Basic auth).** Chromium answers the auth challenge below the layer Playwright records, so the header never appears in the network log. Verified in Chromium only.
- **Environment variables** the test never passes to Playwright. Nothing dumps `process.env`.

### Screenshots
- A password field shows as dots.
- Text inputs and server-rendered secrets are readable.

### What the lean variant fixes, and what it doesn't
- **Fixed:** DOM snapshots, the network log and screenshot/video copies are gone. `serverRendered` no longer leaks.
- **Not fixed:**
  - action params (`fill` value, `goto` URL, `addCookies`, `fetch` headers)
  - call results (`evaluate` return values, `storageState()`)
  - action log lines
  - step titles and params
  - expected values of passing assertions
  - everything in the reports
- **So no Playwright configuration makes a trace safe** when a test handles a secret directly.

## Decisions

### General rules
1. **Every trace, HTML report and blob report is a secret-bearing artifact.** Docs and presets say so: restricted CI artifact access, short retention, and never published to public pages.
2. **The real fix is keeping secrets out of traced code paths.** Configuration can't do it.

### Module 2 — Production guard
- It **checks** the effective Playwright config and never silently rewrites it, in line with "do not wrap".
- For a `production: true` profile it throws at startup unless all of these hold:
  - `trace: 'off'`
  - `video: 'off'`
  - `screenshot` is `'off'` or `'only-on-failure'`, after an explicit opt-in
- It also warns when an HTML or blob reporter is configured in production.

### Module 3 — Sessions (input to S4)
- **Log in outside traced test code.** A setup step logs in via API or UI with tracing off, writes `storageState`, and tests reuse it. Passwords then never reach a trace.
- **Session tokens and cookies still appear** in later traces, through cookie headers and `newContext` params. Accepted for non-production, short-lived sessions. Production traces are off anyway (module 2).
- **Keep `storageState` and token files out of `outputDir`.** Anything under `test-results/` gets uploaded as a CI artifact. Store them under `.auth/<profile>/` (gitignored).
- **Prefer `httpCredentials` for Basic auth.** It is the one auth channel seen not to leak.

### Module 5 — Logger
- It can only redact what *it* writes:
  - stdout lines
  - attachments
  - steps it creates
  - annotations
- It redacts by known secret **values** registered by the secrets loader (module 2), not by key names.
- It **cannot** redact Playwright's own recording of actions, network, assertions or failures. Docs must say this plainly.

### Module 6 — Artifact presets
These are plain objects users spread into their config:

| Preset | trace | video | screenshot | Notes |
|---|---|---|---|---|
| `local` | `on` | `retain-on-failure` | `only-on-failure` | |
| `ci` | `retain-on-failure` | `off` | `only-on-failure` | documented as secret-bearing |
| `production` | `off` | `off` | `off` | the shape module 2 enforces |

### Lint rules for `@qa-cortex/eslint-config` (later; best effort)
Flag:
- `expect(<secret>).toBe(...)`
- secrets in `test.step` titles
- `console.log` of secret-named identifiers

### Post-processing artifacts
Rewriting trace and report zips to replace known secret values is **out of scope for Phase 1**.
- **Why it's feasible:** it doesn't depend on the trace format, it would be a plain search-and-replace across files, and we know the exact values.
- **Why not now:**
  - It edits artifacts after the run and would have to keep up with every artifact type, including base64 inside the HTML report.
  - A miss gives false confidence.
  - It sits close to the "no reporter" line in CLAUDE.md.
- **When to revisit:** if users ask for it, as an opt-in Phase 2 tool.

## Not verified
- **Firefox and WebKit.** In particular, whether `httpCredentials` stays out of the network log there.
- **Video contents.** Inferred from screenshots of the same pages; no frames were decoded.
- **`trace: 'retain-on-failure'`.** Not run separately. It keeps the same trace content for failing tests and deletes it for passing ones.
