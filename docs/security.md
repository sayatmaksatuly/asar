# ASAR 1.0 security model

## Database authorization

RLS is enabled and critical mutations are RPC-only. Frontend role checks are convenience, never the security boundary.

### Profiles

Authenticated users may edit safe presentation/privacy/preferences only. Role, status, verification flags, trust/reputation, counters and moderation/system timestamps are protected by column privileges and `protect_profile_system_fields`.

### Volunteer profiles

Users may edit bio/skills/availability. Verification status, balance/level legacy fields, reputation and authoritative counters are protected by privileges and `protect_volunteer_system_fields`.

### Workflow

Direct write access is revoked for help requests/private details/responses/assignments/reviews/reports/reputation/bonus and moderation-critical data where bypass would violate the state machine. RPC functions lock relevant rows and validate current actor/state.

## Private request data

Before selection, volunteers cannot read address/contact/instructions. After selection only requester + current selected volunteer can read them. If that assignment is cancelled/reassigned, the old volunteer loses access. Admin access requires the MFA-gated admin predicate.

## Admin MFA

`private.is_admin()` requires an active admin profile and JWT `aal=aal2`. This applies inside DB policies/RPCs, so bypassing the UI does not bypass MFA.

## Upload security

Uploads go through `/api/uploads`; direct authenticated Storage write policies are removed. The route validates authentication/status, DB rate limit, bucket, 5 MiB maximum, declared MIME and magic signature, generates an owner-scoped random path and uses service role only server-side. Replacement/account cleanup removes owned objects. Admin image moderation clears the DB reference and deletes the Storage object.

## Abuse controls

Database rate limits protect request creation, responses, reports, disputes, verification and upload calls. Cloudflare Turnstile can protect signup through Supabase Auth. Production must also configure Cloudflare WAF/rate-limit rules for signup/auth/public endpoints and admin login attempts.

## Content moderation

Deterministic RU/KK/EN checks block obvious emergency requests, illegal/prohibited trade, sensitive bank/OTP requests and high-link spam at API and database layers. ASAR directs emergencies to official emergency services; it does not claim emergency response capability.

## Errors and secrets

Client responses expose only allow-listed safe error codes. SQL, stack traces and secrets are not returned. Service-role/email/cron secrets are server-only.

## Security headers

CSP, `frame-ancestors`, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy and Permissions-Policy are configured. CSP currently permits inline scripts/styles needed by the existing Next/Vinext/Turnstile integration; tighten with request nonces when the runtime supports it without breaking hydration.

## Required pre-launch checks

- Run RLS suite against staging after all migrations.
- Verify no service-role key appears in client bundles.
- Enroll every admin in TOTP and confirm AAL2.
- Configure Turnstile, WAF/rate limiting, monitoring and secrets.
- Rotate any secret that ever existed in a shared archive or repository.
