<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# catering-web

A catering website. Scaffolded on 2026-08-26 and NOT yet designed. If the
homepage still says "The ground is ready", nothing has been built here.

## Start here

Read `README.md` first, then `app/globals.css` and `app/layout.tsx`. That
is the entire design system: the palette and the two typefaces. Nothing
else hard-codes a colour or a font.

## What is settled

- Next.js 16.2.10 (App Router, webpack), React 19.2.4, TypeScript,
  Tailwind v4. Pinned deliberately to match `praximations-web-new`, so
  patterns move between the two repos without translation.
- Design tokens live in `app/globals.css` and reach Tailwind through
  `@theme inline`, so `bg-page`, `text-ink-muted`, `border-line`, and
  `font-display` are ordinary utilities. Use those. Do not write
  arbitrary hex values into markup.
- Scripts: `dev`, `build`, `typecheck`, `lint`. Verify with `typecheck`
  AND `build` before claiming something works.

## What is a placeholder

The palette (warm paper, charcoal, one earth accent) and the faces
(Fraunces for display, Inter for text) are stand-ins, chosen to be quiet
so the site reads as undecided. They are expected to be replaced. Swap
the values and keep the token names, and the whole site follows.

## What is NOT decided

Whose catering this is, what it sells, how someone books it, and whether
it needs a CMS, a booking flow, or only static pages. Do not invent
answers to these. Ask.

## House conventions

- NO em dashes and NO en dashes, anywhere: copy, comments, commit
  messages. Use commas, periods, or a middot. This is a standing rule
  across Ari's repos.
- Comments explain WHY, not what. Match the surrounding density.
- Be honest in the UI. An empty state says it is empty; it never shows a
  fake number. "No data" and "zero" are different things.

## Running it

    npm run dev -- --port 3100

Port 3000 belongs to `praximations-web-new`, which is often running.

## Repo status

Local git only, two commits, NO REMOTE yet. Ari plans to give this its
own GitHub repo. Do not create or push a remote without being asked.
