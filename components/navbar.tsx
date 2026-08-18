"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";

export function Navbar({ locale, dictionary, signedIn }: { locale: Locale; dictionary: Dictionary; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: `/${locale}/requests`, label: dictionary.nav.requests },
    { href: `/${locale}/community`, label: dictionary.nav.community },
    { href: `/${locale}/about`, label: dictionary.nav.about },
    { href: `/${locale}/faq`, label: dictionary.nav.faq },
  ];

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">{dictionary.nav.skip}</a>
      <div className="shell flex min-h-20 items-center justify-between gap-4">
        <BrandLogo locale={locale} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label={dictionary.nav.menu}>
          {links.map((link) => <Link key={link.href} className="nav-link" href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <AccessibilityControls dictionary={dictionary} />
          <LanguageSwitcher locale={locale} label={dictionary.common.language} dictionary={dictionary} />
          <Link className={`${buttonStyles(signedIn ? "secondary" : "primary")} desktop-auth hidden`} href={signedIn ? `/${locale}/dashboard` : `/${locale}/auth/sign-in`}>
            {signedIn ? dictionary.nav.dashboard : dictionary.nav.signIn}
          </Link>
          <button type="button" className="icon-button mobile-menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={dictionary.nav.menu}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-[var(--line)] bg-white px-5 py-4 lg:hidden" aria-label={dictionary.nav.menu}>
          <div className="shell grid gap-2">
            {links.map((link) => <Link key={link.href} className="nav-link min-h-12" href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
            <Link className={buttonStyles(signedIn ? "secondary" : "primary")} href={signedIn ? `/${locale}/dashboard` : `/${locale}/auth/sign-in`} onClick={() => setOpen(false)}>{signedIn ? dictionary.nav.dashboard : dictionary.nav.signIn}</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
