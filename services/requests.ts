import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLanguage, Category, HelpRequestSummary, HelpFormat, UrgencyLevel } from "@/types/domain";

export interface RequestFilters {
  search?: string;
  category?: string;
  cityId?: number;
  districtId?: number;
  urgency?: UrgencyLevel;
  date?: string;
  format?: HelpFormat;
  language?: AppLanguage;
  page?: number;
}

export interface RequestsResult {
  data: HelpRequestSummary[];
  count: number;
  configured: boolean;
  error: string | null;
}

const pageSize = 9;

export async function getCategories(): Promise<{ data: Category[]; configured: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], configured: false };

  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name_ru,name_kk,description_ru,description_kk,icon")
    .eq("is_active", true)
    .order("sort_order");

  return { data: error ? [] : (data ?? []), configured: true };
}

export async function getPublicRequests(filters: RequestFilters = {}): Promise<RequestsResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };

  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("public_help_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search?.trim()) {
    const safeSearch = filters.search.trim().replace(/[%,]/g, " ");
    query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,category_name_ru.ilike.%${safeSearch}%,category_name_kk.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%,district.ilike.%${safeSearch}%`);
  }
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.cityId) query = query.eq("city_id", filters.cityId);
  if (filters.districtId) query = query.eq("district_id", filters.districtId);
  if (filters.urgency) query = query.eq("urgency", filters.urgency);
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) query = query.eq("desired_date", filters.date);
  if (filters.format) query = query.eq("help_format", filters.format);
  if (filters.language) query = query.eq("content_language", filters.language);

  const { data, count, error } = await query;
  return {
    data: error ? [] : ((data ?? []) as HelpRequestSummary[]),
    count: count ?? 0,
    configured: true,
    error: error?.message ?? null,
  };
}

export async function getPublicRequest(id: string): Promise<{ data: HelpRequestSummary | null; configured: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, configured: false };

  const { data } = await supabase.from("public_help_requests").select("*").eq("id", id).maybeSingle();
  return { data: (data as HelpRequestSummary | null) ?? null, configured: true };
}
