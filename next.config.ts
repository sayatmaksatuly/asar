import type { NextConfig } from "next";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";
const isProduction = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key:"Content-Security-Policy", value:csp },
  { key:"X-Frame-Options", value:"DENY" },
  { key:"X-Content-Type-Options", value:"nosniff" },
  { key:"Referrer-Policy", value:"strict-origin-when-cross-origin" },
  { key:"Permissions-Policy", value:"camera=(), microphone=(), geolocation=(self), payment=()" },
  ...(isProduction ? [{ key:"Strict-Transport-Security", value:"max-age=31536000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  images:{remotePatterns:[{protocol:"https",hostname:"*.supabase.co"}, ...(!isProduction ? [{protocol:"http" as const,hostname:"127.0.0.1",port:"54321"},{protocol:"http" as const,hostname:"localhost",port:"54321"}] : [])]},
  async headers(){return [{source:"/:path*",headers:securityHeaders}];},
};
export default nextConfig;
