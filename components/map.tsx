import { ExternalIcon, MapPinIcon } from "./icons";
import { cx } from "./ui";
import { geocode, mapEmbedUrl, mapLinkUrl, mapsEnabled, type GeoPoint } from "@/lib/geo";

/**
 * A live, pannable map of one point, in a rounded frame, with a link to open
 * it full size. The frame is an OpenStreetMap embed: no map library, no key,
 * and the CSP frames exactly that one origin.
 *
 * lazy loading, because a map below the fold should cost nothing until it is
 * scrolled to.
 */
export function MapFrame({
  point,
  title,
  className,
  height = "h-56",
}: {
  point: Pick<GeoPoint, "lat" | "lon">;
  title: string;
  className?: string;
  height?: string;
}) {
  return (
    <div className={cx("relative overflow-hidden rounded-xl border border-line bg-raised", height, className)}>
      <iframe
        title={title}
        src={mapEmbedUrl(point)}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full animate-fade-in border-0"
      />
      <a
        href={mapLinkUrl(point)}
        target="_blank"
        rel="noreferrer"
        className="absolute right-2 bottom-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/95 px-3 text-xs font-semibold text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
      >
        Open map <ExternalIcon className="size-3.5" />
      </a>
    </div>
  );
}

/**
 * A map for an address, looked up on the server. Renders nothing when maps
 * are off or the address cannot be placed: the address text beside it is
 * still the source of truth, and a wrong pin would be worse than no pin.
 */
export async function AddressMap({
  address,
  title,
  className,
  height,
}: {
  address: string;
  title?: string;
  className?: string;
  height?: string;
}) {
  if (!mapsEnabled || !address.trim()) return null;
  const point = await geocode(address);
  if (!point) {
    return (
      <p className={cx("flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-xs text-ink-subtle", className)}>
        <MapPinIcon className="size-4" />
        This address could not be placed on a map.
      </p>
    );
  }
  return <MapFrame point={point} title={title ?? `Map of ${address}`} className={className} height={height} />;
}
