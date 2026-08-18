import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("../",import.meta.url);
const read=(p)=>readFile(new URL(p,root),"utf8");

test("production migration protects system fields and critical writes", async()=>{
  const sql=await read("supabase/migrations/202608080001_production_security_core.sql");
  for(const token of ["protect_profile_system_fields","protect_volunteer_system_fields","revoke insert, update, delete on table public.request_drafts","revoke insert, update, delete on table public.responses","revoke insert, update, delete on table public.assignments","create or replace function public.withdraw_response","create or replace function public.cancel_assignment","create or replace function public.reopen_request","create or replace function public.open_dispute","create or replace function public.admin_resolve_dispute","create or replace function public.request_account_deletion","create or replace function public.get_assignment_context","create or replace function public.admin_remove_request_image","contact_required","notifications.reassigned","notifications.rewardEarned","notifications.completionRejected","private.sync_verification_status","set_onboarding_progress","normalize_profile_location"]){assert.match(sql,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),token)}
  assert.match(sql,/jwt[^\n]+aal[^\n]+aal2/is);
  assert.match(sql,/request_private_details[\s\S]+contact_value/i);
  assert.match(sql,/public_help_requests[\s\S]+status='open'/i);
  assert.match(sql,/revoke execute on function public\.track_product_event[\s\S]+from public,anon,authenticated/i);
  assert.match(sql,/track_public_product_event[\s\S]+landing_visit[\s\S]+request_viewed/i);
  assert.doesNotMatch(sql,/grant\s+(?:insert|update|delete)[^;]*request_private_details[^;]*authenticated/i);
});

test("production app includes privacy, legal, monitoring and safe upload surfaces", async()=>{
  for(const p of ["app/[locale]/privacy/page.tsx","app/[locale]/terms/page.tsx","app/[locale]/community-rules/page.tsx","app/api/account/delete/route.ts","app/api/account/export/route.ts","app/api/health/route.ts","app/api/uploads/route.ts","app/api/cron/email-notifications/route.ts","app/api/cron/trust-refresh/route.ts","app/[locale]/admin/audit/page.tsx","app/[locale]/admin/disputes/page.tsx","app/[locale]/admin/users/page.tsx","app/[locale]/admin/analytics/page.tsx"]) assert.ok((await read(p)).length>50,p);
  const upload=await read("app/api/uploads/route.ts"); assert.match(upload,/5 \* 1024 \* 1024/); assert.match(upload,/image\/jpeg/); assert.match(upload,/consume_rate_limit/);
  const api=await read("lib/api.ts"); assert.doesNotMatch(api,/stack/i); assert.match(api,/logServerFailure/);
});
