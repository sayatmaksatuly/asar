# ASAR 1.0 deployment

## Environments

Use independent local, staging and production Supabase projects and independent Cloudflare/email secrets. Never point preview/staging builds at production service-role credentials.

## Staging release

1. Create/update staging secrets from `.env.example`.
2. `pnpm install --frozen-lockfile` on Linux/CI.
3. `pnpm typecheck && pnpm lint && pnpm test:unit`.
4. `supabase link --project-ref <STAGING_REF>`.
5. `supabase db push --dry-run`, review every migration, then push to staging.
6. Run RLS security suite against staging test accounts.
7. Run `pnpm build` and Playwright E2E.
8. Exercise upload/email/cron endpoints and verify no PII in logs/analytics.
9. Run mobile/accessibility smoke tests at 320/375/390/430 px, tablet and desktop.

## Production release

1. Confirm staging is green and migrations match repository history.
2. Confirm legal review/operator contact, Privacy/Terms versions and age policy.
3. Confirm admins have TOTP and DB shows AAL2 is required.
4. Configure production Supabase custom SMTP/Auth URL/redirects/Turnstile and backup policy.
5. Configure Cloudflare domain/DNS/TLS, WAF, rate limiting, observability and cron schedules.
6. Configure email provider sender/domain and `RESEND_API_KEY`/`EMAIL_FROM`.
7. Configure `CRON_SECRET` and invoke:
   - email outbox frequently (for example every 5 minutes);
   - trust refresh daily;
   - retention daily.
8. Run production migration `--dry-run`, take/verify backup, then push migration.
9. Deploy the application.
10. Verify `/api/health`, auth, request catalog and one controlled end-to-end transaction.
11. Watch 5xx, auth failures, latency and database errors closely during launch.

## Rollback

Do not blindly reverse a data migration. Stop traffic to affected writes, identify the last safe migration/data restore point, restore/roll forward using `docs/backup-and-recovery.md`, then redeploy a compatible application build.
