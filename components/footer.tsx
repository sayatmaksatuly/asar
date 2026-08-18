import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { Dictionary, Locale } from "@/lib/i18n";

export function Footer({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-[var(--ink)] text-white">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <BrandLogo locale={locale} inverse />
          <p className="mt-4 max-w-md text-[#c8d4d1]">{dictionary.footer.description}</p>
        </div>
        <div>
          <strong>{dictionary.footer.platform}</strong>
          <div className="mt-4 grid gap-3 text-[#c8d4d1]"><Link href={`/${locale}/requests`}>{dictionary.nav.requests}</Link><Link href={`/${locale}/community`}>{dictionary.nav.community}</Link><Link href={`/${locale}/about`}>{dictionary.nav.about}</Link><Link href={`/${locale}/faq`}>{dictionary.nav.faq}</Link></div>
        </div>
        <div>
          <strong>{dictionary.footer.support}</strong>
          <div className="mt-4 grid gap-3 text-[#c8d4d1]"><Link href={`/${locale}/about#safety`}>{dictionary.footer.safety}</Link><Link href={`/${locale}/privacy`}>{dictionary.nav.privacy}</Link><Link href={`/${locale}/terms`}>{dictionary.nav.terms}</Link><Link href={`/${locale}/community-rules`}>{dictionary.nav.communityRules}</Link></div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-sm text-[#aebdb9]">© {new Date().getFullYear()} {dictionary.footer.copyright}</div>
    </footer>
  );
}
