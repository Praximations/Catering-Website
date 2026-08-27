<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# catering-web

A catering website: public pages, a quote form, an online shop with a cart
and checkout, customer accounts, an owner dashboard, and an optional Praxi
connection. Built on 2026-08-26 on top of the original scaffold.

## Start here

Read `README.md` first, then `lib/business.ts`, `app/globals.css`, and
`app/layout.tsx`. Those four carry the whole configurable surface: who the
business is, the palette, and the type.

## What is settled

- Next.js 16.2.10 (App Router, webpack), React 19.2.4, TypeScript,
  Tailwind v4. Pinned to match `praximations-web-new`.
- **Zero runtime dependencies.** Auth, hashing, sessions, and storage are
  all built on the Node standard library. Do not add a dependency without
  asking; there is a reason this list is empty.
- Design tokens live in `app/globals.css` and reach Tailwind through
  `@theme inline`: `bg-page`, `text-ink-muted`, `border-line`,
  `font-display`, and `rounded-sm/md/lg`. Use those, never arbitrary hex.
- Business details live in `lib/business.ts`, ONE file, same idea as the
  tokens. No page hard-codes a name, a phone number, or a lead time. The
  menu is `lib/menu.ts`, the orderable catalog is `lib/shop.ts`.
- Scripts: `dev`, `build`, `typecheck`, `lint`. Verify with `typecheck`
  AND `build` before claiming something works.

## Auth, and the rules that must not be relaxed

- Two roles: `owner` sees every enquiry, `customer` sees only their own.
  The first account created becomes the owner unless `OWNER_EMAIL` says
  otherwise, and the sign up page says so while it is still true.
- Passwords: scrypt, salted, in `lib/passwords.ts`. Comparison is
  constant time. A password hash must never leave `lib/users.ts`; that is
  why `PublicUser` exists.
- Sessions: signed cookie, `lib/session.ts`. httpOnly, sameSite lax,
  secure in production.
- **Check authorization in the page AND in the action.** `requireUser` /
  `requireOwner` guard pages; every Server Action re-checks on its own. A
  Server Action is a public POST endpoint that can be called without the
  page ever being rendered. Never put the only check in a layout.
- `lib/enquiries.ts` builds the customer view field by field on purpose,
  so a new private field added to `EnquiryRecord` cannot reach a customer
  by default. Keep it that way rather than spreading and deleting.

## Next.js 16 specifics that bite

- `cookies()`, `headers()`, `params`, and `searchParams` are ASYNC. Await
  them. Synchronous access was removed in 16.
- Cookies can only be SET in a Server Action or a Route Handler, never
  while a Server Component renders.
- `useActionState` comes from `react`, and the action's signature is
  `(prevState, formData)`. `useFormStatus` comes from `react-dom`.
- `redirect()` throws, so call it OUTSIDE any try/catch.
- `revalidateTag` now needs a second argument.
- A folder named `_something` is a private folder and gets no route.
- `middleware.ts` is now `proxy.ts`. This app deliberately has neither.

## The shop, and rules it must not bend

- **Prices never come from the browser.** The cart cookie holds slugs and
  quantities; `lib/cart.ts` recomputes every total from the catalog. If
  you ever find a price arriving in a form field, that is a bug.
- **Money is an integer number of cents.** No floats, no strings, no
  decimals in the middle. `formatMoney` is the only place cents become
  readable text.
- **No card payment exists, and none may be faked.** Orders are placed,
  confirmed, then invoiced off the site.
- Order lines are SNAPSHOTTED onto the order (name, unit price), so
  changing the catalog never rewrites an order somebody already placed.
- `/orders/[token]` is public and addressed by an unguessable token, never
  by the order id or the reference number. Keep it that way.
- Checkout uses post, redirect, get. It must: an inline success state gets
  destroyed when clearing the cart re-renders `/cart` into its empty
  state, which reads to the customer as a lost order. This was a real bug,
  caught by a browser test, not a hypothetical.

## Praxi, inward: the permission layer

Praxi can ACT on this site, and what it may do is owner controlled at
/admin/praxi. The pieces:

    lib/capabilities.ts  the registry. Nothing outside it is reachable.
    lib/permissions.ts   off / ask / on per capability, plus the audit log
    lib/control.ts       THE GATE. Every request goes through it.
    lib/controlKeys.ts   ck_ keys, hashed, revocable
    app/api/praxi/*      the two endpoints Praxi calls

Rules that must not be relaxed:

- **Nothing bypasses `handleControlRequest`.** Its check order IS the
  security model: capability exists, arguments valid, not a replay, then
  permission, then run. Approval runs through `runCapability` too, so an
  approved action takes exactly the same path as an allowed one.
- **Log every attempt, including refusals.** A denial nobody can see
  cannot be reviewed, and "what did it try" is the first question asked.
- **Defaults live on the capability**, not in the stored map, which holds
  only deviations. A new capability then starts at its own default rather
  than inheriting a stale row.
- **Guardrails are separate from permission.** Permission answers "may
  you"; `lib/catalog.ts` answers "how far". Keep both.
- **Shape read results by hand.** Spreading a row is how a password hash
  or an owner's private note leaves the building.
- **Notes append, never replace.** An assistant must not be able to erase
  what the owner wrote.
- Praxi changes the catalog through an OVERRIDE layer; `lib/shop.ts` stays
  the source of what exists. It can reprice or hide, never create or
  delete.

## Praxi, outward

`lib/praxi.ts` mirrors customers, enquiries, and orders to Praxi as
canonical events. Rules:

- **Optional.** Unset `PRAXI_API_URL` or `PRAXI_SECRET_KEY` and it is a
  no-op. The dashboard says which state it is in rather than implying a
  connection.
- **Fail soft, always.** Four second timeout, errors swallowed and logged.
  Praxi must never be able to fail a checkout or a signup.
- **Await the calls.** Do not fire and forget: a serverless host can
  freeze the function the moment the response is sent, and a floating
  promise is simply lost.
- Praxi's order vocabulary is NOT ours. It has no "confirmed", so
  `CANONICAL_STATUS` maps ours onto its list and carries the exact local
  word in `data`. Inventing a status Praxi does not know gets rejected at
  its door.

## What is a placeholder

The palette, the two faces, the business details in `lib/business.ts`, and
the menu in `lib/menu.ts`. All of them are stand-ins and all of them say so
where a visitor can see it. Swap the values, keep the names.

## Storage

`lib/store.ts` is a JSON file, and it is temporary by design. It cannot
survive a serverless deployment (read-only filesystem, no shared disk).
Replacing it with a real database is a rewrite of that one module and
nothing else, because everything goes through `readData` / `updateData`.

## House conventions

- NO em dashes and NO en dashes, anywhere: copy, comments, commit
  messages. Use commas, periods, or a middot. Standing rule across Ari's
  repos.
- Comments explain WHY, not what. Match the surrounding density.
- Be honest in the UI. An empty state says it is empty; it never shows a
  fake number. "No data" and "zero" are different things, and the
  dashboard counts prove it.

## Running it

    npm run dev -- --port 3100

Port 3000 belongs to `praximations-web-new`, which is often running.

## Repo status

Local git only, NO REMOTE yet. Ari plans to give this its own GitHub repo.
Do not create or push a remote without being asked.
