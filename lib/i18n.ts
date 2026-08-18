import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";

export const locales = ["ru", "kk"] as const;
export type Locale = (typeof locales)[number];

export const messages = { ru, kk } as const;
export type Dictionary = (typeof messages)["ru"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale): Dictionary {
  return messages[locale] as Dictionary;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === "ru" ? "kk" : "ru";
}

export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (segments[1] === "ru" || segments[1] === "kk") {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
