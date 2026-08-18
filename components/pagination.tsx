import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/primitives";
import type { Dictionary } from "@/lib/i18n";

export function Pagination({ current, total, pathname, searchParams, dictionary }: { current: number; total: number; pathname: string; searchParams: Record<string, string | undefined>; dictionary: Dictionary }) {
  if (total <= 1) return null;
  function href(page: number) {
    const params = new URLSearchParams(Object.entries(searchParams).filter((entry): entry is [string, string] => Boolean(entry[1])));
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }
  return (
    <nav className="mt-10 flex items-center justify-center gap-3" aria-label={dictionary.requests.page}>
      {current > 1 ? <Link className={buttonStyles("secondary")} href={href(current - 1)} aria-label={`${dictionary.common.back}: ${current - 1}`}><ChevronLeft /></Link> : null}
      <span className="min-h-12 rounded-full bg-[var(--surface-soft)] px-5 py-3 font-bold">{dictionary.requests.page} {current} / {total}</span>
      {current < total ? <Link className={buttonStyles("secondary")} href={href(current + 1)} aria-label={`${dictionary.common.learnMore}: ${current + 1}`}><ChevronRight /></Link> : null}
    </nav>
  );
}
