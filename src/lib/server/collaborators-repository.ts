import "server-only";
import { COLLABORATOR_RATE_LIMIT_MAX, type CollaboratorInput } from "../domain/collaborators";
import { createAbuseKey, getRateLimitStart, getRequestFingerprint, type RequestFingerprint } from "./report-security";
import { getSupabase } from "./reports-repository";

export type AddCollaboratorResult = { ok: true } | { ok: false; reason: "rate_limited" };

type MemoryCollaborator = CollaboratorInput & { consentedAt: Date; abuseKey: string | null };

const globalForCollaborators = globalThis as typeof globalThis & { sanPedroCollaborators?: MemoryCollaborator[] };

export function getMemoryCollaborators() {
  globalForCollaborators.sanPedroCollaborators ??= [];
  return globalForCollaborators.sanPedroCollaborators;
}

const UNIQUE_VIOLATION = "23505";

// A contact that's already on the list gets the same success response as a new
// one, so the endpoint can't be used to check whether someone signed up.
export async function addCollaborator(
  input: CollaboratorInput,
  fingerprint: RequestFingerprint | Request | null,
  now = new Date(),
): Promise<AddCollaboratorResult> {
  const requestFingerprint = fingerprint instanceof Request ? getRequestFingerprint(fingerprint) : fingerprint;
  const abuseKey = requestFingerprint ? createAbuseKey(requestFingerprint, "collaborators") : null;
  const rateLimitStart = getRateLimitStart(now);
  const supabase = getSupabase();

  if (!supabase) {
    const collaborators = getMemoryCollaborators();
    const recent = collaborators.filter((entry) => abuseKey && entry.abuseKey === abuseKey && entry.consentedAt >= rateLimitStart);
    if (recent.length >= COLLABORATOR_RATE_LIMIT_MAX) return { ok: false, reason: "rate_limited" };
    const exists = collaborators.some(
      (entry) => (input.email && entry.email === input.email) || (input.whatsapp && entry.whatsapp === input.whatsapp),
    );
    if (!exists) collaborators.push({ ...input, consentedAt: now, abuseKey });
    return { ok: true };
  }

  if (abuseKey) {
    const { count, error } = await supabase
      .from("collaborators")
      .select("id", { count: "exact", head: true })
      .eq("abuse_key", abuseKey)
      .gte("created_at", rateLimitStart.toISOString());
    if (error) throw error;
    if ((count ?? 0) >= COLLABORATOR_RATE_LIMIT_MAX) return { ok: false, reason: "rate_limited" };
  }

  const { error } = await supabase.from("collaborators").insert({
    email: input.email,
    whatsapp: input.whatsapp,
    interests: input.interests,
    consented_at: now.toISOString(),
    created_at: now.toISOString(),
    abuse_key: abuseKey,
  });
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
  return { ok: true };
}
