import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap {
  const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://asar.kz").replace(/\/$/,"");
  const routes=["","/about","/faq","/requests","/community","/privacy","/terms","/community-rules"];
  return (["ru","kk"] as const).flatMap(locale=>routes.map(route=>({url:`${base}/${locale}${route}`,changeFrequency:route==="/requests"||route==="/community"?"daily":"monthly",priority:route===""?1:route==="/requests"?0.9:0.6,alternates:{languages:{ru:`${base}/ru${route}`,kk:`${base}/kk${route}`}}})));
}
