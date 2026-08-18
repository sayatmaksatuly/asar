<div align="center">

<img src="public/brand/logo-horizontal.svg" alt="ASAR" height="72" />

# ASAR

### A bilingual mutual-aid platform for Kazakhstan

**People helping people — safely, locally and transparently.**

[Русский](README_RU.md) · [Қазақша](README_KZ.md)

</div>

![ASAR social preview](public/og-asar-community.png)

## Overview

**ASAR** is a full-stack social platform designed to connect people who need non-emergency
help with people nearby who are ready to volunteer.

A requester publishes a help request, volunteers respond, the requester selects a participant,
and sensitive contact/location information becomes available only to the active parties.
After the task is completed and confirmed, the platform records a review and reputation signal.

The product is designed for a Kazakhstan-wide audience and includes **Russian and Kazakh**
localisation, trust and moderation tooling, privacy-oriented data access, responsive web UI,
and a production-oriented Supabase/PostgreSQL backend.

> ASAR is **not an emergency service**. Emergency situations must be handled through the
> appropriate official emergency services.

## Product flow

```text
Create request
     ↓
Volunteer responds
     ↓
Requester selects volunteer
     ↓
Private participant context is unlocked
     ↓
Assignment starts
     ↓
Help is completed and confirmed
     ↓
Review + reputation update
```

## Key features

- **Mutual-aid marketplace** — publish, discover and respond to help requests
- **Private assignments** — exact contact/location data is separated from public request data
- **Trust & reputation** — reviews, achievements, counters, streaks and trust signals
- **Safety & moderation** — reports, disputes, content checks and admin audit actions
- **User capabilities** — one account can request help and also volunteer
- **Notifications** — in-app notification flows and transactional email outbox
- **Admin console** — users, reports, disputes, verification, analytics and audit history
- **Account privacy** — export, deletion/anonymisation, consent and retention workflows
- **Bilingual UX** — Russian and Kazakh dictionaries with structural parity tests
- **Responsive web app** — mobile-first interface and web-app/PWA foundations
- **Operational readiness** — health endpoint, cron jobs, CI gates and deployment documentation

## Architecture

```text
┌─────────────────────────────────────────────┐
│              Next.js / React UI             │
│        RU / KK · responsive · PWA           │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│          App Router + Server APIs           │
│ validation · moderation · safe errors       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│            Supabase / PostgreSQL            │
│ Auth · RLS · RPC · Storage · migrations     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│     Trust · privacy · workflow · admin      │
│         enforced at the DB boundary         │
└─────────────────────────────────────────────┘
```

The database is the authoritative boundary for critical workflow transitions, privacy rules,
reputation state and admin authorization. Direct client writes to sensitive workflow fields are
restricted through Row Level Security and trusted database functions/RPCs.

More detail: [`docs/architecture.md`](docs/architecture.md) · [`docs/security.md`](docs/security.md)

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, custom design tokens |
| Backend | Next.js server routes, Supabase |
| Database | PostgreSQL, Drizzle ORM, SQL migrations |
| Authentication | Supabase Auth / SSR |
| Security | Row Level Security, DB RPCs, MFA-gated admin operations |
| Storage | Supabase Storage |
| Localisation | RU / KK message dictionaries |
| Deployment path | Vinext, Vite, Cloudflare-compatible runtime |
| Testing | Node test runner, Playwright E2E, RLS security tests |
| CI | GitHub Actions |

## Repository snapshot

This release contains:

- **29** application pages
- **30** API route handlers
- **42** React components
- **8** database migrations
- dedicated unit/contract, RLS and E2E test suites
- Russian and Kazakh localisation dictionaries
- deployment, security, database, testing and recovery documentation

These numbers describe the repository snapshot and are not marketing usage statistics.

## Security & privacy design

ASAR handles potentially sensitive location/contact information, so privacy is part of the
architecture rather than only a UI concern.

- service-role credentials remain server-only
- public request data is separated from private assignment context
- user identity is derived from authenticated sessions, not trusted request payload IDs
- state transitions are guarded by database functions and current-state validation
- admin-sensitive operations require the appropriate authorization level
- upload flows include authentication and validation controls
- application errors avoid exposing raw database details
- security headers are configured for production deployment

See [`docs/security.md`](docs/security.md).

## Local development

### Requirements

- Node.js **22.13+**
- pnpm **11.9.0**
- Supabase CLI
- Docker-compatible runtime for local Supabase

### Setup

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
cp .env.example .env.local
pnpm install --frozen-lockfile
supabase start
supabase db reset
pnpm dev
```

Then configure the values described in `.env.example`.

**Never commit `.env.local`, service-role keys, API secrets, build output or `node_modules`.**

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:rls
pnpm build
pnpm test:e2e
```

During this GitHub preparation pass, the repository's static/contract tests completed with
**7/7 passing**. Runtime RLS/E2E and deployment checks still require a configured local/staging
Supabase environment. See [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md).

## Project status

**ASAR 1.0 is currently presented as a release candidate / active pre-production project.**

The main web product and core architecture are implemented. Final production release depends on
runtime security tests, staging migrations, infrastructure configuration, legal review and final
browser/device QA.

This wording is intentional: the repository demonstrates a substantial full-stack product without
claiming infrastructure checks that have not yet been completed.

## Project scope demonstrated

ASAR showcases experience with:

- full-stack product architecture
- authentication and authorization
- relational database modelling
- privacy-sensitive workflows
- Row Level Security
- admin/moderation systems
- bilingual product development
- notifications and scheduled jobs
- analytics and auditability
- automated tests and CI
- responsive social-product UX

## Documentation

- [`Architecture`](docs/architecture.md)
- [`Security`](docs/security.md)
- [`Database`](docs/database.md)
- [`Testing`](docs/testing.md)
- [`Deployment`](docs/deployment.md)
- [`Backup & recovery`](docs/backup-and-recovery.md)
- [`Trust score`](docs/trust-score.md)
- [`Brand guidelines`](docs/brand-guidelines.md)
- [`Release status`](PRODUCTION_READINESS.md)

## License / usage

No open-source license is granted by default. The repository is published as a project/portfolio
snapshot unless the project owner explicitly adds a license.
