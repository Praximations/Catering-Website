/**
 * The starting point, deliberately almost empty.
 *
 * What belongs here is the real site: who the catering is for, what they
 * cook, how someone books them. None of that is decided yet, so rather
 * than leave a framework demo pretending to be a homepage, this says
 * plainly that the ground is prepared and nothing has been built on it.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
        Catering
      </p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
        The ground is ready.
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
        Next.js, TypeScript, and Tailwind are set up and the token layer is
        wired, so the palette and type can be swapped from one file. Nothing
        about the business is assumed yet.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <span className="rounded-[--radius-sm] border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted">
          app/globals.css sets the palette
        </span>
        <span className="rounded-[--radius-sm] border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted">
          app/layout.tsx sets the type
        </span>
      </div>
    </main>
  );
}
