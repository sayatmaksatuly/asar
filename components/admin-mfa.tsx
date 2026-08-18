"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Alert, Input, buttonStyles } from "@/components/ui/primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Dictionary, Locale } from "@/lib/i18n";
export function AdminMfa({dictionary,locale}:{dictionary:Dictionary;locale:Locale}){
 const router=useRouter();const [factorId,setFactorId]=useState("");const [qr,setQr]=useState("");const [code,setCode]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [ready,setReady]=useState(false);
 useEffect(()=>{void (async()=>{const supabase=createSupabaseBrowserClient();if(!supabase){setError(true);setLoading(false);return}const level=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(level.data?.currentLevel==='aal2'){setReady(true);setLoading(false);return}const factors=await supabase.auth.mfa.listFactors();const verified=factors.data?.totp.find(item=>item.status==='verified');if(verified)setFactorId(verified.id);else{for(const item of factors.data?.totp??[])if(item.status!=='verified')await supabase.auth.mfa.unenroll({factorId:item.id});const enrolled=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'ASAR Admin'});if(enrolled.error||!enrolled.data){setError(true)}else{setFactorId(enrolled.data.id);setQr(enrolled.data.totp.qr_code)}}setLoading(false)})()},[]);
 async function verify(){const supabase=createSupabaseBrowserClient();if(!supabase||!factorId||code.trim().length!==6)return;setLoading(true);setError(false);const result=await supabase.auth.mfa.challengeAndVerify({factorId,code:code.trim()});if(result.error){setError(true);setLoading(false);return}setReady(true);setLoading(false);router.push(`/${locale}/admin`);router.refresh()}
 if(loading&&!factorId)return <p>{dictionary.states.loading}</p>;if(ready)return <Alert tone="success">{dictionary.admin.mfaReady}</Alert>;
 return <div className="grid gap-5">{error?<Alert tone="danger">{dictionary.admin.mfaError}</Alert>:null}<p className="text-[var(--muted)]">{dictionary.admin.mfaText}</p>{qr?<div className="mx-auto rounded-2xl bg-white p-4"><Image src={qr} width={220} height={220} alt="TOTP QR" unoptimized /></div>:null}<label className="field-label"><span>{dictionary.admin.mfaCode}</span><Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><button type="button" className={buttonStyles('primary')} disabled={loading||code.length!==6} onClick={()=>void verify()}>{loading?dictionary.states.loading:dictionary.admin.mfaVerify}</button></div>
}
