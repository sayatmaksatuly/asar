import type { AppLanguage, HelpFormat, UrgencyLevel } from "@/types/domain";

export interface CreateRequestPayload {
  title: string;
  description: string;
  content_language: AppLanguage;
  category_id: string;
  city: string;
  district: string;
  city_id: number | null;
  district_id: number | null;
  address: string;
  location_notes: string | null;
  desired_date: string | null;
  time_from: string | null;
  time_to: string | null;
  urgency: UrgencyLevel;
  help_format: HelpFormat;
  image_url: string | null;
  special_conditions: string | null;
  preferred_contact_method: "phone" | "whatsapp" | "telegram" | "other";
  contact_value: string;
  volunteer_instructions: string | null;
  reward_type: "none" | "thanks" | "symbolic";
  reward_note: string | null;
  reward_points: number | null;
  draft_id: string | null;
  status: "draft" | "open";
  safety_consent: boolean;
}

const languages = new Set(["ru", "kk"]);
const urgencies = new Set(["low", "normal", "high", "urgent"]);
const formats = new Set(["in_person", "remote", "delivery", "transport"]);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function nullable(value: unknown, max: number): string | null {
  return clean(value, max) || null;
}

export function validateCreateRequest(input: unknown): { data: CreateRequestPayload | null; error: string | null } {
  if (!input || typeof input !== "object") return { data: null, error: "invalid_payload" };
  const value = input as Record<string, unknown>;
  const title = clean(value.title, 120);
  const description = clean(value.description, 3000);
  const categoryId = clean(value.category_id, 60);
  const city = clean(value.city, 100);
  const district = clean(value.district, 100);
  const cityId = Number.isInteger(Number(value.city_id)) && Number(value.city_id) > 0 ? Number(value.city_id) : null;
  const districtId = Number.isInteger(Number(value.district_id)) && Number(value.district_id) > 0 ? Number(value.district_id) : null;
  const address = clean(value.address, 240);
  const language = clean(value.content_language, 2);
  const urgency = clean(value.urgency, 20);
  const format = clean(value.help_format, 20);
  const status = value.status === "draft" ? "draft" : "open";
  const safetyConsent = value.safety_consent === true;
  const contactMethod = ["phone", "whatsapp", "telegram", "other"].includes(String(value.preferred_contact_method)) ? String(value.preferred_contact_method) as CreateRequestPayload["preferred_contact_method"] : "phone";
  const contactValue = clean(value.contact_value, 200);
  const rewardType = ["none", "thanks", "symbolic"].includes(String(value.reward_type)) ? String(value.reward_type) as CreateRequestPayload["reward_type"] : "none";

  if (title.length < 5 || description.length < 20 || !categoryId || (!city && !cityId) || !district || !address || contactValue.length < 3 || !languages.has(language) || !urgencies.has(urgency) || !formats.has(format) || !safetyConsent) {
    return { data: null, error: "validation_error" };
  }

  return {
    data: {
      title,
      description,
      category_id: categoryId,
      city,
      district,
      city_id: cityId,
      district_id: districtId,
      address,
      content_language: language as AppLanguage,
      urgency: urgency as UrgencyLevel,
      help_format: format as HelpFormat,
      status,
      location_notes: nullable(value.location_notes, 240),
      desired_date: nullable(value.desired_date, 20),
      time_from: nullable(value.time_from, 10),
      time_to: nullable(value.time_to, 10),
      image_url: nullable(value.image_url, 500),
      special_conditions: nullable(value.special_conditions, 1000),
      preferred_contact_method: contactMethod,
      contact_value: contactValue,
      volunteer_instructions: nullable(value.volunteer_instructions, 1000),
      reward_type: rewardType,
      reward_note: nullable(value.reward_note, 240),
      reward_points: null,
      draft_id: nullable(value.draft_id, 60),
      safety_consent: safetyConsent,
    },
    error: null,
  };
}
