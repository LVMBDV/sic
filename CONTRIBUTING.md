# Contributing to sic

Thanks for wanting to contribute. This document covers everything you need to
get a change merged.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to abide by its terms.

## Quick start

```bash
git clone git@github.com:LVMBDV/sic.git
cd sic
cp .env.example .env       # fill in SIC_SESSION_SECRET and OAuth creds
npm install
npm run dev                # backend :6767 + Vite :5173
```

Visit `http://localhost:5173/` — Vite proxies `/api` and `/auth` to the
backend.

## Project layout

See [CLAUDE.md](CLAUDE.md) for an architectural overview and the list of
"things that are easy to get wrong."

## Before you open a PR

Run these locally — CI will run them again, but failing fast is nicer:

```bash
npm run lint        # Biome lint + format check
npm run typecheck   # tsc --noEmit in both workspaces
npm test            # node:test in backend
npm run build       # full prod build
```

Auto-fix lint/format issues with:

```bash
npm run fix
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Examples:

```
feat(backend): add markdown rendering with sanitization
fix(widget): handle empty thread without 500
docs: document SIC_ALLOWED_ORIGINS behavior
chore(deps): bump fastify to 5.1
refactor(auth): extract provider config builder
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`,
`ci`, `perf`, `style`.

Keep the subject line under ~72 characters and in the imperative mood
("add x", not "added x"). Put context in the body, not the subject.

## Pull requests

- Open against `main`.
- Keep PRs focused — one logical change per PR. Refactors should be separate
  from behavior changes when reasonable.
- Update [CHANGELOG.md](CHANGELOG.md) under the `[Unreleased]` section if
  your change is user-visible.
- Update docs (`README.md`, `CLAUDE.md`, inline comments where genuinely
  needed) when changing behavior.
- Add tests for new logic. Tests live next to source as `*.test.ts` and run
  via `node --test`.

## Style

- **Lint/format:** Biome only. Don't add ESLint or Prettier.
- **TypeScript:** strict mode is on. `any` is allowed only as a last resort.
- **Comments:** explain *why*, not *what*. Default to no comment.
- **Backend:** Fastify handlers should validate input via JSON Schema when
  the route accepts a body. Use the typed `request.user` for auth.
- **Frontend:** vanilla TS, no framework. Render via template strings, escape
  user content via `escapeHtml`.

## Reporting bugs and requesting features

Use the [issue templates](.github/ISSUE_TEMPLATE). For security issues, see
[SECURITY.md](SECURITY.md) — do not open a public issue.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
