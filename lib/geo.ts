import { business } from "./business";
import { siteUrl } from "./site";

/**
 * Turning an address into a point on a map.
 *
 * Provider-agnostic in the same way as lib/payments: a Geocoder is a label and
 * one function, and the default is OpenStreetMap's Nominatim, which needs no
 * key. Set GEOCODER_URL to point at any Nominatim-compatible service instead
 * (a self-hosted one, or a commercial host of the same API), or MAPS=off to
 * switch maps off entirely.
 *
 * THE LOOKUP HAPPENS ON THE SERVER. The customer's browser never talks to the
 * geocoder, so their IP address is not handed to it and the CSP needs no new
 * connect-src. What the browser does load is the map picture itself, an
 * OpenStreetMap iframe, which is why frame-src names exactly that one origin.
 *
 * FAIR USE. The public Nominatim asks for a real User-Agent, no bulk or
 * autocomplete use, and about one request a second. So lookups are made for a
 * finished address rather than per keystroke, every answer is cached for a
 * month, and /api/geo is rate limited per caller.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
  /** The geocoder's own name for the place, so a customer can see it matched. */
  label: string;
}

export interface Geocoder {
  id: string;
  label: string;
  geocode(query: string): Promise<GeoPoint | null>;
}

/** Maps are on unless explicitly switched off. */
export const mapsEnabled = process.env.MAPS !== "off";

export const MIN_QUERY = 6;
export const MAX_QUERY = 200;

/** Collapsed and trimmed, so "1  Main St " and "1 Main St" share a cache entry. */
export function normalizeQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
}

/** Whether a string is worth looking up at all. */
export function isLookupable(query: string): boolean {
  return query.length >= MIN_QUERY && /[a-z]/i.test(query);
}

/**
 * Reads the first result of a Nominatim search response. Exported for the
 * tests: the shape arriving from a third party is exactly what should not be
 * trusted, so a missing field or a non-numeric coordinate is a miss, not a NaN
 * on a map.
 */
export function parseNominatim(body: unknown): GeoPoint | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const first = body[0] as Record<string, unknown>;
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const label = typeof first.display_name === "string" ? first.display_name.slice(0, 200) : "";
  return { lat, lon, label };
}

const nominatim: Geocoder = {
  id: "nominatim",
  label: "OpenStreetMap",
  async geocode(query) {
    // ||, not ??: a blank GEOCODER_URL= copied from .env.example means "unset",
    // and ?? would keep the empty string and send every lookup nowhere.
    const base = (process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
    const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "0" });
    if (business.countryCodes) params.set("countrycodes", business.countryCodes);

    const response = await fetch(`${base}/search?${params}`, {
      headers: {
        // Nominatim's policy: identify the application, with a way to reach it.
        "User-Agent": `${business.name} catering site (${siteUrl()})`,
        Referer: siteUrl(),
        "Accept-Language": business.locale,
      },
      signal: AbortSignal.timeout(4000),
      // A month. An address does not move, and the cache is what keeps this
      // within the public service's fair-use limits.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) return null;
    return parseNominatim(await response.json().catch(() => null));
  },
};

export function activeGeocoder(): Geocoder | null {
  return mapsEnabled ? nominatim : null;
}

/**
 * Look an address up, or null. Never throws: a map is a nicety, and a
 * geocoder that is down must not break a checkout or an owner's page.
 */
export async function geocode(raw: string): Promise<GeoPoint | null> {
  const geocoder = activeGeocoder();
  const query = normalizeQuery(raw);
  if (!geocoder || !isLookupable(query)) return null;
  try {
    return await geocoder.geocode(query);
  } catch (error) {
    console.warn("[geo] lookup failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/* ------------------------------ the map picture ---------------------------- */

/** The only origin the page frames. security-headers.ts allows exactly this. */
export const MAP_EMBED_ORIGIN = "https://www.openstreetmap.org";

/**
 * An interactive map centred on a point, as an OpenStreetMap embed URL. The
 * box is a few streets across, which is close enough to recognise a building
 * and wide enough to see where it is.
 */
export function mapEmbedUrl(point: Pick<GeoPoint, "lat" | "lon">, span = 0.008): string {
  const lonSpan = span * 1.6;
  const bbox = [point.lon - lonSpan, point.lat - span, point.lon + lonSpan, point.lat + span]
    .map((value) => value.toFixed(5))
    .join(",");
  return `${MAP_EMBED_ORIGIN}/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
}

/** Where "Open in maps" goes: the same place, full size, in a new tab. */
export function mapLinkUrl(point: Pick<GeoPoint, "lat" | "lon">): string {
  return `${MAP_EMBED_ORIGIN}/?mlat=${point.lat.toFixed(5)}&mlon=${point.lon.toFixed(5)}#map=17/${point.lat.toFixed(5)}/${point.lon.toFixed(5)}`;
}

/** Directions from wherever the driver is, by address text, for any maps app. */
export function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
