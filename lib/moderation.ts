export type ModerationDecision = { ok: true } | { ok: false; code: "emergency_request_not_supported" | "prohibited_request_content" | "spam_request_content" | "unsafe_contact_content" };

const emergencyPatterns = [
  /не\s+дыш(ит|у)/iu, /без\s+сознани/iu, /сильн(ое|ое)?\s+кровотеч/iu, /угроз[аы]\s+жизни/iu, /сердечн(ый|ого)\s+приступ/iu, /пожар/iu, /горит\s+(дом|квартира)/iu,
  /тыныс\s+алмай/iu, /ес-түссіз/iu, /қатты\s+қан\s+кет/iu, /өмірге\s+қауіп/iu, /өрт/iu,
  /not\s+breathing/iu, /unconscious/iu, /severe\s+bleeding/iu, /life[-\s]?threatening/iu,
];
const prohibitedPatterns = [
  /(куп(ить|лю)|прод(ать|ам)).{0,30}(наркот|героин|кокаин|метамфет|закладк)/iu,
  /(қару|оружи[ея]).{0,30}(купить|продать|сату|сатып)/iu,
  /(поддел(ать|ка)|жалған).{0,30}(документ|справк|куәлік)/iu,
  /(отмыть|обналичить).{0,30}(деньг|ақша)/iu,
];
const sensitivePatterns = [
  /\b(cvv|cvc)\b/iu, /код.{0,12}(из\s+смс|sms|otp)/iu, /одноразов(ый|ого)\s+код/iu,
  /(номер|нөмір).{0,15}(банковск|банк).{0,15}(карт|карта)/iu,
];

export function moderateRequestText(parts: Array<string | null | undefined>): ModerationDecision {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return { ok: true };
  if (emergencyPatterns.some((pattern) => pattern.test(text))) return { ok: false, code: "emergency_request_not_supported" };
  if (prohibitedPatterns.some((pattern) => pattern.test(text))) return { ok: false, code: "prohibited_request_content" };
  if (sensitivePatterns.some((pattern) => pattern.test(text))) return { ok: false, code: "unsafe_contact_content" };
  const links = text.match(/https?:\/\//giu)?.length ?? 0;
  if (links >= 4 || /(.)\1{12,}/u.test(text)) return { ok: false, code: "spam_request_content" };
  return { ok: true };
}
