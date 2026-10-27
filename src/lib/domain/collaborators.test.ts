import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeWhatsapp, parseCollaboratorInput } from "./collaborators";

describe("normalizeEmail", () => {
  it("trims and lowercases a valid address", () => {
    expect(normalizeEmail("  Ana@Ejemplo.CR ")).toBe("ana@ejemplo.cr");
  });

  it("rejects malformed or over-long addresses", () => {
    expect(normalizeEmail("ana@")).toBeNull();
    expect(normalizeEmail("ana ejemplo.cr")).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@x.cr`)).toBeNull();
  });
});

describe("normalizeWhatsapp", () => {
  it("turns any Costa Rican format into +506 and 8 digits", () => {
    expect(normalizeWhatsapp("8888-8888")).toBe("+50688888888");
    expect(normalizeWhatsapp("8888 8888")).toBe("+50688888888");
    expect(normalizeWhatsapp("506 8888 8888")).toBe("+50688888888");
    expect(normalizeWhatsapp("+506 (8888) 8888")).toBe("+50688888888");
  });

  it("accepts other countries only with a leading +", () => {
    expect(normalizeWhatsapp("+34 600 123 456")).toBe("+34600123456");
    expect(normalizeWhatsapp("34600123456")).toBeNull();
  });

  it("rejects too-short numbers and letters", () => {
    expect(normalizeWhatsapp("1234")).toBeNull();
    expect(normalizeWhatsapp("+1234567")).toBeNull();
    expect(normalizeWhatsapp("ocho ocho")).toBeNull();
  });
});

describe("parseCollaboratorInput", () => {
  const valid = { email: "ana@ejemplo.cr", interests: ["seguimiento"], consent: true };

  it("accepts an email-only or WhatsApp-only opt-in and normalizes both", () => {
    expect(parseCollaboratorInput(valid).data).toEqual({ ...valid, whatsapp: null });
    expect(parseCollaboratorInput({ whatsapp: "8888-8888", interests: ["mapeo"], consent: true }).data).toEqual({
      email: null,
      whatsapp: "+50688888888",
      interests: ["mapeo"],
      consent: true,
    });
  });

  it("dedupes and sorts interests", () => {
    expect(parseCollaboratorInput({ ...valid, interests: ["seguimiento", "mapeo", "mapeo"] }).data?.interests).toEqual([
      "mapeo",
      "seguimiento",
    ]);
  });

  it("requires at least one contact, at least one known interest, and explicit consent", () => {
    expect(parseCollaboratorInput({ ...valid, email: "" }).success).toBe(false);
    expect(parseCollaboratorInput({ ...valid, interests: [] }).success).toBe(false);
    expect(parseCollaboratorInput({ ...valid, interests: ["spam"] }).success).toBe(false);
    expect(parseCollaboratorInput({ ...valid, consent: false }).success).toBe(false);
    expect(parseCollaboratorInput({ email: "ana@ejemplo.cr", interests: ["mapeo"] }).success).toBe(false);
  });

  it("rejects a contact that is filled in but invalid, even if the other one is valid", () => {
    expect(parseCollaboratorInput({ ...valid, whatsapp: "123" }).success).toBe(false);
  });
});
