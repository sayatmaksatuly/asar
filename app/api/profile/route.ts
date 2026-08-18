import { NextResponse } from "next/server";
import { getAuthContext, jsonError, statusForDatabaseError } from "@/lib/api";
import { removeOwnedPublicAsset } from "@/lib/storage";

function clean(value: unknown, max: number) { return typeof value === "string" ? value.replace(/[\u0000-\u001F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }

export async function PATCH(request: Request) {
  const context = await getAuthContext(); if (!context.supabase || !context.user || !context.profile) return jsonError(context.error ?? "unauthorized", context.supabase ? 401 : 503);
  if (context.profile.status !== "active") return jsonError("user_blocked", 403);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null; if (!body) return jsonError("invalid_json");
  const fullName = clean(body.full_name, 100); if (fullName.length < 2) return jsonError("validation_error", 422);
  const { data: previous } = await context.supabase.from("profiles").select("avatar_url").eq("id", context.user.id).maybeSingle();
  const nextAvatar = clean(body.avatar_url, 500) || null;
  const cityIdRaw = Number(body.city_id);
  const districtIdRaw = Number(body.district_id);
  const cityId = Number.isInteger(cityIdRaw) && cityIdRaw > 0 ? cityIdRaw : null;
  const districtId = Number.isInteger(districtIdRaw) && districtIdRaw > 0 ? districtIdRaw : null;
  let city: string | null = null;
  let district = clean(body.district, 100) || null;
  if (cityId) {
    const { data: cityRow } = await context.supabase.from("cities").select("id,name_ru").eq("id", cityId).eq("is_active", true).maybeSingle();
    if (!cityRow) return jsonError("invalid_city", 422);
    city = cityRow.name_ru;
    if (districtId) {
      const { data: districtRow } = await context.supabase.from("districts").select("id,name_ru").eq("id", districtId).eq("city_id", cityId).eq("is_active", true).maybeSingle();
      if (!districtRow) return jsonError("invalid_district", 422);
      district = districtRow.name_ru;
    }
  } else if (districtId) return jsonError("invalid_district", 422);
  const profileUpdate = {
    full_name: fullName,
    city,
    district,
    city_id: cityId,
    district_id: districtId,
    avatar_url: nextAvatar,
    show_public_name: body.show_public_name === "on" || body.show_public_name === true,
    show_city: body.show_city === "on" || body.show_city === true,
    share_community_activity: body.share_community_activity === "on" || body.share_community_activity === true,
    allow_public_profile: body.allow_public_profile === "on" || body.allow_public_profile === true,
    transactional_email_enabled: body.transactional_email_enabled === "on" || body.transactional_email_enabled === true,
    marketing_email_enabled: body.marketing_email_enabled === "on" || body.marketing_email_enabled === true,
  };
  const { error } = await context.supabase.from("profiles").update(profileUpdate).eq("id", context.user.id); if (error) return jsonError(error.message, statusForDatabaseError(error.message));
  if (context.profile.can_volunteer || context.profile.role === "admin") {
    const skills = clean(body.skills, 500).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
    const { error: volunteerError } = await context.supabase.from("volunteer_profiles").update({ bio: clean(body.bio, 1200) || null, availability: clean(body.availability, 240) || null, skills }).eq("user_id", context.user.id);
    if (volunteerError) return jsonError(volunteerError.message, statusForDatabaseError(volunteerError.message));
  }
  if (previous?.avatar_url && previous.avatar_url !== nextAvatar) await removeOwnedPublicAsset(context.user.id, "avatars", previous.avatar_url);
  return NextResponse.json({ updated: true });
}
