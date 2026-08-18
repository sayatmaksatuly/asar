import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
function authorized(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`)}
export async function POST(request:Request){if(!authorized(request))return NextResponse.json({error:"unauthorized"},{status:401});const admin=createSupabaseAdminClient();if(!admin)return NextResponse.json({error:"not_configured"},{status:503});const{data,error}=await admin.rpc("purge_expired_sensitive_data");if(error)return NextResponse.json({error:"operation_failed"},{status:500});return NextResponse.json({ok:true,result:data});}
