# ASAR — Release Status

**Current status:** Release Candidate / active pre-production hardening

The core product, database model, privacy boundaries, moderation/admin surfaces,
Russian/Kazakh localisation and automated contract tests are implemented.

The repository intentionally does **not** claim a production launch until the
remaining runtime and infrastructure gates are completed against clean staging
and production environments.

## Implemented

- Mutual-aid request → response → selection → assignment → completion → review flow
- Supabase Auth + PostgreSQL + Row Level Security
- Private participant-only contact/location context
- Request cancellation, response withdrawal and reassignment
- Reports and disputes
- Admin moderation, audit trail, analytics and MFA-gated operations
- Notifications and transactional email outbox
- Reputation / trust / achievements model
- Account export, deletion/anonymisation and consent surfaces
- RU / KK localisation
- Responsive web UI and PWA/web-app foundations
- CI quality gates, security contracts and E2E scenarios

## Verified in this repository review

- Secret scan: no committed production API keys, service-role values or private keys found
- Static/contract test suite: **7/7 PASS**
- RU/KK dictionary structural parity is covered by tests

## Required before a public production launch

- Clean dependency install and production build in Linux CI
- Runtime RLS suite against local/staging Supabase
- Playwright E2E against the full app stack
- Staging migration dry-run and deployment verification
- Production email, DNS/TLS, monitoring, WAF/rate limits and backup settings
- Final legal review of Privacy / Terms / Community Rules for Kazakhstan
- Final mobile/accessibility browser QA

See [`docs/deployment.md`](docs/deployment.md), [`docs/security.md`](docs/security.md),
[`docs/testing.md`](docs/testing.md) and [`docs/backup-and-recovery.md`](docs/backup-and-recovery.md).
