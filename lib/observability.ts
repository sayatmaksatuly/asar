/**
 * Minimal server-side observability primitive.
 *
 * Keep logs deliberately free of request bodies, SQL text and user PII. Cloudflare
 * Workers/Pages and most Node runtimes collect console output, so production can
 * route these structured records into its configured log/error destination.
 */
export function logServerFailure(input: {
  code: string;
  status: number;
  source?: string;
  databaseCode?: string | null;
}) {
  const payload = {
    level: "error",
    event: "asar_server_failure",
    code: input.code,
    status: input.status,
    source: input.source ?? "api",
    database_code: input.databaseCode ?? undefined,
    at: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}

export function extractDatabaseCode(error: string | null | undefined) {
  const match = (error ?? "").match(/\b(?:P\d{4}|[0-9A-Z]{5})\b/);
  return match?.[0] ?? null;
}
