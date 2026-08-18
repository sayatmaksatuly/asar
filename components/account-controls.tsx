"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Input, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";
export function AccountControls({dictionary,locale}:{dictionary:Dictionary;locale:Locale}){
 const router=useRouter();const [confirm,setConfirm]=useState('');const [state,setState]=useState<'idle'|'loading'|'error'>('idle');
 return <div className="grid gap-5"><div><h3 className="font-extrabold">{dictionary.dashboard.dataExport}</h3><p className="mt-1 text-sm text-[var(--muted)]">{dictionary.account.exportText}</p><Link prefetch={false} className={`${buttonStyles('secondary')} mt-3`} href="/api/account/export">{dictionary.common.download}</Link></div><div className="border-t border-[var(--line)] pt-5"><h3 className="font-extrabold text-[var(--danger)]">{dictionary.dashboard.deleteAccount}</h3><p className="mt-1 text-sm text-[var(--muted)]">{dictionary.account.deleteText}</p>{state==='error'?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<label className="field-label mt-3"><span>{dictionary.account.confirmDelete}</span><Input value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off" /></label><button type="button" className={`${buttonStyles('danger')} mt-3`} disabled={state==='loading'||confirm!=='DELETE'} onClick={async()=>{if(!window.confirm(dictionary.states.confirmation))return;setState('loading');const r=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm})});if(r.ok){router.push(`/${locale}`);router.refresh()}else setState('error')}}>{state==='loading'?dictionary.states.loading:dictionary.dashboard.deleteAccount}</button></div></div>
}
