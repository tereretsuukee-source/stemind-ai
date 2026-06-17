# Security posture — STEMind

Last reviewed: 2026-06-17

## What's enforced

- **CAPTCHA** (Cloudflare Turnstile) is mandatory on the public demo. Tokens are server-verified (`siteverify`) and single-use (in-memory replay map).
- **Per-IP rate limit** on `stem-demo-public`: 5 requests/min, returns `429` + `Retry-After`. Best-effort, per-instance (cold-start resets).
- **CSP** declared via `<meta http-equiv>` in `index.html` with `frame-ancestors 'none'`, `object-src 'none'`, scoped `connect-src`, etc.
- **Permissions-Policy**, **Referrer-Policy**, **X-Content-Type-Options** declared via meta.
- **CORS allow-list** on `stem-demo-public`: only `stemind.lovable.app`, preview, and `*.lovable.app` / `*.lovableproject.com` get a matching `Access-Control-Allow-Origin`. Other browser origins are rejected by the browser.
- **Private endpoints** (`stem-solver`, `stem-demo`) require auth and are never wired into public flows.
- **Response validation** on the demo stream: a `[[VALIDATION]]` sentinel checks for `**Final answer:**`, no placeholders, balanced LaTeX. Client auto-retries once on failure.

## Accepted platform limitations

These cannot be fixed inside the project; they require hosting-level changes that Lovable's static CDN does not currently expose.

1. **No HTTP-header CSP / HSTS / X-Frame-Options.** CSP ships as a `<meta>` tag only. Most modern browsers honour meta CSP for everything except `frame-ancestors` and `report-uri`. To enforce `frame-ancestors` at the network layer or to enable HSTS, the response must come from a host we control (e.g. self-hosted behind Cloudflare).
2. **`'unsafe-inline'` for scripts and styles.** Removing it requires per-request nonces or content hashes, which need either SSR or a hosting-layer header rewriter. Vite's static build plus shadcn/Tailwind's runtime style injection make nonce-based CSP infeasible without a dedicated edge proxy.
3. **CORS is non-authoritative.** The allow-list deters embedded widgets on unauthorised origins; it does not stop `curl`/server-to-server callers. Authentication (CAPTCHA + rate limit) is the real boundary.
4. **Rate-limit storage is per-instance.** Lovable Cloud edge functions have no shared KV/Redis primitive. Limits are best-effort per cold-start instance — fine for drive-by bot deterrence, not for hard quotas.

## Out-of-scope / explicit non-goals

- **Staging-only Turnstile test keys.** Cloudflare publishes always-pass test keys for load testing, but enabling them on the production project would silently disable bot protection. They will only be introduced once a separate staging deployment exists.
- **Headless load testing through the real CAPTCHA.** Turnstile is designed to block this; meaningful human-path benchmarks need either a staging build with test keys or a residential-browser farm. Direct API bot tests correctly fail by design.

## Reporting

Security issues: open a private channel with the maintainer rather than filing a public issue.
