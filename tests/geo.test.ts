import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLookupable, MAP_EMBED_ORIGIN, mapEmbedUrl, normalizeQuery, parseNominatim } from "@/lib/geo";

/**
 * The geocoder's answer comes from a third party and ends up as coordinates in
 * an iframe URL, so what is accepted from it is what is worth pinning.
 */

describe("normalizeQuery", () => {
  it("collapses and trims whitespace, so near-duplicates share a cache entry", () => {
    assert.equal(normalizeQuery("  10   Downing\tStreet \n London "), "10 Downing Street London");
  });

  it("caps the length", () => {
    assert.equal(normalizeQuery("a".repeat(500)).length, 200);
  });
});

describe("isLookupable", () => {
  it("wants a few characters and at least one letter", () => {
    assert.equal(isLookupable("10 Main St"), true);
    assert.equal(isLookupable("Main"), false);
    assert.equal(isLookupable("12345678"), false);
  });
});

describe("parseNominatim", () => {
  it("reads the first result", () => {
    assert.deepEqual(parseNominatim([{ lat: "51.5033", lon: "-0.1276", display_name: "10 Downing Street" }, { lat: "0", lon: "0" }]), {
      lat: 51.5033,
      lon: -0.1276,
      label: "10 Downing Street",
    });
  });

  it("is a miss, not a NaN on a map, for anything malformed", () => {
    for (const body of [null, {}, [], "[]", [{}], [{ lat: "north", lon: "1" }], [{ lat: "1" }], [{ lat: 91, lon: 0 }], [{ lat: 0, lon: 181 }]]) {
      assert.equal(parseNominatim(body), null, JSON.stringify(body));
    }
  });

  it("keeps the label a plain, bounded string", () => {
    assert.equal(parseNominatim([{ lat: 1, lon: 1, display_name: { html: "<b>" } }])?.label, "");
    assert.equal(parseNominatim([{ lat: 1, lon: 1, display_name: "x".repeat(900) }])?.label.length, 200);
  });
});

describe("mapEmbedUrl", () => {
  it("frames only the one origin the CSP allows", () => {
    const url = new URL(mapEmbedUrl({ lat: 51.5, lon: -0.12 }));
    assert.equal(url.origin, MAP_EMBED_ORIGIN);
  });

  it("puts the marker on the point, inside the box", () => {
    const url = new URL(mapEmbedUrl({ lat: 51.5, lon: -0.12 }));
    assert.equal(url.searchParams.get("marker"), "51.50000,-0.12000");
    const [west, south, east, north] = url.searchParams.get("bbox")!.split(",").map(Number);
    assert.ok(west! < -0.12 && east! > -0.12 && south! < 51.5 && north! > 51.5);
  });
});
