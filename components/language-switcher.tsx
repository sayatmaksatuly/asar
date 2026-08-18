"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { alternateLocale, localizePath, type Dictionary, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, label, dictionary }: { locale: Locale; label: string; dictionary: Dictionary }) {
  const pathname = usePathname();
  const nextLocale = alternateLocale(locale);

  return (
    <Link
      href={localizePath(pathname, nextLocale)}
      className="language-switcher"
      onClick={() => { document.cookie = `asar-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`; }}
      hrefLang={nextLocale}
      aria-label={`${label}: ${nextLocale === "ru" ? dictionary.common.languageRussian : dictionary.common.languageKazakh}`}
    >
      <Languages size={18} aria-hidden="true" />
      {nextLocale === "ru" ? dictionary.common.languageRussianShort : dictionary.common.languageKazakhShort}
    </Link>
  );
}
