# Roadmap

Where `sic` is headed. This is a direction, not a contract — order and scope shift
as things get used. Features are weighed against the project's north star, not bolted
on because [Remark42](https://github.com/umputun/remark42) has them.

## North star

`sic` is a **lightweight, self-hosted, embed-in-one-script comment service**. Every
addition is judged against that:

- **Small surface.** One Docker image, `node:sqlite`, no native builds, no extra
  daemons. If a feature needs Redis/Postgres/a queue, it had better earn it.
- **First-party sessions.** The host page never shares auth; the iframe owns the cookie.
- **Boring tech.** Fastify, vanilla TS widget, Biome. No framework creep.

Remark42 is the reference for *what a mature comment engine does*, not a spec to clone.
Some of its features are explicitly **non-goals** for `sic` (see below).

## Status

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🟡 | Partial — scaffolding exists, not wired up |
| ⬜ | Planned |
| 🚫 | Out of scope (for now) |

## Done today ✅

- Threads auto-created by slug
- Post / list / soft-delete comments (10k cap)
- Threaded replies (nesting capped at 3 levels, `[deleted]` tombstones)
- Markdown rendering (server-side, sanitized subset; no raw HTML/images)
- Up/down votes with net score (mutually exclusive)
- Comment count API (`GET /api/threads/:slug/count`)
- OAuth login (GitHub, Google) with JWT cookie sessions
- Honeypot + heuristic spam check (links, caps, length)
- HTML-escaped rendering, iframe auto-resize, CSP `frame-ancestors` allowlist

---

## Phase 1 — Comment UX parity

The table-stakes features a reader expects from a comment widget. Highest value;
mostly self-contained.

- ✅ **Threaded replies.** `parent_id` on `comments`; the widget builds the tree and
  renders nesting with visual indentation capped at 3 levels (deeper replies keep
  their true parent, flattened). Deleted parents with surviving replies render as a
  `[deleted]` tombstone; deleted leaves are pruned.
- ✅ **Markdown rendering.** Server-side render (markdown-it) + hard sanitize
  (sanitize-html) into a strict allowlist. A comment subset — emphasis, inline/fenced
  code, links, blockquotes, lists; no headings, no images, no raw HTML. Links forced
  to `rel="nofollow ugc noopener noreferrer" target="_blank"`. The DTO carries
  `body_html`; the raw body is kept for a future edit feature.
- ⬜ **Edit window.** Allow editing for N minutes after posting (`updated_at` already
  exists; needs a `PATCH` route + an "edited" marker in the UI).
- ✅ **Downvotes & score.** `KINDS` widened to `up`/`down`, mutually exclusive
  (casting one clears the other). The DTO exposes a net score + the caller's vote;
  the widget shows ▲/▼ around the score.
- ⬜ **Sorting.** newest / oldest / best (by score). Currently fixed `created_at ASC`.
- ⬜ **Pagination / lazy load.** "Show more" for long threads — one query returns
  everything right now.
- ✅ **Comment count API.** `GET /api/threads/:slug/count` returns the visible
  comment count (replies included, deleted/hidden excluded) without loading the
  widget or auto-creating threads. Single-slug for now; batch deferred.
- 🟡 **Dark mode / theming.** Auto dark mode ships — the widget honors
  `prefers-color-scheme` via CSS variables. An explicit theme param from the embed
  loader (force light/dark) is deferred.

## Phase 2 — Moderation & admin

Anything self-hosted needs a way to deal with abuse. The schema half-anticipates this
(`hidden`, `deleted`) but nothing drives it.

- 🟡 **Hide/remove comments as admin.** `hidden` column exists; needs an admin-only
  route + role check (no concept of admin yet — likely a `SIC_ADMIN_IDS` allowlist or
  an `is_admin` flag on `users`).
- ⬜ **Block / ban users.** Stop a user from posting; optionally hide their history.
- ⬜ **Report / flag.** Let readers flag a comment for admin review.
- ⬜ **Pin comments.** Pin to top of a thread.
- ⬜ **Read-only threads.** Freeze a thread (manually, or auto after N days).
- ⬜ **Verified / author badge.** Mark the blog owner's own comments.
- ⬜ **Admin view.** Minimal moderation UI (or just authenticated JSON endpoints to
  start — keep it small).
- ⬜ **Profanity / blocklist filter.** Configurable word list, complements `spam.ts`.

## Phase 3 — Notifications & engagement

Brings people back. Each of these adds an outbound dependency, so weigh carefully
against the "no extra daemons" rule — email via SMTP is probably the only one that
clears the bar early.

- ⬜ **Reply notifications (email).** Subscribe to replies; SMTP only, no queue.
- ⬜ **Email magic-link auth.** A no-OAuth login path (Remark42 has this). Lowers the
  barrier for blogs that don't want to register OAuth apps.
- ⬜ **RSS feed.** Per-thread and site-wide comment feeds.
- ⬜ **Recent comments.** Site-wide "latest comments" endpoint.
- 🚫 **Telegram / push / Slack notifications.** Out of scope unless requested — extra
  integrations work against the small surface.

## Phase 4 — Operations & scale

For people running `sic` for real.

- ⬜ **Export / import.** JSON backup + restore of threads/comments/users.
- ⬜ **`oauth_state` GC.** Periodic cleanup of expired rows (noted as a known gap in
  CLAUDE.md — TTL is enforced but rows aren't collected).
- ⬜ **Anonymous commenting.** Optional, name-only posting with stricter spam gating.
- ⬜ **Rate limiting.** Per-user / per-IP post throttling.
- 🚫 **Multi-site (one instance, many `siteID`s).** Remark42 does this; `sic` favors
  one-instance-per-site simplicity. Revisit only if there's real demand.
- 🚫 **Pluggable Postgres/Redis backends.** `node:sqlite` is the bet. Don't add unless
  a concrete scale problem forces it.

---

## Explicit non-goals

Carried over from the project's philosophy and CLAUDE.md:

- **SEA / single executable.** Considered and rejected (~110MB, doesn't bundle
  `node_modules`). Docker image only.
- **ESLint / Prettier.** Biome only.
- **Heavy frontend framework.** The widget stays vanilla TS.
- **macOS-specific tooling.** Linux-only.

## Remark42 feature map

Quick reference for where `sic` stands against the reference implementation.

| Remark42 feature | `sic` |
|---|---|
| Nested comments | ⬜ Phase 1 |
| Markdown + preview | ⬜ Phase 1 |
| Edit window | ⬜ Phase 1 |
| Up/down voting + score | 🟡 up only → Phase 1 |
| Sorting (best/new/old) | ⬜ Phase 1 |
| Dark mode | ⬜ Phase 1 |
| Admin moderation | 🟡 schema only → Phase 2 |
| Block/ban users | ⬜ Phase 2 |
| Pin / read-only | ⬜ Phase 2 |
| Email reply notifications | ⬜ Phase 3 |
| Email / anonymous auth | ⬜ Phase 3 / 4 |
| RSS | ⬜ Phase 3 |
| Export / import | ⬜ Phase 4 |
| OAuth (GitHub, Google) | ✅ |
| Spam protection | ✅ heuristic |
| Multi-site (siteID) | 🚫 non-goal |
| Telegram/push notifications | 🚫 non-goal |
| Postgres/Redis backends | 🚫 non-goal |
