# Security Policy

## Supported Versions

`sic` is pre-1.0; only the latest commit on `main` is supported. There are no
backported fixes for older tags yet.

| Version  | Supported |
| -------- | --------- |
| `main`   | ✅        |
| < latest | ❌        |

## Reporting a Vulnerability

**Please do not open public GitHub issues for security problems.**

Report vulnerabilities privately using GitHub's
[Private Vulnerability Reporting](https://github.com/LVMBDV/sic/security/advisories/new).
This creates a draft advisory that only the maintainers can see.

When you report, please include:

- A description of the issue and its impact.
- Steps to reproduce (a minimal proof-of-concept is ideal).
- The commit SHA or version you tested against.
- Any suggested remediation, if you have one.

### What to expect

- **Acknowledgement:** within 72 hours.
- **Triage and severity assessment:** within 7 days.
- **Fix and coordinated disclosure:** target 30 days for high/critical, 90 days
  for low/moderate. We will publish a GitHub Security Advisory and credit you
  unless you prefer to stay anonymous.

## Scope

In scope:

- The `sic` backend (auth, sessions, comment/reaction APIs, embed HTML).
- The frontend widget and embed loader (XSS, CSRF, clickjacking, postMessage
  abuse).
- Default configuration values shipped in this repository.

Out of scope:

- Vulnerabilities in third-party OAuth providers themselves.
- Self-inflicted misconfiguration of a self-hosted instance (e.g. running
  without HTTPS, missing `SIC_ALLOWED_ORIGINS`, weak `SIC_SESSION_SECRET`).
- DoS via traffic volume against your own deployment (run a reverse proxy with
  rate limiting in front of `sic`).

## Hardening notes for operators

- Always serve over HTTPS. Cookies are `Secure` only when `SIC_PUBLIC_URL`
  uses `https://`.
- Set `SIC_ALLOWED_ORIGINS` to the exact origins permitted to iframe the
  widget. An empty value falls back to `'self'` and will block third-party
  embeds.
- `SIC_SESSION_SECRET` must be at least 32 characters of high-entropy random
  data. Rotate by changing the value (existing sessions will be invalidated).
- Put a reverse proxy (Caddy, nginx, Cloudflare, etc.) in front of `sic` for
  TLS termination, HTTP/2, and additional rate limiting.
