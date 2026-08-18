import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function RootNotFound() {
  const headerStore = await headers();
  const locale: Locale = headerStore.get("x-asar-locale") === "kk" ? "kk" : "ru";
  const dictionary = getDictionary(locale);
  return <main className="shell py-24"><h1 className="text-4xl font-extrabold">404</h1><p className="mt-3 text-[var(--muted)]">{dictionary.states.notFound}</p><Link className="mt-6 inline-flex font-bold text-[var(--brand-strong)] underline" href={`/${locale}`}>{dictionary.common.brand}</Link></main>;
}
