import { NextResponse, type NextRequest } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { geocode, isLookupable, MAX_QUERY, normalizeQuery } from "@/lib/geo";
import { bucketFor, checkRateLimit, GEOCODE_LIMIT } from "@/lib/rate-limit";

/**
 * Address to map point, for the address fields on checkout and the quote form.
 *
 * POST rather than GET so an address never sits in a URL, where it would land
 * in access logs and the browser history. The answer is cached per address
 * inside lib/geo.ts; this route adds the per-caller rate limit.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? normalizeQuery(body.query.slice(0, MAX_QUERY * 2)) : "";

  if (!isLookupable(query)) {
    return NextResponse.json({ result: null }, { status: 400 });
  }

  const limit = await checkRateLimit(bucketFor("geocode", await clientAddress()), GEOCODE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { result: null, error: "Too many lookups. The map will try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const result = await geocode(query);
  return NextResponse.json(
    { result },
    { status: result ? 200 : 404, headers: { "Cache-Control": "private, no-store" } }
  );
}
