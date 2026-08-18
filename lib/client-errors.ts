import type { Dictionary } from "@/lib/i18n";

export async function localizedApiError(response: Response, dictionary: Dictionary): Promise<string> {
  const payload = await response.clone().json().catch(() => ({})) as { error?: string };
  const code = payload.error ?? "operation_failed";
  const errors = dictionary.errors as Record<string, string>;
  return errors[code] ?? dictionary.auth.genericError;
}
