# sic

> A lightweight, self-hosted comment service for blogs and static sites.

[![CI](https://github.com/LVMBDV/sic/actions/workflows/ci.yml/badge.svg)](https://github.com/LVMBDV/sic/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
[![Node](https://img.shields.io/badge/node-%3E%3D24-43853d.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![Code style: Biome](https://img.shields.io/badge/code_style-biome-60a5fa.svg)](https://biomejs.dev)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://www.conventionalcommits.org)

`sic` is a small, opinionated comment service you can drop onto any blog with
a single `<script>` tag. It runs as a single Node process backed by SQLite,
ships as a Docker image, and stays out of your way.

---

## Features

- **One-line embed** — `<script src="…/embed.js" async></script>` and you're done.
- **Iframe-isolated widget** — host CSS and JS can't break (or read) the widget.
- **OAuth login** — GitHub and Google, with PKCE for Google. No passwords to store.
- **Up-vote reactions** — built in, one row per user per comment.
- **Heuristic spam protection** — honeypot field, link flood detection, caps
  ratio, length cap. No third-party API required.
- **Modern web security** — HttpOnly + `SameSite=Lax` session cookies, signed
  JWT, per-origin CSP `frame-ancestors` allowlist, HSTS, strict CORS.
- **Tiny footprint** — `node:sqlite` (no native build), Fastify, vanilla TS.
  No Redis, no Postgres, no message bus.
- **Self-hostable in one command** — `docker compose up -d`.

---

## Quick start

### Embed

```html
<div id="sic-comments" data-thread="my-post-slug"></div>
<script src="https://comments.example.com/embed.js" async></script>
```

The `data-thread` attribute identifies the thread. If you omit it, the
canonical URL or `location.pathname` is used as a fallback.

### Run with Docker

```bash
cp .env.example .env   # fill in SIC_SESSION_SECRET, OAuth creds, allowed origins
docker compose up -d
```

The service listens on `:6767`. Put it behind your reverse proxy of choice
(Caddy, nginx, Cloudflare Tunnel, …) and terminate TLS there.

### Run from source

Requires **Node 24+** (for stable `node:sqlite`).

```bash
cp .env.example .env
npm install
npm run dev            # backend :6767 + Vite :5173 (proxied)
```

Vite serves the widget at `http://localhost:5173/` and proxies `/api` + `/auth`
to the backend.

---

## Configuration

All configuration is via environment variables. See [.env.example](.env.example).

| Variable                  | Required | Default            | Description                                                                                                                       |
| ------------------------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `SIC_PUBLIC_URL`          | ✅       |                    | The public origin where `sic` is reachable, e.g. `https://comments.example.com`. Used for OAuth redirect URLs and cookie `Secure`. |
| `SIC_SESSION_SECRET`      | ✅       |                    | At least 32 chars of high-entropy random data. `openssl rand -base64 32` is fine.                                                  |
| `SIC_ALLOWED_ORIGINS`     | ✅\*     |                    | Comma-separated origins permitted to iframe the widget. Used for CSP `frame-ancestors` and CORS. Empty falls back to `'self'`.     |
| `SIC_BIND`                |          | `127.0.0.1:6767`   | Address to bind to. Use `0.0.0.0:6767` in Docker.                                                                                  |
| `DATABASE_URL`            |          | `sic.db`           | Path to the SQLite file. In Docker this defaults to `/data/sic.db`.                                                                |
| `SIC_GITHUB_CLIENT_ID`    |          |                    | GitHub OAuth app client ID. Omit to disable GitHub login.                                                                          |
| `SIC_GITHUB_CLIENT_SECRET`|          |                    | GitHub OAuth app client secret.                                                                                                    |
| `SIC_GOOGLE_CLIENT_ID`    |          |                    | Google OAuth client ID. Omit to disable Google login.                                                                              |
| `SIC_GOOGLE_CLIENT_SECRET`|          |                    | Google OAuth client secret.                                                                                                        |
| `LOG_LEVEL`               |          | `info`             | `trace`, `debug`, `info`, `warn`, `error`.                                                                                          |

\* Required in practice — without it, no third-party site can iframe the widget.

### OAuth setup

Register an OAuth app with each provider and set the callback URL to:

- GitHub: `${SIC_PUBLIC_URL}/auth/github/callback`
- Google: `${SIC_PUBLIC_URL}/auth/google/callback`

---

## Architecture

```
host page ──<script>── embed.js ──injects──▶ <iframe src="…/embed?thread=…">
                                                      │
                                                      ▼
                                              sic backend (:6767)
                                              ├── /embed              (widget HTML)
                                              ├── /embed.js           (loader)
                                              ├── /api/me
                                              ├── /api/threads/:slug/comments
                                              ├── /api/comments/:id/reactions/:kind
                                              └── /auth/{github,google}/{login,callback}
                                                      │
                                                      ▼
                                                SQLite (WAL)
```

- The widget is served from the comment-service origin, so authentication
  cookies are first-party to `sic`. Host sites never see them.
- The widget posts `sic:resize` messages to the parent so the iframe height
  matches its content.
- Sessions are signed JWTs (`jose`) in `HttpOnly`, `SameSite=Lax`, `Secure`
  (over HTTPS) cookies. There is no server-side session store; revocation
  happens by rotating `SIC_SESSION_SECRET`.

See [CLAUDE.md](CLAUDE.md) for a deeper walkthrough and the gotchas.

---

## Repository layout

```
sic/
├── backend/        Fastify + node:sqlite (Node 24)
├── frontend/       Vite + vanilla TS (embed loader + widget)
├── biome.json      Single source of truth for lint/format
├── Dockerfile      Multi-stage build → distroless-style runtime
├── docker-compose.yml
└── .github/        CI, issue/PR templates, Dependabot config
```

This is an npm workspaces monorepo. Run scripts from the root:

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Backend + frontend dev servers in parallel    |
| `npm run build`    | Build frontend, then backend                  |
| `npm start`        | Run the built backend                         |
| `npm test`         | Run workspace tests                           |
| `npm run typecheck`| Typecheck all workspaces                      |
| `npm run lint`     | Biome check (lint + format)                   |
| `npm run fix`      | Biome auto-fix                                |

---

## Roadmap

`sic` is in early development. Near-term work is comment-UX parity — **threaded
replies**, **Markdown rendering**, an **edit window**, **down-votes & sorting**,
and **dark mode** — followed by moderation/admin tooling and email reply
notifications.

See **[ROADMAP.md](ROADMAP.md)** for the full phased plan and what's explicitly
out of scope.

Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Contributing

Pull requests, bug reports, and ideas are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) and follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

This project follows [Conventional Commits](https://www.conventionalcommits.org)
and uses [Biome](https://biomejs.dev) for linting and formatting.

## Security

Found a security issue? Please report it privately — see
[SECURITY.md](SECURITY.md). Do **not** open a public issue.

## License

[MIT](LICENSE.md) © 2026 Ata Kuyumcu
