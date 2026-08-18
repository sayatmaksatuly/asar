import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CityOption, DistrictOption } from "@/types/domain";
export async function getLocations(): Promise<{ cities: CityOption[]; districts: DistrictOption[]; configured: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { cities: [], districts: [], configured: false };
  const [cities, districts] = await Promise.all([
    supabase.from("cities").select("id,slug,name_ru,name_kk,region_id").eq("is_active", true).order("name_ru"),
    supabase.from("districts").select("id,city_id,slug,name_ru,name_kk").eq("is_active", true).order("name_ru"),
  ]);
  return { cities: (cities.data ?? []) as CityOption[], districts: (districts.data ?? []) as DistrictOption[], configured: !cities.error && !districts.error };
}
