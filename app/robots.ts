import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots {
  const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://asar.kz").replace(/\/$/,"");
  return {rules:[{userAgent:"*",allow:"/",disallow:["/api/","/ru/admin","/kk/admin","/ru/dashboard","/kk/dashboard","/ru/auth","/kk/auth","/ru/onboarding","/kk/onboarding"]}],sitemap:`${base}/sitemap.xml`};
}
