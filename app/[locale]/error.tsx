"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@/components/ui/states";
import { getDictionary, isLocale } from "@/lib/i18n";

export default function ErrorPage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale && isLocale(params.locale) ? params.locale : "ru";
  const dictionary = getDictionary(locale);
  return <div className="shell py-20"><ErrorState title={dictionary.states.error} text={dictionary.states.offline} /></div>;
}
