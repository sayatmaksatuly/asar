"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";
export function MarkNotificationsRead({ dictionary, id }: { dictionary: Dictionary; id?: string }) {
  const router=useRouter(); const [loading,setLoading]=useState(false);
  return <button type="button" className={buttonStyles("ghost")} disabled={loading} onClick={async()=>{setLoading(true);const response=await fetch('/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{id}:{all:true})});setLoading(false);if(response.ok)router.refresh();}}>{loading?dictionary.states.loading:id?dictionary.common.open:dictionary.notifications.markAll}</button>;
}
