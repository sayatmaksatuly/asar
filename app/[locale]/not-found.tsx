"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonStyles } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { getDictionary } from "@/lib/i18n";
export default function NotFound(){const locale=usePathname().startsWith("/kk")?"kk":"ru";const d=getDictionary(locale);return <section className="section"><div className="shell max-w-2xl"><ErrorState title="404" text={d.requestDetail.notFound}/><div className="mt-5"><Link className={buttonStyles("primary")} href={`/${locale}`}>{d.nav.home}</Link></div></div></section>}
