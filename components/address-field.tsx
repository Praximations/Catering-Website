"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircleIcon, ExternalIcon, MapPinIcon } from "./icons";
import { cx, inputClass } from "./ui";

interface Point {
  lat: number;
  lon: number;
  label: string;
}

type Lookup =
  | { state: "idle" }
  | { state: "looking" }
  | { state: "found"; point: Point }
  | { state: "missing" }
  | { state: "error"; message: string };

const MAP_ORIGIN = "https://www.openstreetmap.org";

function embed(point: Point): string {
  const lat = 0.006;
  const lon = lat * 1.6;
  const bbox = [point.lon - lon, point.lat - lat, point.lon + lon, point.lat + lat].map((v) => v.toFixed(5)).join(",");
  return `${MAP_ORIGIN}/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
}

/**
 * An address input with a live map under it.
 *
 * When the customer stops typing (or leaves the field), the address is looked
 * up through /api/geo and the map moves to it, so a wrong street shows up
 * before the order is placed rather than on the day. A lookup that fails is
 * said plainly and never blocks the form: the address text is what is saved,
 * and the business confirms every delivery anyway.
 *
 * Deliberately not autocomplete. The public geocoder does not allow it, and
 * suggesting addresses as somebody types is a lot of machinery for a field
 * people fill in once.
 */
export function AddressField({
  id,
  name,
  defaultValue,
  placeholder,
  invalid,
  describedBy,
  mapsEnabled,
  onValue,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  mapsEnabled: boolean;
  /** For a parent that remembers the draft. */
  onValue?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const lastQuery = useRef("");
  const timer = useRef<number | undefined>(undefined);

  // Kept in sync when the parent restores a value (an error round trip, a
  // draft, a saved address). Adjusted while rendering, not in an effect.
  const [lastDefault, setLastDefault] = useState(defaultValue);
  if (defaultValue !== lastDefault) {
    setLastDefault(defaultValue);
    setValue(defaultValue ?? "");
  }

  async function look(raw: string) {
    const query = raw.replace(/\s+/g, " ").trim();
    if (!mapsEnabled || query.length < 6 || query === lastQuery.current) return;
    lastQuery.current = query;
    setLookup({ state: "looking" });
    try {
      const response = await fetch("/api/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      // A newer lookup started while this one was in flight: let it win.
      if (lastQuery.current !== query) return;
      const data = (await response.json().catch(() => ({}))) as { result?: Point | null; error?: string };
      if (response.status === 429) setLookup({ state: "error", message: data.error ?? "Try again shortly." });
      else if (data.result) setLookup({ state: "found", point: data.result });
      else setLookup({ state: "missing" });
    } catch {
      if (lastQuery.current === query) setLookup({ state: "error", message: "The map is unavailable right now." });
    }
  }

  // Look up the address the field started with, so a restored draft shows its map.
  useEffect(() => {
    if (!defaultValue) return;
    const timer = window.setTimeout(() => void look(defaultValue), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPinIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          id={id}
          name={name}
          type="text"
          autoComplete="street-address"
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            onValue?.(next);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => void look(next), 1100);
          }}
          onBlur={() => {
            window.clearTimeout(timer.current);
            void look(value);
          }}
          className={cx(inputClass, "pl-10")}
        />
      </div>

      {/* The map's space is reserved from the start and every state renders
          inside it. Inserting it on blur moved the Place order button down
          mid-click, so a customer who typed the address and clicked straight
          away clicked nothing. */}
      {mapsEnabled ? (
        <div aria-live="polite" className="relative h-40 overflow-hidden rounded-xl border border-line bg-raised sm:h-48">
          {lookup.state === "found" ? (
            <>
              <iframe
                key={`${lookup.point.lat},${lookup.point.lon}`}
                title="Map of the address"
                src={embed(lookup.point)}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 size-full animate-fade-in border-0"
              />
              <p className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 truncate rounded-full bg-surface/95 px-3 py-1.5 text-xs text-ink-muted shadow-sm backdrop-blur">
                <CheckCircleIcon className="size-3.5 shrink-0 text-accent" />
                <span className="truncate">{lookup.point.label}</span>
                <a
                  href={`${MAP_ORIGIN}/?mlat=${lookup.point.lat}&mlon=${lookup.point.lon}#map=17/${lookup.point.lat}/${lookup.point.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex shrink-0 items-center gap-0.5 font-medium text-accent hover:underline"
                >
                  Open <ExternalIcon className="size-3" />
                </a>
              </p>
            </>
          ) : (
            <div className={cx("flex size-full flex-col items-center justify-center gap-2 px-6 text-center", lookup.state === "looking" && "animate-pulse")}>
              <MapPinIcon className="size-5 text-ink-subtle" />
              <p className="text-xs text-ink-subtle">
                {lookup.state === "looking"
                  ? "Finding it on the map"
                  : lookup.state === "missing"
                    ? "We could not place that on a map. That is fine: we confirm every delivery with you."
                    : lookup.state === "error"
                      ? lookup.message
                      : "The map follows the address as you type."}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
