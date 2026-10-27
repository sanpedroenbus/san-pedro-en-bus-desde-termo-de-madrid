import { NextResponse } from "next/server";
import { parseCollaboratorInput } from "@/lib/domain/collaborators";
import { addCollaborator } from "@/lib/server/collaborators-repository";
import { readBoundedJson } from "@/lib/server/request-json";

export async function POST(request: Request) {
  const body = await readBoundedJson(request);
  if (!body.ok) return NextResponse.json({ ok: false, reason: "invalid" }, { status: body.status });
  const parsed = parseCollaboratorInput(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  const result = await addCollaborator(parsed.data, request).catch((error: unknown) => {
    console.error("Failed to add collaborator", error);
    return { ok: false as const, reason: "server_error" as const };
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.reason === "rate_limited" ? 429 : 500 });
  }
  // Never echo the contact back: the response is the same for new and existing sign-ups.
  return NextResponse.json({ ok: true });
}
