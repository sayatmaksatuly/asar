# ASAR 1.0 database

## Source of truth

Supabase PostgreSQL is authoritative for identity-linked application data, workflow state, privacy, counters, reputation, disputes, moderation, consent and analytics events.

## Main entities

- `profiles`, `volunteer_profiles`
- `help_requests`, `request_private_details`
- `responses`, `assignments`, `reviews`
- `reports`, `disputes`, `moderation_actions`
- `notifications`, `email_outbox`
- `verification_requests`, `user_consents`, `account_deletion_requests`
- `reputation_ledger`, achievements/progress
- `product_events`, `abuse_rate_events`
- `regions`, `cities`, `districts`

## State machines

Requests: `draft/open/volunteer_selected/in_progress/awaiting_confirmation/completed/cancelled/disputed`.
Responses: `pending/accepted/rejected/withdrawn`.
Assignments: `volunteer_selected/in_progress/awaiting_confirmation/completed/cancelled/disputed`.

Only trusted functions perform critical transitions.

## Counters

Completion/review triggers update successful-help and positive-review counters. Reputation ledger writes are idempotent per assignment/reason. Trust score cannot be user-edited and is refreshed by protected scheduled maintenance.

## Privacy / retention

Exact private details are stored separately from public request data. `purge_expired_sensitive_data()` is service-role only and:

- redacts exact request address/contact/instructions 90 days after completed/cancelled requests;
- deletes notifications after 180 days;
- deletes product events after 13 months;
- deletes abuse-rate events after 7 days;
- deletes sent/failed email-outbox records after 30 days.

Moderation/audit records are not automatically purged by this function; retention must be decided with Kazakhstan counsel before launch.

## Migration discipline

- Never modify already-applied production migrations unless recovery demands it.
- Add a timestamped migration.
- Backfill before applying mandatory constraints.
- Test with `supabase db reset` and RLS/E2E locally.
- Run `supabase db push --dry-run` against staging before push.
- Promote the exact migration history to production only after staging passes.
