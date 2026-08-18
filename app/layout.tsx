import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDictionary, type Locale } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const locale: Locale = headerStore.get("x-asar-locale") === "kk" ? "kk" : "ru";
  const dictionary = getDictionary(locale);
  const title = dictionary.seo.title;
  const description = dictionary.seo.description;
  const ogTitle = dictionary.seo.ogTitle;
  return {
    metadataBase,
    title: { default: title, template: "%s · ASAR" },
    description,
    icons: { icon: "/brand/favicon.svg", apple: "/brand/app-icon.svg" },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      locale: locale === "ru" ? "ru_KZ" : "kk_KZ",
      alternateLocale: [locale === "ru" ? "kk_KZ" : "ru_KZ"],
      images: [{ url: "/og-asar-community.png", width: 1734, height: 909, alt: title }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: dictionary.common.tagline, images: ["/og-asar-community.png"] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headerStore = await headers();
  const locale = headerStore.get("x-asar-locale") === "kk" ? "kk" : "ru";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
