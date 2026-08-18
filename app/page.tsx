import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default async function RootPage() {
  const cookieStore = await cookies();
  const saved = cookieStore.get("asar-locale")?.value;
  if (saved === "ru" || saved === "kk") redirect(`/${saved}`);

  const headerStore = await headers();
  const preferred: Locale = headerStore.get("accept-language")?.toLowerCase().startsWith("kk") ? "kk" : "ru";
  redirect(`/${preferred}`);
}
