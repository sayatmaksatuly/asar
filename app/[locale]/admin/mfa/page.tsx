import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMfa } from "@/components/admin-mfa";
import { ErrorState } from "@/components/ui/states";
import { getDictionary,isLocale,type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const{locale}=await params;const safe:Locale=isLocale(locale)?locale:"ru";return{title:getDictionary(safe).admin.mfaTitle,robots:{index:false,follow:false}}}
export default async function AdminMfaPage({params}:{params:Promise<{locale:string}>}){const{locale:raw}=await params;const locale:Locale=isLocale(raw)?raw:"ru";const d=getDictionary(locale);const supabase=await createSupabaseServerClient();if(!supabase)return <section className="section"><div className="shell"><ErrorState title={d.states.notConfigured}/></div></section>;const{data:auth}=await supabase.auth.getUser();if(!auth.user)redirect(`/${locale}/auth/sign-in?next=/${locale}/admin/mfa`);const{data:profile}=await supabase.from('profiles').select('role,status').eq('id',auth.user.id).maybeSingle();if(profile?.role!=='admin'||profile.status!=='active')return <section className="section"><div className="shell"><ErrorState title={d.admin.accessDenied}/></div></section>;return <section className="section"><div className="shell max-w-xl"><div className="content-card"><p className="section-kicker">ASAR Security</p><h1 className="mt-3 text-3xl font-extrabold">{d.admin.mfaTitle}</h1><div className="mt-6"><AdminMfa dictionary={d} locale={locale}/></div></div></div></section>}
