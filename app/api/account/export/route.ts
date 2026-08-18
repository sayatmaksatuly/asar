import { NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/api";
export async function GET() {
  const context=await getAuthContext(); if(!context.supabase) return jsonError(context.error,503); if(!context.user) return jsonError("unauthorized",401);
  const {data,error}=await context.supabase.rpc("get_my_data_export"); if(error||!data) return jsonError(error?.message);
  return new NextResponse(JSON.stringify(data,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":"attachment; filename=asar-data-export.json","Cache-Control":"no-store"}});
}
