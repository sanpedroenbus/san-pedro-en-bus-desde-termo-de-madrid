import { z } from "zod";

// Opt-in list of riders who want to be contacted to help with future work.
// Contact data is private: write-only from the app, readable only by project
// admins in Supabase (see migration 0005 and PRODUCT.md).
export const COLLABORATION_INTERESTS = ["mapeo", "seguimiento"] as const;
export type CollaborationInterest = (typeof COLLABORATION_INTERESTS)[number];

export const COLLABORATOR_RATE_LIMIT_MAX = 3;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COSTA_RICA_PREFIX = "+506";
const INTERNATIONAL_PATTERN = /^\+\d{8,15}$/;

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email) ? email : null;
}

// "8888-8888", "8888 8888", "506 88888888" and "+506 8888 8888" all become
// "+50688888888". Other countries need the leading "+".
export function normalizeWhatsapp(value: string): string | null {
  const compact = value.replace(/[\s().-]+/g, "");
  if (/^\d{8}$/.test(compact)) return COSTA_RICA_PREFIX + compact;
  if (/^506\d{8}$/.test(compact)) return `+${compact}`;
  return INTERNATIONAL_PATTERN.test(compact) ? compact : null;
}

const optionalContact = (normalize: (value: string) => string | null) =>
  z
    .string()
    .max(EMAIL_MAX_LENGTH)
    .optional()
    .transform((value, context) => {
      if (!value?.trim()) return null;
      const normalized = normalize(value);
      if (!normalized) context.addIssue({ code: "custom", message: "invalid_contact" });
      return normalized;
    });

export const collaboratorInputSchema = z
  .object({
    email: optionalContact(normalizeEmail),
    whatsapp: optionalContact(normalizeWhatsapp),
    interests: z.array(z.enum(COLLABORATION_INTERESTS)).min(1),
    consent: z.literal(true),
  })
  .refine((input) => input.email || input.whatsapp, { message: "missing_contact" })
  .transform((input) => ({ ...input, interests: [...new Set(input.interests)].sort() as CollaborationInterest[] }));

export type CollaboratorInput = z.infer<typeof collaboratorInputSchema>;

export function parseCollaboratorInput(input: unknown) {
  return collaboratorInputSchema.safeParse(input);
}
