# catering-web

A catering website. Scaffolded, not yet designed.

## Running it

    npm run dev        # http://localhost:3000
    npm run build
    npm run typecheck
    npm run lint

Port 3000 collides with praximations-web-new. Run this on another port
while both are up:

    npm run dev -- --port 3100

## Stack

Next.js 16.2.10 (App Router, webpack), React 19.2.4, TypeScript, Tailwind
v4. Deliberately the same versions as praximations-web-new, so anything
learned in one repo transfers to the other.

## Where the design lives

Two files carry the whole look, and everything else refers to them rather
than hard-coding anything:

    app/globals.css   the palette, as tokens, plus radii
    app/layout.tsx    the two typefaces

Both are PLACEHOLDERS. The palette is warm paper and charcoal with a
single earth accent; the faces are Fraunces for display and Inter for
text. They are quiet on purpose, so the site reads as unfinished rather
than as a brand nobody chose. Swap the values, keep the names, and the
site follows.

Tokens are handed to Tailwind through `@theme inline`, so `bg-page`,
`text-ink-muted`, `border-line`, and `font-display` exist as ordinary
utilities.

## Not decided yet

Whose catering this is, what it sells, how someone books it, and whether
it needs a CMS, a booking flow, or just pages. Nothing here assumes an
answer.
