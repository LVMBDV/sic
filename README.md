# sic

A lightweight, self-hosted comment service for blogs and static sites.

- **Backend:** Node.js 24 + Fastify + `node:sqlite`
- **Frontend:** TypeScript (vanilla + Vite), embedded as an `<iframe>`
- **Auth:** OAuth 2.0 (GitHub, Google) with PKCE, sessions as signed JWT cookies
- **Distribution:** Docker image
- **Repo:** npm workspaces monorepo (`backend/`, `frontend/`)

## Embedding

```html
<div id="sic-comments" data-thread="my-post-slug"></div>
<script src="https://comments.example.com/embed.js" async></script>
```

## Development

Requires **Node 24+** (for stable `node:sqlite`).

```bash
cp .env.example .env   # fill in SIC_SESSION_SECRET and OAuth creds
npm install
npm run dev            # runs backend (:6767) + frontend (:5173) concurrently
```

Vite proxies `/api` and `/auth` to the backend, so visit
`http://localhost:5173`.

## Production build

```bash
npm run build          # builds frontend, then backend
npm start              # serves the built widget from the backend
```

Or, run via Docker:

```bash
docker compose up --build
```

## Scripts (root)

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Backend + frontend dev servers in parallel    |
| `npm run build`  | Build frontend, then backend                  |
| `npm start`      | Run the built backend                         |
| `npm test`       | Run workspace tests                           |
| `npm run typecheck` | Typecheck all workspaces                   |
| `npm run lint`   | Biome check (lint + format)                   |
| `npm run fix`    | Biome auto-fix                                |

## Configuration

See [.env.example](.env.example).

## License

MIT
