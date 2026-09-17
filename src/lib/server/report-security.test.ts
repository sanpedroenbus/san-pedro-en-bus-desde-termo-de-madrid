import { afterEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_WINDOW_MINUTES, UNDO_WINDOW_SECONDS } from "../domain/reports";
import {
  createAbuseKey,
  createUndoToken,
  getRateLimitStart,
  getRequestFingerprint,
  getUndoExpiresAt,
  hashUndoToken,
  RATE_LIMIT_WINDOW_MS,
  shouldRequirePersistentStore,
  UNDO_WINDOW_MS,
  verifyUndoToken,
} from "./report-security";

describe("report security helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("shouldRequirePersistentStore", () => {
    it("does not require persistence by default (local/test environments)", () => {
      expect(shouldRequirePersistentStore()).toBe(false);
    });

    it("requires persistence when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(shouldRequirePersistentStore()).toBe(true);
    });

    it("requires persistence when deployed on Vercel", () => {
      vi.stubEnv("VERCEL", "1");
      expect(shouldRequirePersistentStore()).toBe(true);
    });

    it("requires persistence when explicitly opted in via TERMO_REQUIRE_SUPABASE", () => {
      vi.stubEnv("TERMO_REQUIRE_SUPABASE", "1");
      expect(shouldRequirePersistentStore()).toBe(true);
    });

    it("lets TERMO_ALLOW_MEMORY_STORE override every other production-like signal", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VERCEL", "1");
      vi.stubEnv("TERMO_REQUIRE_SUPABASE", "1");
      vi.stubEnv("TERMO_ALLOW_MEMORY_STORE", "1");

      expect(shouldRequirePersistentStore()).toBe(false);
    });
  });

  describe("abuse key derivation", () => {
    it("derives a stable private abuse key without exposing raw request data", () => {
      const fingerprint = { ip: "203.0.113.8", userAgent: "test-browser" };

      const key = createAbuseKey(fingerprint);
      expect(key).toBe(createAbuseKey(fingerprint));
      expect(key).not.toContain(fingerprint.ip);
      expect(key).not.toContain(fingerprint.userAgent);
      // sha256 hex digest.
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces different keys for different origins", () => {
      const a = createAbuseKey({ ip: "203.0.113.8", userAgent: "browser-a" });
      const b = createAbuseKey({ ip: "203.0.113.9", userAgent: "browser-a" });
      const c = createAbuseKey({ ip: "203.0.113.8", userAgent: "browser-b" });

      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
    });

    it("extracts a request fingerprint from forwarding headers, preferring the first forwarded IP", () => {
      const request = new Request("https://sanpedro.test/api/reports", {
        headers: {
          "x-forwarded-for": "198.51.100.4, 10.0.0.1",
          "user-agent": "playwright",
        },
      });

      expect(getRequestFingerprint(request)).toEqual({
        ip: "198.51.100.4",
        userAgent: "playwright",
      });
    });

    it("falls back to x-real-ip and then a local marker when no forwarding headers are present", () => {
      const withRealIp = new Request("https://sanpedro.test/api/reports", {
        headers: { "x-real-ip": "192.0.2.1" },
      });
      const withNoHeaders = new Request("https://sanpedro.test/api/reports");

      expect(getRequestFingerprint(withRealIp).ip).toBe("192.0.2.1");
      expect(getRequestFingerprint(withNoHeaders).ip).toBe("local");
      expect(getRequestFingerprint(withNoHeaders).userAgent).toBe("unknown");
    });
  });

  describe("undo tokens", () => {
    it("creates undo tokens that are unpredictable and hash to a value distinct from the token", () => {
      const first = createUndoToken();
      const second = createUndoToken();

      expect(first).not.toBe(second);
      expect(hashUndoToken(first)).not.toBe(first);
    });

    it("verifies a correct token against its hash and rejects incorrect ones", () => {
      const token = createUndoToken();
      const hash = hashUndoToken(token);

      expect(verifyUndoToken(token, hash)).toBe(true);
      expect(verifyUndoToken("wrong-token", hash)).toBe(false);
    });

    it("rejects verification when either the token or the stored hash is missing", () => {
      const hash = hashUndoToken(createUndoToken());
      expect(verifyUndoToken("", hash)).toBe(false);
      expect(verifyUndoToken("some-token", null)).toBe(false);
      expect(verifyUndoToken("some-token", undefined)).toBe(false);
    });

    it("safely rejects a stored hash of a different length instead of throwing (timing-safe comparison guard)", () => {
      const token = createUndoToken();
      expect(verifyUndoToken(token, "deadbeef")).toBe(false);
    });
  });

  describe("security windows", () => {
    it("computes the rate limit window start using the domain's configured window length", () => {
      const now = new Date("2026-07-05T12:00:00Z");
      expect(RATE_LIMIT_WINDOW_MS).toBe(RATE_LIMIT_WINDOW_MINUTES * 60_000);
      expect(getRateLimitStart(now)).toEqual(new Date(now.getTime() - RATE_LIMIT_WINDOW_MS));
    });

    it("computes the undo expiry using the domain's configured undo window", () => {
      const now = new Date("2026-07-05T12:00:00Z");
      expect(UNDO_WINDOW_MS).toBe(UNDO_WINDOW_SECONDS * 1_000);
      expect(getUndoExpiresAt(now)).toEqual(new Date(now.getTime() + UNDO_WINDOW_MS));
    });
  });
});
