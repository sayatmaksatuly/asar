"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (browserClient) return browserClient;
  const config = getSupabasePublicConfig();
  if (!config) return null;

  browserClient = createBrowserClient<Database>(config.url, config.anonKey);
  return browserClient;
}
