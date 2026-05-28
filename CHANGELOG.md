# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial scaffold of the comment service.
- Node.js 24 + Fastify backend using `node:sqlite`.
- Vite + vanilla TypeScript widget served inside an `<iframe>`.
- OAuth 2.0 login via GitHub and Google (PKCE for Google).
- JWT session cookies (`HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS).
- Comment threads, soft-deletes, and up-vote reactions.
- Heuristic spam protection: honeypot field, link flood, excessive caps,
  length cap.
- Per-thread CSP `frame-ancestors` allowlist driven by `SIC_ALLOWED_ORIGINS`.
- `embed.js` loader with `postMessage`-based iframe height auto-resize.
- npm workspaces monorepo with shared Biome configuration.
- Docker image (multi-stage build) and `docker-compose.yml`.
- GitHub Actions CI: Biome `ci`, typecheck, tests, and build.

[Unreleased]: https://github.com/LVMBDV/sic/compare/HEAD...HEAD
