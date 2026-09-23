/** Shaped like the account pages, so nothing jumps when the data arrives. */
export default function Loading() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading
      </p>
      <div aria-hidden className="animate-pulse space-y-3">
        <div className="h-40 rounded-xl bg-surface shadow-xs" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-xl bg-surface shadow-xs" />
          <div className="h-24 rounded-xl bg-surface shadow-xs" />
          <div className="h-24 rounded-xl bg-surface shadow-xs" />
        </div>
        <div className="h-32 rounded-xl bg-surface shadow-xs" />
      </div>
    </>
  );
}
