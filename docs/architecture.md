# ASAR 1.0 architecture

## Goal

ASAR connects a requester and volunteer for safe, non-emergency mutual aid in Kazakhstan. The architecture deliberately keeps the system simple: one Next.js application and one Supabase/PostgreSQL system of record.

## Request flow

`open -> volunteer_selected -> in_progress -> awaiting_confirmation -> completed`

Failure states: `cancelled`, `disputed`. A cancelled volunteer assignment can reopen the request and a new volunteer can be selected. State changes are database RPC operations, not arbitrary client updates.

## Trust boundaries

1. Browser: untrusted. Performs UX validation only.
2. Next API routes: authentication, input normalization, upload/email provider integration and safe error mapping.
3. PostgreSQL/RLS/RPC: authoritative authorization and business rules.
4. Service role: server/cron/controlled maintenance only; never browser-accessible.
5. External infrastructure: Supabase, Cloudflare and email provider configured through production secrets/dashboard settings.

## Data surfaces

- Public: sanitized `public_help_requests`, `public_profiles`, `public_community_events`, public review RPC.
- Participant: participant profile RPC and `get_assignment_context`.
- Private: `request_private_details`, reports, disputes, notifications, consent and moderation records.
- Admin: MFA (`aal2`) gated policies/RPCs.

## Capability model

The legacy `role` remains for backwards compatibility, while `profiles.can_request` and `profiles.can_volunteer` determine ordinary capabilities. A person may both request and volunteer.

## Notifications

In-app notifications are authoritative database records. Selected high-value events enqueue transactional email; community/marketing consent is separate.

## Analytics

`product_events` captures a minimal event allow-list. Core workflow events are written database-side so a client cannot silently omit them. Metadata is shallow/scalar and allow-listed.

## Locations

`regions -> cities -> districts` provides canonical Kazakhstan location IDs. Exact addresses remain separate private data. No fake distance is shown because ASAR 1.0 does not rely on stable public coordinates.
