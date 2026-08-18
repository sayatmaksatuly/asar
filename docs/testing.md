# ASAR 1.0 testing

## Local quality

```bash
pnpm audit --audit-level=high --prod
pnpm typecheck
pnpm lint
pnpm compat:check
pnpm test:unit
```

Unit/contract tests check RU/KK parity, packaged assets, migration/RLS security contracts, critical RPC presence and production infrastructure surfaces.

## RLS security suite

Start/reset local Supabase and export its test keys:

```bash
supabase start
supabase db reset
eval "$(supabase status -o env)"
export SUPABASE_TEST_URL="$API_URL"
export SUPABASE_TEST_ANON_KEY="$ANON_KEY"
export SUPABASE_TEST_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
pnpm test:rls
```

The suite creates User A, User B, User C and Admin and attacks Supabase directly. It checks system-field protection, cross-user profile writes, volunteer counter/verification writes, anonymous/private address access, pre/post selection address access, forged completion, cancellation access revocation, blocked-user behavior and MFA-gated admin actions/audit.

## Playwright E2E

CI installs pinned `@playwright/test@1.62.0` after the frozen application dependency install, installs Chromium, starts the app against local Supabase and runs `tests/e2e/core-flow.spec.mjs`.

The 10 serial scenarios are:
1. signup -> onboarding -> create request;
2. volunteer catalog/detail -> respond;
3. requester selects volunteer;
4. selected volunteer sees private details -> start -> complete;
5. requester confirms -> review -> counters/reputation and duplicate protection;
6. withdraw response;
7. cancel assignment -> reassign -> old volunteer loses private details;
8. dispute;
9. privacy controls/public-vs-participant identity;
10. admin MFA gate -> dispute moderation -> audit.

## Build

`pnpm build` is an independent release gate. A green typecheck/lint is not a substitute for a successful Linux production build.

## CI

`.github/workflows/ci.yml` runs locked install, production dependency audit, typecheck, lint, Vinext compatibility check, unit/contract tests, local Supabase migrations, RLS tests, production build and Playwright E2E. Production deployment must depend on this job rather than bypass it.
