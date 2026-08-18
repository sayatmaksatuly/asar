import type { Locale } from "@/lib/i18n";

export function StructuredData({ locale }: { locale: Locale }) {
  const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://asar.kz").replace(/\/$/,"");
  const data={
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Organization","@id":`${base}/#organization`,name:"ASAR",url:base,logo:`${base}/brand/logo-primary.svg`},
      {"@type":"WebSite","@id":`${base}/#website`,url:base,name:"ASAR",inLanguage:locale==="kk"?"kk-KZ":"ru-KZ",publisher:{"@id":`${base}/#organization`}},
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}} />;
}
