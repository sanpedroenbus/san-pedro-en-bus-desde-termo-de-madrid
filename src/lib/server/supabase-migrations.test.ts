import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROBLEMS } from "@/lib/domain/problems";
import { ROUTES } from "@/lib/domain/routes";

// There is no live Postgres instance to run these migrations against in this
// suite, so these are static assertions against the SQL text: they check
// shape (constraints, grants, RLS) rather than runtime behaviour. Route and
// problem ids are pulled from the real domain constants rather than
// hardcoded here, so the SQL and TypeScript can't silently drift apart the
// way the archived Metro-de-Madrid migrations did (see makeover.md section 2.2).
const root = process.cwd();
const migrationPath = join(root, "supabase/migrations/0001_initial.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("Supabase migration: 0001_initial.sql", () => {
  it("is the base of the active migrations (old Metro de Madrid migrations are archived, not applied)", () => {
    const activeMigrations = readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql"));
    expect(activeMigrations).toEqual([
      "0001_initial.sql",
      "0002_create_report_no_unit_origin_window.sql",
      "0003_retire_no_paso_google_maps.sql",
      "0004_ramp_problem_and_unit_normalization.sql",
      "0005_collaborators.sql",
      "0006_catalogue_revision_and_carmiol.sql",
      "0007_scope_duplicates_to_origin.sql",
    ]);
  });

  it("defines a reports table with a route CHECK constraint listing only real routes (0006 adds the newer ones)", () => {
    const routeCheckMatch = migration.match(/route text not null check \(\s*route in \(([\s\S]*?)\)\s*\),/);
    expect(routeCheckMatch).not.toBeNull();
    const listedRoutes = routeCheckMatch![1].match(/'([A-Z_]+)'/g)?.map((value) => value.replaceAll("'", "")) ?? [];

    expect(listedRoutes.length).toBeGreaterThan(0);
    for (const route of listedRoutes) expect(ROUTES).toContain(route);
  });

  it("requires at least one problem", () => {
    expect(migration).toContain("cardinality(problems) > 0");
  });

  it("accepts short numeric bus unit codes as well as plate-like codes, not the old Metro car regex", () => {
    const unitCheckMatch = migration.match(/unit text check \(unit is null or unit ~ '(.+?)'\)/);
    expect(unitCheckMatch).not.toBeNull();
    const unitPattern = new RegExp(unitCheckMatch![1]);

    expect(unitPattern.test("51")).toBe(true);
    expect(unitPattern.test("99")).toBe(true);
    expect(unitPattern.test("SJB1234")).toBe(true);
    // The old Metro de Madrid pattern (^[A-Z][0-9]{4,5}$ / ^[MRS][0-9]{4,5}$)
    // required a letter prefix plus 4-5 digits and would reject bare bus unit
    // numbers like "51" -- make sure that pattern is gone.
    expect(migration).not.toContain("^[MRS][0-9]{4,5}$");
    expect(migration).not.toContain("^[A-Z][0-9]{4,5}$");
  });

  it("stores only a server-assigned created_at timestamp (no client-supplied timestamp column)", () => {
    expect(migration).toContain("created_at timestamptz not null default now()");
  });

  it("keeps moderation fields even without an admin UI", () => {
    expect(migration).toContain("review_status text not null default 'accepted'");
    expect(migration).toContain("hidden_at timestamptz");
    expect(migration).toContain("hidden_reason text");
  });

  it("enables row level security on every exposed table", () => {
    expect(migration).toContain("alter table public.reports enable row level security");
    expect(migration).toContain("alter table public.units enable row level security");
  });

  it("revokes default access before granting anything back explicitly", () => {
    expect(migration).toContain("revoke all on public.reports from anon, authenticated");
    expect(migration).toContain("revoke all on public.units from anon, authenticated");
  });

  it("excludes private abuse/undo columns from every public grant on reports", () => {
    const publicGrants = migration
      .split("\n")
      .filter((line) => line.includes("grant select") && line.includes("public.reports") && line.includes("anon"));
    expect(publicGrants.length).toBeGreaterThan(0);
    for (const grant of publicGrants) {
      expect(grant).not.toContain("abuse_key");
      expect(grant).not.toContain("undo_token_hash");
      expect(grant).not.toContain("undo_expires_at");
    }
    expect(migration).toContain("grant select (id, route, unit, problems, created_at, hidden_at) on public.reports to anon, authenticated");
  });

  it("only shows non-hidden reports through the public row-level-security policy", () => {
    expect(migration).toContain('create policy "Public reports are readable"');
    expect(migration).toContain("using (hidden_at is null)");
  });

  it("restricts create_report to the service role, revoking public and anon/authenticated execute", () => {
    expect(migration).toContain("security definer");
    expect(migration).toMatch(/revoke all on function public\.create_report\([^)]*\) from public/);
    expect(migration).toMatch(/revoke execute on function public\.create_report\([^)]*\) from anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.create_report\([^)]*\) to service_role/);
  });

  it("rate-limits report creation by abuse key inside create_report before checking duplicates", () => {
    const rateLimitIndex = migration.indexOf("v_recent_count >= input_rate_limit_max");
    const duplicateIndex = migration.indexOf("v_duplicate_id is not null");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(duplicateIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeLessThan(duplicateIndex);
  });

  it("suppresses duplicates by matching route + unit + exact problem set, or route + no unit at all", () => {
    expect(migration).toContain("input_unit is null and r.unit is null");
    expect(migration).toContain("input_unit is not null and r.unit = input_unit and r.problems = input_problems");
    // Hidden reports never count as a duplicate match.
    expect(migration).toContain("r.hidden_at is null");
  });

  it("restricts dashboard_home_snapshot to the service role and excludes hidden reports", () => {
    expect(migration).toContain("create or replace function public.dashboard_home_snapshot");
    expect(migration).toContain("and hidden_at is null");
    expect(migration).toMatch(
      /revoke execute on function public\.dashboard_home_snapshot\([^)]*\) from anon, authenticated/,
    );
    expect(migration).toMatch(/grant execute on function public\.dashboard_home_snapshot\([^)]*\) to service_role/);
  });

  it("does not reintroduce Metro de Madrid vocabulary (single heat state, L1-L12 lines, fleet estimates)", () => {
    expect(migration).not.toContain("heat_state");
    expect(migration).not.toMatch(/'L\d{1,2}'/);
    expect(migration).not.toContain("line_fleet_estimates");
    expect(migration.toLowerCase()).not.toContain("termo indicator");
  });
});

describe("Supabase migration: 0002_create_report_no_unit_origin_window.sql", () => {
  const migration0002 = readFileSync(join(root, "supabase/migrations/0002_create_report_no_unit_origin_window.sql"), "utf8");
  const signature = "text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz";

  it("adds the new signature alongside the old one so applying it can't break the deployed app", () => {
    expect(migration0002).not.toContain("drop function");
    expect(migration0002).toContain("input_no_unit_window_start timestamptz\n)");
  });

  it("limits no-unit reports per abuse key across all routes, after rate limiting and before route duplicates", () => {
    const rateLimitIndex = migration0002.indexOf("v_recent_count >= input_rate_limit_max");
    const originWindowIndex = migration0002.indexOf("r.created_at >= input_no_unit_window_start");
    const duplicateIndex = migration0002.indexOf("v_duplicate_id is not null");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(originWindowIndex).toBeGreaterThan(rateLimitIndex);
    expect(duplicateIndex).toBeGreaterThan(originWindowIndex);
    expect(migration0002).toContain("input_unit is null and exists");
    expect(migration0002).toContain("r.abuse_key = input_abuse_key");
  });

  it("keeps create_report restricted to the service role", () => {
    expect(migration0002).toContain(`revoke all on function public.create_report(${signature}) from public;`);
    expect(migration0002).toContain(`revoke execute on function public.create_report(${signature}) from anon, authenticated;`);
    expect(migration0002).toContain(`grant execute on function public.create_report(${signature}) to service_role;`);
  });
});

describe("Supabase migration: 0003_retire_no_paso_google_maps.sql", () => {
  const migration0003 = readFileSync(join(root, "supabase/migrations/0003_retire_no_paso_google_maps.sql"), "utf8");

  it("is no longer part of the app's problem catalogue", () => {
    expect(PROBLEMS).not.toContain("no_paso_google_maps");
  });

  it("hides (never deletes) reports whose only problem was the retired one, and strips it from the rest", () => {
    expect(migration0003).not.toMatch(/delete from/i);
    expect(migration0003).toContain("where problems = array['no_paso_google_maps']::text[]");
    expect(migration0003).toContain("hidden_reason = coalesce(hidden_reason, 'problem_retired')");
    expect(migration0003).toContain("set problems = array_remove(problems, 'no_paso_google_maps')");
    // Stripping must skip single-problem rows, or they'd violate cardinality(problems) > 0.
    expect(migration0003).toContain("and cardinality(problems) > 1");
  });
});

describe("Supabase migration: 0004_ramp_problem_and_unit_normalization.sql", () => {
  const migration0004 = readFileSync(join(root, "supabase/migrations/0004_ramp_problem_and_unit_normalization.sql"), "utf8");

  it("replaces the problems constraint, adding the ramp problem and keeping the retired one", () => {
    expect(migration0004).toContain("alter table public.reports drop constraint reports_problems_check;");
    expect(migration0004).toContain("cardinality(problems) > 0");
    const listed = migration0004.match(/'([a-z_]+)'/g)?.map((value) => value.replaceAll("'", "")) ?? [];
    expect(listed).toContain("rampa_no_funciono");
    expect(listed).toContain("no_paso_google_maps");
  });

  it("normalizes stored plates and unit numbers the same way normalizeUnitCode does", () => {
    expect(migration0004).toContain("set unit = 'SJB' || ltrim(regexp_replace(unit, '^SJB', ''), '0')");
    expect(migration0004).toContain("between 4 and 6");
    expect(migration0004).toContain("set unit = ltrim(unit, '0')");
  });
});

describe("Supabase migration: 0005_collaborators.sql", () => {
  const migration0005 = readFileSync(join(root, "supabase/migrations/0005_collaborators.sql"), "utf8");

  it("keeps contact data private: RLS on, no policies, no anon/authenticated grants", () => {
    expect(migration0005).toContain("alter table public.collaborators enable row level security;");
    expect(migration0005).toContain("revoke all on public.collaborators from anon, authenticated;");
    expect(migration0005).not.toMatch(/create policy/i);
    expect(migration0005).not.toMatch(/grant [a-z, ]+ on public\.collaborators to (anon|authenticated)/i);
  });

  it("requires a contact, a known interest and a consent time, and dedupes contacts", () => {
    expect(migration0005).toContain("check (email is not null or whatsapp is not null)");
    expect(migration0005).toContain("interests <@ array['mapeo', 'seguimiento']::text[]");
    expect(migration0005).toContain("consented_at timestamptz not null");
    expect(migration0005).toContain("create unique index collaborators_email_key");
    expect(migration0005).toContain("create unique index collaborators_whatsapp_key");
  });
});

describe("Supabase migration: 0006_catalogue_revision_and_carmiol.sql", () => {
  const migration0006 = readFileSync(join(root, "supabase/migrations/0006_catalogue_revision_and_carmiol.sql"), "utf8");
  const [problemsSql, reportsRouteSql, unitsRouteSql] = migration0006.split(/alter table public\.\w+ drop constraint/).slice(1);
  const ids = (sql: string) => sql.match(/'([A-Za-z_]+)'/g)?.map((value) => value.replaceAll("'", "")) ?? [];

  it("allows every current problem plus the retired one, and nothing else", () => {
    expect(new Set(ids(problemsSql))).toEqual(new Set([...PROBLEMS, "no_paso_google_maps"]));
  });

  it("allows exactly the current routes on both reports and units", () => {
    expect(reportsRouteSql).toContain("reports_route_check");
    expect(unitsRouteSql).toContain("units_route_check");
    expect(new Set(ids(reportsRouteSql))).toEqual(new Set(ROUTES));
    expect(new Set(ids(unitsRouteSql))).toEqual(new Set(ROUTES));
  });
});

describe("Supabase migration: 0007_scope_duplicates_to_origin.sql", () => {
  const migration0007 = readFileSync(join(root, "supabase/migrations/0007_scope_duplicates_to_origin.sql"), "utf8");

  it("only matches duplicates from the same origin, keeping the 0002 signature and grants", () => {
    const duplicateCheck = migration0007.slice(migration0007.indexOf("select r.id into v_duplicate_id"));
    expect(duplicateCheck).toMatch(/^select r\.id into v_duplicate_id\s+from public\.reports r\s+where r\.abuse_key = input_abuse_key/);
    expect(migration0007).toContain("input_no_unit_window_start timestamptz\n)");
    expect(migration0007).toContain(
      "grant execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz) to service_role;",
    );
    expect(migration0007).toContain("revoke execute on function public.create_report(text, text, text[], text, text, timestamptz, timestamptz, timestamptz, int, timestamptz, timestamptz) from anon, authenticated;");
  });
});
