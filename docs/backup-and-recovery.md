# Backup and recovery

## Current Supabase behavior (reviewed 2026-08-08)

Supabase documents automatic daily database backups for Pro/Team/Enterprise projects, with retention depending on plan; PITR is available for finer-grained recovery. Supabase also states that database backups do **not** contain Storage objects, only their database metadata. When physical backup/PITR is used, downloadable logical backup files are not generated; use `supabase db dump`/`pg_dump` for an off-site logical export when required.

Official references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/troubleshooting/download-logical-backups
- https://supabase.com/docs/guides/deployment/going-into-prod

## ASAR policy before launch

1. Production must use a Supabase plan with supported backups; enable PITR if the team's RPO/RTO requires it.
2. At least monthly and before high-risk migrations, create an independent logical database export and store it encrypted outside the production project.
3. Storage objects require a separate recovery/export strategy because DB restore does not restore deleted files.
4. Do not keep service-role/access tokens inside backup archives.
5. Test restore in a non-production project at least quarterly and before major launch campaigns.

## Restore drill

1. Freeze writes/announce maintenance if needed.
2. Record incident timestamp and last known-good point.
3. Prefer restoring/cloning into a separate project for validation where possible.
4. Validate auth users, schema/migration history, counts and critical RLS/RPC behavior.
5. Reconfigure items not carried by a DB-only restore: Storage objects/settings, Auth settings/API keys, external email/Cloudflare settings and other environment secrets.
6. Run typecheck/unit/RLS/E2E against the restored environment.
7. Switch traffic only after validation and document the incident.

## Migration recovery

Prefer a forward-fix migration for schema defects. Use point-in-time restore only when data integrity or broad destructive changes make roll-forward unsafe. Never test a restore for the first time during a production incident.
