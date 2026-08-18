import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function flatten(value, prefix = "", result = []) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, path, result);
    else result.push(path);
  }
  return result.sort();
}

test("Russian and Kazakh dictionaries stay structurally aligned", async () => {
  const [ru, kk] = await Promise.all([
    readFile(new URL("messages/ru.json", root), "utf8").then(JSON.parse),
    readFile(new URL("messages/kk.json", root), "utf8").then(JSON.parse),
  ]);

  assert.deepEqual(flatten(ru), flatten(kk));
  assert.equal(ru.common.brand, "ASAR");
  assert.equal(kk.common.brand, "ASAR");
});

test("schema, RLS, storage and atomic business functions are present", async () => {
  const [schema, security, functions] = await Promise.all([
    readFile(new URL("supabase/migrations/202608040001_schema.sql", root), "utf8"),
    readFile(new URL("supabase/migrations/202608040002_rls_storage.sql", root), "utf8"),
    readFile(new URL("supabase/migrations/202608040003_business_functions.sql", root), "utf8"),
  ]);

  for (const table of ["profiles", "volunteer_profiles", "help_requests", "request_private_details", "responses", "assignments", "reviews", "bonus_transactions", "reports", "achievements"]) {
    assert.match(schema, new RegExp(`create table public\\.${table}\\b`, "i"));
    assert.match(security, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }

  assert.match(security, /insert into storage\.buckets/i);
  assert.match(functions, /create or replace function public\.select_volunteer/i);
  assert.match(functions, /create or replace function public\.confirm_assignment_completion/i);
  assert.match(schema, /create unique index bonus_one_completion_per_assignment/i);
  assert.match(schema, /create unique index bonus_one_review_per_assignment/i);
});

test("production social card and environment template are packaged", async () => {
  await Promise.all([
    access(new URL("public/og.png", root)),
    access(new URL(".env.example", root)),
    access(new URL("supabase/seed.sql", root)),
  ]);
});

test("platform evolution keeps trust, onboarding, community and drafts server controlled", async () => {
  const [evolution, requests, admin, authForm] = await Promise.all([
    readFile(new URL("supabase/migrations/202608050001_platform_evolution.sql", root), "utf8"),
    readFile(new URL("supabase/migrations/202608050002_request_privacy_and_rewards.sql", root), "utf8"),
    readFile(new URL("supabase/migrations/202608050003_admin_audit_actions.sql", root), "utf8"),
    readFile(new URL("components/auth-form.tsx", root), "utf8"),
  ]);
  for (const table of ["request_drafts", "community_events", "reputation_ledger", "achievement_progress", "moderation_actions"]) {
    assert.match(evolution, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(evolution, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(evolution, /create or replace function public\.complete_onboarding/i);
  assert.match(evolution, /create or replace function public\.recalculate_trust_score/i);
  assert.match(evolution, /create or replace function public\.get_community_impact/i);
  assert.match(requests, /reward_points/i);
  assert.match(admin, /moderation_actions/i);
  assert.doesNotMatch(authForm, /name="role"/);
});

test("brand system and portable design tokens are packaged", async () => {
  const tokens = JSON.parse(await readFile(new URL("design-tokens/tokens.json", root), "utf8"));
  assert.equal(tokens.brand.primary.$value.toLowerCase(), "#16a34a");
  await Promise.all(["logo-primary.svg", "logo-horizontal.svg", "logo-mark.svg", "logo-monochrome.svg", "logo-inverse.svg", "favicon.svg", "app-icon.svg", "social-avatar.svg"].map((name) => access(new URL(`public/brand/${name}`, root))));
  await Promise.all([access(new URL("docs/brand-guidelines.md", root)), access(new URL("docs/trust-score.md", root))]);
});
