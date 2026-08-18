"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Input, Select, Textarea, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

async function adminPost(endpoint:string,body:Record<string,unknown>){return fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});}

export function UserBlockForm({userId,blocked,dictionary}:{userId:string;blocked:boolean;dictionary:Dictionary}){
 const router=useRouter();const [reason,setReason]=useState("");const [state,setState]=useState<"idle"|"loading"|"error">("idle");
 return <div className="grid gap-3"><label className="field-label"><span>{dictionary.admin.reason}</span><Input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={1000}/></label>{state==="error"?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<button type="button" className={buttonStyles(blocked?"secondary":"danger")} disabled={state==="loading"||reason.trim().length<5} onClick={async()=>{if(!window.confirm(dictionary.states.confirmation))return;setState("loading");const r=await adminPost(`/api/admin/users/${userId}/block`,{blocked:!blocked,reason});if(r.ok){setReason("");setState("idle");router.refresh()}else setState("error")}}>{state==="loading"?dictionary.states.loading:blocked?dictionary.admin.unblock:dictionary.admin.block}</button></div>
}

export function VerificationResolveForm({requestId,dictionary}:{requestId:string;dictionary:Dictionary}){
 const router=useRouter();const [reason,setReason]=useState("");const [state,setState]=useState<"idle"|"loading"|"error">("idle");
 async function run(approved:boolean){setState("loading");const r=await adminPost(`/api/admin/verifications/${requestId}`,{approved,reason});if(r.ok){setState("idle");router.refresh()}else setState("error")}
 return <div className="grid gap-3"><label className="field-label"><span>{dictionary.admin.reason}</span><Input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={1000}/></label>{state==="error"?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<div className="flex flex-wrap gap-2"><button type="button" className={buttonStyles("primary")} disabled={state==="loading"||reason.trim().length<5} onClick={()=>void run(true)}>{dictionary.admin.approve}</button><button type="button" className={buttonStyles("danger")} disabled={state==="loading"||reason.trim().length<5} onClick={()=>void run(false)}>{dictionary.admin.reject}</button></div></div>
}

export function DisputeResolveForm({disputeId,dictionary}:{disputeId:string;dictionary:Dictionary}){
 const router=useRouter();const [action,setAction]=useState("resume");const [reason,setReason]=useState("");const [state,setState]=useState<"idle"|"loading"|"error">("idle");
 return <div className="grid gap-3"><label className="field-label"><span>{dictionary.admin.action}</span><Select value={action} onChange={e=>setAction(e.target.value)}><option value="resume">{dictionary.admin.disputeResume}</option><option value="complete">{dictionary.admin.disputeComplete}</option><option value="cancel">{dictionary.admin.disputeCancel}</option><option value="reopen_request">{dictionary.admin.disputeReopen}</option><option value="dismiss">{dictionary.admin.disputeDismiss}</option></Select></label><label className="field-label"><span>{dictionary.admin.reason}</span><Textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={1500}/></label>{state==="error"?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<button type="button" className={buttonStyles("primary")} disabled={state==="loading"||reason.trim().length<5} onClick={async()=>{setState("loading");const r=await adminPost(`/api/admin/disputes/${disputeId}`,{action,reason});if(r.ok){setState("idle");router.refresh()}else setState("error")}}>{state==="loading"?dictionary.states.loading:dictionary.admin.resolve}</button></div>
}

export function ReportResolveForm({reportId,dictionary}:{reportId:string;dictionary:Dictionary}){
 const router=useRouter();const [status,setStatus]=useState("resolved");const [reason,setReason]=useState("");const [state,setState]=useState<"idle"|"loading"|"error">("idle");
 return <div className="grid gap-3"><label className="field-label"><span>{dictionary.admin.status}</span><Select value={status} onChange={e=>setStatus(e.target.value)}><option value="reviewing">{dictionary.admin.reportReviewing}</option><option value="resolved">{dictionary.admin.reportResolved}</option><option value="dismissed">{dictionary.admin.reportDismissed}</option></Select></label><label className="field-label"><span>{dictionary.admin.reason}</span><Textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={1500}/></label>{state==="error"?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<button type="button" className={buttonStyles("secondary")} disabled={state==="loading"||reason.trim().length<5} onClick={async()=>{setState("loading");const r=await fetch(`/api/admin/reports/${reportId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,reason})});if(r.ok){setState("idle");router.refresh()}else setState("error")}}>{state==="loading"?dictionary.states.loading:dictionary.admin.resolve}</button></div>
}

export function RequestImageRemoveForm({requestId,dictionary}:{requestId:string;dictionary:Dictionary}){
 const router=useRouter();const [reason,setReason]=useState("");const [state,setState]=useState<"idle"|"loading"|"error">("idle");
 return <div className="grid gap-2"><label className="field-label"><span>{dictionary.admin.reason}</span><Input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={1000}/></label>{state==="error"?<Alert tone="danger">{dictionary.states.error}</Alert>:null}<button type="button" className={buttonStyles("danger")} disabled={state==="loading"||reason.trim().length<5} onClick={async()=>{if(!window.confirm(dictionary.states.confirmation))return;setState("loading");const r=await fetch(`/api/admin/requests/${requestId}/image`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason})});if(r.ok){setState("idle");setReason("");router.refresh()}else setState("error")}}>{state==="loading"?dictionary.states.loading:dictionary.admin.removeImage}</button></div>
}
