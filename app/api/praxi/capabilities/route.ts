import type { NextRequest } from "next/server";
import { verifyControlKey } from "@/lib/controlKeys";
import { listPermissions } from "@/lib/permissions";

/**
 * DISCOVERY: what Praxi may do here, according to this site.
 *
 *   GET /api/praxi/capabilities
 *   Authorization: Bearer ck_live_...
 *
 * Praxi asks this instead of guessing. An assistant that knows in advance
 * which actions are off and which need approval can say "I can draft that
 * but I will need you to approve it" rather than trying and being refused,
 * which is a better conversation for the owner either way.
 *
 * The list is honest about everything, including capabilities set to off:
 * hiding them would only mean Praxi discovering the refusal by attempting
 * it. Nothing here reveals data, only what the doors are.
 */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = token ? await verifyControlKey(token) : null;
  if (!key) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await listPermissions();

  return Response.json(
    {
      site: "catering-web",
      key: { label: key.label, prefix: key.tokenPrefix },
      capabilities: permissions.map(({ capability, mode }) => ({
        id: capability.id,
        label: capability.label,
        description: capability.description,
        category: capability.category,
        risk: capability.risk,
        mode,
        // The three words Praxi actually needs to plan around.
        allowed: mode === "on",
        needs_approval: mode === "ask",
      })),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
