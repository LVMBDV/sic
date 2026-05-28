# CLAUDE.md

Guidance for Claude when working in this repo.

## What this is

`sic` is a lightweight self-hosted comment service. Blogs embed it via a single `<script>` that injects an iframe pointing at `/embed`. Sessions are first-party to the comment service (cookies on the iframe origin), so embedding sites don't need to share auth.

## Stack

- **Monorepo:** npm workspaces. Two workspaces: `backend/`, `frontend/`. All scripts run from the repo root via workspace forwarding.
- **Backend:** Node.js **24+** (required for stable `node:sqlite`), Fastify 5, `node:sqlite` (sync driver, no native build).
- **Frontend:** TypeScript + Vite, vanilla (no framework). Two build outputs: a small `embed.js` loader and a hashed widget bundle served at `/embed`.
- **Auth:** OAuth 2.0 via [`arctic`](https://arcticjs.dev) (GitHub + Google, PKCE for Google). Sessions are signed JWTs (via `jose`) in HttpOnly + SameSite=Lax cookies. `oauth_state` table holds CSRF state + PKCE verifier between redirect and callback.
- **Lint/format:** **Biome only** at repo root. No ESLint, no Prettier — don't add them.
- **Tests:** [Vitest](https://vitest.dev) in both workspaces. Place tests next to source as `*.test.ts`; run with `npm test` (forwards to both). Keep unit tests pure — extract logic out of DOM/IO side effects (see `frontend/widget/format.ts`) rather than standing up a browser env.
- **Distribution:** Docker image only. SEA was considered and rejected (~110MB, doesn't bundle `node_modules`, brittle). Don't bring it back unless asked.

## Conventions

- **Conventional Commits required** for every commit. Format: `<type>(scope): <description>`. See [memory/feedback_conventional_commits.md](/Users/atak/.claude/projects/-Users-atak-Projects-sic/memory/feedback_conventional_commits.md).
- **Git workflow:** Branch per work item (`feat/…`, `fix/…`, `test/…`, `docs/…`) — don't commit straight to `main`. Commit as you go: small, logical commits as each piece lands, not one big commit at the end. **No PRs during early development** — merge the work-item branch back into `main` locally and move on.
- **Port:** backend runs on **6767** (the meme port). Don't change without asking.
- **Env file lives at repo root** (`.env`), not in `backend/`. Backend dev script loads via `--env-file=../.env`.
- **Linux-only:** dropped macOS-specific tooling. Don't add `darwin` branches.
- **No comments** unless explaining *why* something non-obvious is done. Identifiers should speak for themselves.

## Layout

```
sic/
├── package.json              # workspaces root, scripts forward to workspaces
├── biome.json                # single shared config
├── .env.example -> .env      # at root, loaded by backend dev
├── Dockerfile, docker-compose.yml
├── backend/
│   └── src/
│       ├── server.ts         # Fastify bootstrap, global hooks
│       ├── config.ts, db.ts, spam.ts, types.ts
│       ├── migrations/*.sql  # ran by tiny in-house migrator in db.ts
│       ├── auth/{oauth,session}.ts
│       └── routes/{comments,reactions,me,assets}.ts
└── frontend/
    ├── vite.config.ts        # root: widget/  (so `/` serves the widget in dev)
    ├── embed/embed.ts        # the script injected on host pages
    └── widget/               # the iframe app
```

## Running

```bash
npm install
npm run dev      # backend :6767 + Vite :5173 (proxies /api + /auth to :6767)
```

Vite dev root is `frontend/widget/`, so hitting `http://localhost:5173/` serves the widget. The embed loader (`/embed.js`) isn't served in dev — it's a build artifact for host pages in production.

## Things that are easy to get wrong

- **`frame-ancestors` CSP** for `/embed` comes from `SIC_ALLOWED_ORIGINS`. If a host site can't iframe the widget in prod, that env var is the first place to look.
- **`/embed` route deletes `X-Frame-Options: DENY`** (set globally in `server.ts`). Don't remove that explicit removal in `routes/assets.ts` — without it the iframe is blocked.
- **Cookies are SameSite=Lax**, so OAuth login completes by redirecting to a same-site URL (the iframe origin), not via cross-site POST. The widget reads `/api/me` after reload.
- **`oauth_state` rows have a 10-minute TTL** enforced in the callback handler. They aren't garbage-collected — long-term, add a periodic cleanup if it matters.
- **`node:sqlite` is synchronous.** All queries block the event loop. Fine at this scale; revisit if you ever need long-running queries.
