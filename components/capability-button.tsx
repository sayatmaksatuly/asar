"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";
export function EnableVolunteerButton({ dictionary }: { dictionary: Dictionary }) {
  const router=useRouter(); const [loading,setLoading]=useState(false);
  return <button type="button" className={buttonStyles("secondary")} disabled={loading} onClick={async()=>{setLoading(true); const r=await fetch('/api/capabilities/volunteer',{method:'POST'}); setLoading(false); if(r.ok) router.refresh();}}>{loading?dictionary.states.loading:dictionary.dashboard.enableVolunteer}</button>;
}
