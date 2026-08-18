import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { getDictionary, type Locale } from "@/lib/i18n";

export async function POST(request:Request) {
  const cronSecret=process.env.CRON_SECRET;
  if(!cronSecret||request.headers.get("authorization")!==`Bearer ${cronSecret}`) return NextResponse.json({error:"unauthorized"},{status:401});
  const resendKey=process.env.RESEND_API_KEY; const from=process.env.EMAIL_FROM;
  const admin=createSupabaseAdminClient(); if(!admin||!resendKey||!from) return NextResponse.json({error:"not_configured"},{status:503});
  const {data:items,error}=await admin.from("email_outbox").select("id,recipient_email,event_type,locale,payload,attempts").eq("status","pending").lte("available_at",new Date().toISOString()).order("created_at").limit(20);
  if(error) return NextResponse.json({error:"queue_read_failed"},{status:500});
  let sent=0,failed=0;
  for(const item of items??[]) {
    const claim=await admin.from("email_outbox").update({status:"processing",attempts:item.attempts+1,updated_at:new Date().toISOString()}).eq("id",item.id).eq("status","pending").select("id").maybeSingle();
    if(!claim.data) continue;
    const locale: Locale=item.locale==="kk"?"kk":"ru"; const dictionary=getDictionary(locale); const email=dictionary.emailNotifications; const subject=(email.subjects as Record<string,string>)[item.event_type]??email.genericSubject;
    const link=typeof item.payload==="object"&&item.payload&&"link" in item.payload?String(item.payload.link):"/dashboard";
    const base=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"")??"";
    const text=`${email.body} ${base}${link}`;
    try {
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[item.recipient_email],subject,text})});
      if(!response.ok) throw new Error(`provider_${response.status}`);
      await admin.from("email_outbox").update({status:"sent",sent_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",item.id); sent++;
    } catch(error) {
      const attempts=item.attempts+1; const terminal=attempts>=5;
      await admin.from("email_outbox").update({status:terminal?"failed":"pending",last_error:error instanceof Error?error.message.slice(0,200):"provider_error",available_at:new Date(Date.now()+Math.min(3600000,attempts*300000)).toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id); failed++;
    }
  }
  return NextResponse.json({processed:(items??[]).length,sent,failed});
}
