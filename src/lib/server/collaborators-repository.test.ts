import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COLLABORATOR_RATE_LIMIT_MAX, type CollaboratorInput } from "@/lib/domain/collaborators";

const supabaseMock = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("./reports-repository", () => ({ getSupabase: () => supabaseMock.client }));

const { addCollaborator, getMemoryCollaborators } = await import("./collaborators-repository");

function input(partial: Partial<CollaboratorInput> = {}): CollaboratorInput {
  return { email: "ana@ejemplo.cr", whatsapp: null, interests: ["seguimiento"], consent: true, ...partial };
}

const fingerprint = { ip: "203.0.113.50" };
const now = new Date("2026-10-27T12:00:00Z");

describe("collaborators-repository", () => {
  beforeEach(() => {
    vi.stubEnv("TERMO_ABUSE_SECRET", "test-abuse-secret");
    (globalThis as { sanPedroCollaborators?: unknown }).sanPedroCollaborators = [];
    supabaseMock.client = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("memory store", () => {
    it("stores a new contact once, and answers a repeat sign-up the same way without duplicating it", async () => {
      expect(await addCollaborator(input(), fingerprint, now)).toEqual({ ok: true });
      expect(await addCollaborator(input({ interests: ["mapeo"] }), { ip: "203.0.113.51" }, now)).toEqual({ ok: true });

      expect(getMemoryCollaborators()).toHaveLength(1);
      expect(getMemoryCollaborators()[0]).toMatchObject({ email: "ana@ejemplo.cr", consentedAt: now });
    });

    it(`rate-limits an origin after ${COLLABORATOR_RATE_LIMIT_MAX} new sign-ups in the window`, async () => {
      for (let index = 0; index < COLLABORATOR_RATE_LIMIT_MAX; index += 1) {
        expect(await addCollaborator(input({ email: `persona${index}@ejemplo.cr` }), fingerprint, now)).toEqual({ ok: true });
      }
      expect(await addCollaborator(input({ email: "otra@ejemplo.cr" }), fingerprint, now)).toEqual({
        ok: false,
        reason: "rate_limited",
      });
      expect(await addCollaborator(input({ email: "otra@ejemplo.cr" }), { ip: "203.0.113.52" }, now)).toEqual({ ok: true });
    });
  });

  describe("supabase", () => {
    function fakeClient({ recentCount = 0, insertError = null as { code: string } | null } = {}) {
      const insert = vi.fn().mockResolvedValue({ error: insertError });
      const countQuery = { eq: () => countQuery, gte: () => Promise.resolve({ count: recentCount, error: null }) };
      const from = vi.fn(() => ({ select: () => countQuery, insert }));
      return { client: { from }, insert };
    }

    it("inserts the normalized contact with consent time and a private abuse key, never the raw IP", async () => {
      const { client, insert } = fakeClient();
      supabaseMock.client = client;

      expect(await addCollaborator(input({ whatsapp: "+50688888888" }), fingerprint, now)).toEqual({ ok: true });
      const row = insert.mock.calls[0][0];
      expect(row).toMatchObject({
        email: "ana@ejemplo.cr",
        whatsapp: "+50688888888",
        interests: ["seguimiento"],
        consented_at: now.toISOString(),
      });
      expect(row.abuse_key).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(row)).not.toContain(fingerprint.ip);
      // Not the same key the reports table stores for this origin.
      const { createAbuseKey } = await import("./report-security");
      expect(row.abuse_key).not.toBe(createAbuseKey(fingerprint));
    });

    it("treats an already-registered contact (unique violation) as success", async () => {
      supabaseMock.client = fakeClient({ insertError: { code: "23505" } }).client;
      expect(await addCollaborator(input(), fingerprint, now)).toEqual({ ok: true });
    });

    it("rate-limits before inserting, and surfaces other database errors", async () => {
      const limited = fakeClient({ recentCount: COLLABORATOR_RATE_LIMIT_MAX });
      supabaseMock.client = limited.client;
      expect(await addCollaborator(input(), fingerprint, now)).toEqual({ ok: false, reason: "rate_limited" });
      expect(limited.insert).not.toHaveBeenCalled();

      supabaseMock.client = fakeClient({ insertError: { code: "23514" } }).client;
      await expect(addCollaborator(input(), fingerprint, now)).rejects.toEqual({ code: "23514" });
    });
  });
});
