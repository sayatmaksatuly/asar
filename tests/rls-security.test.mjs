import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_TEST_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anon && service);
const password = "ASAR-Test-Password-42!";

function client(key = anon) { return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
async function signIn(email) { const c = client(); const { error } = await c.auth.signInWithPassword({ email, password }); assert.ifError(error); return c; }
function base32(secret) { const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits="",out=[]; for(const ch of secret.replace(/=+$/,"")){const v=alphabet.indexOf(ch.toUpperCase()); if(v<0)continue; bits+=v.toString(2).padStart(5,"0");} for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2)); return Buffer.from(out); }
function totp(secret) { const counter=Math.floor(Date.now()/30000); const b=Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter)); const h=createHmac("sha1",base32(secret)).update(b).digest(); const off=h[h.length-1]&15; const n=(h.readUInt32BE(off)&0x7fffffff)%1_000_000; return String(n).padStart(6,"0"); }

async function createUser(admin, suffix) {
  const email=`asar-${suffix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const { data, error }=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`ASAR ${suffix}`,preferred_language:"ru",accepted_terms_version:"2026-08-08",accepted_privacy_version:"2026-08-08",age_confirmed_18:true}});
  assert.ifError(error); return {id:data.user.id,email};
}

async function onboard(c, role) { const { error }=await c.rpc("complete_onboarding",{p_role:role}); assert.ifError(error); }

async function makeRequest(a) {
  const { data: cat, error: ce }=await a.from("categories").select("id").limit(1).single(); assert.ifError(ce);
  const { data: city, error: le }=await a.from("cities").select("id,name_ru").eq("is_active",true).limit(1).single(); assert.ifError(le);
  const payload={title:"Помощь с продуктами",description:"Нужна безопасная помощь с доставкой продуктов домой.",content_language:"ru",category_id:cat.id,city:city.name_ru,district:"Центр",city_id:city.id,district_id:null,address:"Тестовый адрес 10",location_notes:"У подъезда",desired_date:null,time_from:null,time_to:null,urgency:"normal",help_format:"delivery",image_url:null,special_conditions:null,preferred_contact_method:"phone",contact_value:"+77000000000",volunteer_instructions:"Позвонить после выбора",reward_type:"thanks",reward_note:"Спасибо",reward_points:null,draft_id:null,status:"open",safety_consent:true};
  const { data, error }=await a.rpc("create_help_request",{p_payload:payload}); assert.ifError(error); return data;
}

test("RLS: direct clients cannot bypass profile/private/workflow/admin boundaries", { skip: !enabled }, async () => {
  const admin=client(service); const users=[];
  try {
    const A=await createUser(admin,"a"), B=await createUser(admin,"b"), C=await createUser(admin,"c"), M=await createUser(admin,"admin"); users.push(A,B,C,M);
    await admin.from("profiles").update({role:"admin",can_request:true,can_volunteer:true,status:"active"}).eq("id",M.id);
    const a=await signIn(A.email), b=await signIn(B.email), c=await signIn(C.email), m=await signIn(M.email);
    await onboard(a,"requester"); await onboard(b,"volunteer"); await onboard(c,"volunteer");

    const ownSystem=await a.from("profiles").update({role:"admin",trust_score:100,reputation_points:999999}).eq("id",A.id); assert.ok(ownSystem.error,"user must not update profile system fields");
    const otherProfile=await a.from("profiles").update({full_name:"Hacked"}).eq("id",B.id); assert.ok(otherProfile.error || otherProfile.count===0,"user must not update another profile");
    const volSystem=await b.from("volunteer_profiles").update({verification_status:"verified",bonus_balance:99999,reputation_points:99999,successful_helps_count:99}).eq("user_id",B.id); assert.ok(volSystem.error,"volunteer system fields must be protected");

    const requestId=await makeRequest(a);
    const anonymous=client();
    const anonPrivate=await anonymous.from("request_private_details").select("address,preferred_contact_method").eq("request_id",requestId); assert.equal(anonPrivate.data?.length ?? 0,0);
    const bBefore=await b.from("request_private_details").select("address,contact_value").eq("request_id",requestId); assert.equal(bBefore.data?.length ?? 0,0);
    const cBefore=await c.from("request_private_details").select("address,contact_value").eq("request_id",requestId); assert.equal(cBefore.data?.length ?? 0,0);

    const { data: responseId, error: re }=await b.rpc("create_response",{p_request_id:requestId,p_message:"Готов помочь и доставить продукты в согласованное время."}); assert.ifError(re);
    const directStatus=await a.from("help_requests").update({status:"completed",selected_volunteer_id:A.id}).eq("id",requestId); assert.ok(directStatus.error,"request state machine must not be writable directly");
    const { data: assignmentId, error: se }=await a.rpc("select_volunteer",{p_request_id:requestId,p_response_id:responseId}); assert.ifError(se);
    const bAfter=await b.from("request_private_details").select("address,contact_value").eq("request_id",requestId).single(); assert.ifError(bAfter.error); assert.equal(bAfter.data.address,"Тестовый адрес 10");
    const cAfter=await c.from("request_private_details").select("address,contact_value").eq("request_id",requestId); assert.equal(cAfter.data?.length ?? 0,0);

    const fakeComplete=await a.from("assignments").update({status:"completed",help_minutes:1000}).eq("id",assignmentId); assert.ok(fakeComplete.error,"requester must not forge assignment completion");
    const { error: cancelError }=await b.rpc("cancel_assignment",{p_assignment_id:assignmentId,p_reason:"Изменились обстоятельства"}); assert.ifError(cancelError);
    const bRevoked=await b.from("request_private_details").select("address").eq("request_id",requestId); assert.equal(bRevoked.data?.length ?? 0,0,"cancelled volunteer loses private details");

    await admin.from("profiles").update({status:"blocked"}).eq("id",B.id);
    const blockedAction=await b.rpc("create_response",{p_request_id:requestId,p_message:"Попытка после блокировки"}); assert.ok(blockedAction.error,"blocked user cannot perform core actions");

    const noMfa=await m.rpc("admin_set_user_blocked",{p_user_id:C.id,p_blocked:true,p_reason:"Security test"}); assert.ok(noMfa.error,"admin RPC requires AAL2");
    const enrolled=await m.auth.mfa.enroll({factorType:"totp",friendlyName:"ASAR RLS test"}); assert.ifError(enrolled.error); const secret=enrolled.data.totp.secret;
    const verified=await m.auth.mfa.challengeAndVerify({factorId:enrolled.data.id,code:totp(secret)}); assert.ifError(verified.error);
    const adminAction=await m.rpc("admin_set_user_blocked",{p_user_id:C.id,p_blocked:true,p_reason:"Security test block"}); assert.ifError(adminAction.error);
    const { data: cProfile }=await admin.from("profiles").select("status").eq("id",C.id).single(); assert.equal(cProfile.status,"blocked");
    const { data: audit }=await admin.from("moderation_actions").select("action_type,reason").eq("target_user_id",C.id).order("created_at",{ascending:false}).limit(1).single(); assert.equal(audit.action_type,"block_user");
  } finally {
    for (const u of users) await admin.auth.admin.deleteUser(u.id).catch(()=>undefined);
  }
});
