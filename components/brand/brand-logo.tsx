import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function BrandLogo({ locale, inverse = false, compact = false, className = "" }: { locale?: Locale; inverse?: boolean; compact?: boolean; className?: string }) {
  const source = compact ? "/brand/logo-mark.svg" : inverse ? "/brand/logo-inverse.svg" : "/brand/logo-horizontal.svg";
  const image = <Image className={`brand-logo ${compact ? "brand-logo-mark" : "brand-logo-horizontal"} ${className}`} src={source} alt="ASAR" width={compact ? 48 : 176} height={compact ? 48 : 52} priority />;
  return locale ? <Link href={`/${locale}`} className="brand-logo-link" aria-label="ASAR">{image}</Link> : image;
}
