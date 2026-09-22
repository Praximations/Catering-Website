# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# catering-web

A catering website: public pages, a quote form, an online shop with a cart
and checkout, customer accounts, an owner dashboard, and an optional Praxi
connection.

## Start here

Read `README.md` first, then `lib/business.ts`, `app/globals.css`, and
`app/layout.tsx`. Those four carry the whole configurable surface: who the
business is, the palette, and the type.

Then read `lib/db/store.ts`. It is the storage contract, and every data
module in `lib/` is written against it.

## What is settled

- Next.js 16.3.5 (App Router, webpack), React 19.2.4, TypeScript,
  Tailwind v4.
- **Zero third-party RUNTIME dependencies.** Auth, hashing, sessions,
  Postgres over PostgREST, and payment providers use the platform and the
  Node standard library. `@supabase/ssr` is the one exception and only for
  the Google sign in handshake.
- **Tests and CI are dev-only and carry no dependency either.** Node 22
  strips types and runs tests on its own, so `npm test` needs no
  transpiler. See "Running it".
- Design tokens live in `app/globals.css` and reach Tailwind through
  `@theme inline`: `bg-page`, `text-ink-muted`, `border-line`,
  `font-display`, and `rounded-sm/md/lg`. The public palette is white,
  botanical green, and one warm food accent. Use the tokens, never arbitrary hex.
- Business details live in `lib/business.ts`, ONE file, same idea as the
  tokens. No page hard-codes a name, a phone number, a lead time, or a
  currency. The menu is `lib/menu.ts`, the orderable catalog is `lib/shop.ts`.
- Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `verify`. Run
  `npm run verify` before claiming something works. It runs all four in the
  order that localizes a failure fastest.

## TypeScript syntax this project cannot use

`npm test` works by having Node STRIP types rather than compile them, which
is what keeps a transpiler out of the dev dependencies. Syntax that has to
be compiled away is therefore a runtime error, not a style question:

    class C { constructor(readonly x: number) {} }   parameter property
    enum Status { New }                              needs a runtime object
    namespace Foo {}                                 needs a runtime object

`npm run lint` rejects all three with a message saying why, so this is
caught before a confusing test failure. Use a union of string literals plus
a `const` array where you would reach for an enum; that is what
`ORDER_STATUSES` and `PERMISSION_MODES` are.

## Storage

`lib/db` is one narrow contract with two adapters:

    lib/db/types.ts            the row types, one per table
    lib/db/store.ts            THE CONTRACT, and the table registry
    lib/db/query.ts            the query vocabulary both adapters speak
    lib/db/postgrest.ts        Supabase over its REST endpoint
    lib/db/postgrest-filter.ts the injection surface, isolated on purpose
    lib/db/json.ts             a local JSON file, so dev needs no setup
    lib/db/naming.ts           camelCase here, snake_case in Postgres

Rules that must not be relaxed:

- **Anything the contract cannot express belongs in `supabase/schema.sql`**
  as a view or a function, where Postgres can plan it. Do not grow an ORM
  in `lib/db`. Grouped counts are views; the order write is a function.
- **`insertIfAbsent` is how uniqueness is enforced. THE INSERT IS THE LOCK.**
  Never look first and then write: two concurrent callers both pass the
  look. A null return means somebody else won, which is an answer, not an
  error.
- **`update` returns the rows it changed, and that is the point.** Put the
  state check in the WHERE and a conditional update becomes one atomic
  statement. `markOrderPaid`, `approveRequest` and `revokeControlKey` all
  depend on this. An empty result means the condition did not hold.
- **Callers speak camelCase.** The adapter converts. Do not send both
  spellings to be safe; that once put `eventDate` AND `event_date` on every
  stored order.
- **`lib/db/postgrest-filter.ts` double-quotes every value, always.** That
  file is the one place an application value is spliced into a string a
  server parses, and PostgREST treats `, . : ( )` and `"` as syntax. A rule
  that only fires on suspicious input is a rule with an exception to find.
- The local JSON adapter exists to make the site RUNNABLE, not to be a
  database. It imitates generated columns, `updated_at`, and unique
  constraints. It does not imitate concurrency, and `lib/db/index.ts`
  refuses to let it run on Vercel, where each instance would get its own
  discarded copy.

Run `supabase/schema.sql` in the Supabase SQL editor. It is idempotent.
`scripts/migrate-from-blob.mjs` moves a database out of the old
single-jsonb-document layout; it has `--dry-run` and `--print-json`, and it
never deletes the source.

## Auth, and the rules that must not be relaxed

- Two roles: `owner` sees every enquiry, `customer` sees only their own.
  The first account created becomes the owner unless `OWNER_EMAIL` says
  otherwise, and the sign up page says so while it is still true.
- Passwords: scrypt, salted, in `lib/passwords.ts`. Comparison is
  constant time. A password hash must never leave `lib/users.ts`; that is
  why `PublicUser` exists. `authenticate` hashes even when there is no such
  account, so response time does not reveal which addresses exist.
- Sessions: signed cookie, `lib/session-token.ts` for the format and
  `lib/session.ts` for the request handling. httpOnly, sameSite lax,
  secure in production.
- **A session is revoked by moving the account's epoch, not by deleting a
  cookie.** A signed cookie cannot be recalled once issued, so deleting it
  only clears that one browser. `users.sessionEpoch` is baked into the
  cookie and compared on every request; `revokeSessions` bumps it and every
  cookie for that account fails at once.
- **Check authorization in the page AND in the action.** `requireUser` /
  `requireOwner` guard pages; every Server Action re-checks on its own. A
  Server Action is a public POST endpoint that can be called without the
  page ever being rendered. Never put the only check in a layout, and never
  in `proxy.ts`.
- **An id in a form field is a request, not proof of ownership.** Check it
  belongs to the caller. `orderBelongsToUser` exists for this.
- **The OAuth callback requires a VERIFIED email.** `findOrCreateGoogleUser`
  matches an existing account by address, so an unverified address would be
  enough to take over the account owning it, and the first account is the
  owner. Supabase happens to verify Google addresses; that is not a security
  property, and a second provider added later would inherit the hole.
- `lib/enquiries.ts` and `lib/orders.ts` build the customer view field by
  field on purpose, so a new private field added to the record cannot reach
  a customer by default. Keep it that way rather than spreading and deleting.

## Input, and rate limiting

- **`lib/validation.ts` owns reading FormData.** `text()` REQUIRES a
  maximum, because a field read without one is an unbounded write. Use
  `choice()` against the real set rather than casting; a cast is a claim
  about a value an attacker chose.
- **Rate limits are stored, never in a Map.** An in-process counter gives
  each serverless instance its own allowance, so the real limit is the
  configured one times however many are warm. `lib/rate-limit.ts` counts
  rows in a window, hashes identifiers into bucket names, and fails OPEN so
  a storage blip cannot lock everyone out of signing in.
- Sign in uses two buckets, per address and per caller, because either
  alone has a hole. See the comment in `app/actions/auth.ts`.
- `lib/client-address.ts` is for rate limiting and nothing else. Read the
  caveat in it before using it anywhere near authorization.

## Security headers

`lib/security-headers.ts` holds the policy, `next.config.ts` sends the
request-independent headers, and `proxy.ts` sends the CSP.

- **`proxy.ts` exists ONLY to set the CSP header**, because the policy
  carries a per-request nonce and a `next.config` header is static. It must
  never do authorization; see the rule above.
- **script-src has no `'unsafe-inline'` that matters.** A nonce is always
  present, which makes browsers ignore the `'unsafe-inline'` and `https:`
  fallbacks. If the nonce ever stops being emitted, those fallbacks become
  the policy, which is no policy at all.
- style-src DOES allow `'unsafe-inline'`, deliberately: Next injects inline
  styles for the font loader, and an injected style can only restyle the
  page where an injected script runs as the site.
- `Referrer-Policy` is `strict-origin-when-cross-origin` because
  `/orders/<token>` is reachable without an account, so that path is a
  credential and a full-path referrer would hand it away.

## The public pages, and how they should read

The site is for somebody booking catering, so every public page answers
their questions in order: what do you do, can you do it for me, what does
it cost, how do I book. Rules:

- **No template tells.** No tracked all-caps label above a heading, no
  italic "accent" phrase inside a headline, no "01 / 02 / 03" decoration,
  no marketing caption laid over a photo, no card inside a card, no
  hover-lift on buttons. `tests/conventions.test.ts` rejects the eyebrow
  label and one-off radii on public pages, and any hex colour in a class.
  The owner's screens under `app/admin` keep a quiet context label.
- **Radii are the tokens**, `rounded-sm/md/lg`, which are deliberately
  tight. Buttons are `buttonClass` / `secondaryButtonClass` /
  `textLinkClass` from `components/ui.tsx`.
- **Headline numbers are derived, never typed.** "From 8 people", "from
  $18.00 a guest" and the sandwich minimum come from `lib/facts.ts`, which
  reads `lib/shop.ts` and `lib/menu.ts`. A price in copy that disagrees with
  the basket reads as bait and switch.
- **Dietary labels come from `lib/dietary.ts`** and render with
  `DietaryMarks` beside the dish plus a `DietaryLegend` on the page.
  "Vegetarian" and "vegetarian on request" are different promises and render
  differently.
- **The FAQ states only what the site actually does.** No cancellation
  window, delivery fee or refund promise until the business sets one. Any
  answer about paying online is conditional on `isPaymentConfigured`.
- **Never name a payment provider in `app/`.** Use `activeProvider().label`.
- **The event menus are quoted, not sold online.** `/menu` links to
  `/contact?subject=...`, never to `/shop`, because the shop does not sell
  those dishes. The contact page prefills the subject, capped at
  `LIMITS.subject`.
- **The phone number is in the header.** People book caterers by phone.
- On a phone the food photo comes first on the home page, and `/shop` shows
  a bottom order bar below `xl`, where the basket sidebar is hidden.

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
- `middleware.ts` is now `proxy.ts`.
- `next dev` writes its own block into `AGENTS.md`. `agentRules: false` in
  `next.config.ts` turns that off, because this file is hand written.
- `tsconfig.json` includes `.next/types`, so deleting a route leaves stale
  generated types and `npm run typecheck` fails until `.next` is removed.

## The shop, and rules it must not bend

- **Prices never come from the browser.** The cart cookie holds slugs and
  quantities; `lib/cart.ts` recomputes every total from the catalog. If
  you ever find a price arriving in a form field, that is a bug.
- **Money is an integer number of minor units.** No floats, no strings, no
  decimals in the middle. `formatMoney` is the only place they become
  readable text, and it takes a currency because an ORDER carries its own.
- **The currency is stored ON each order.** Changing `lib/business.ts` must
  not reinterpret what somebody already paid.
- Order lines are SNAPSHOTTED onto the order (name, unit price), so
  changing the catalog never rewrites an order somebody already placed. The
  order and its lines are written by the `place_order` function, in one
  transaction, because an order whose lines failed to insert shows the
  customer a total with nothing in it.
- Order references come from a Postgres sequence. They used to be
  `orders.length + 1`, which gave two simultaneous orders the same one.
- `/orders/[token]` is public and addressed by an unguessable token, never
  by the order id or the reference number. Keep it that way, and keep it
  out of `sitemap.ts`.
- Checkout uses post, redirect, get. It must: an inline success state gets
  destroyed when clearing the cart re-renders `/cart` into its empty
  state, which reads to the customer as a lost order. This was a real bug,
  caught by a browser test, not a hypothetical.

## Payments

`lib/payments` is provider-agnostic. Adding PayPal or Square is a new file
implementing `PaymentProvider` plus one line in `PROVIDERS`. Nothing in
`app/` names a provider.

    lib/payments/types.ts   the interface, and the rules a provider owes
    lib/payments/index.ts   the registry and THE SHARED WEBHOOK PIPELINE
    lib/payments/stripe.ts  the first implementation

Rules that must not be relaxed:

- **The webhook, not the success redirect, is the authority on payment.** A
  customer can open the success URL without paying and can close the tab
  after paying.
- **The order is the authority on the AMOUNT.** The pipeline compares what
  the provider reports against the stored order and refuses a mismatch
  rather than marking it paid. Never take the amount from the event.
- **The event id is claimed by INSERT before anything is applied.** That is
  what makes a redelivery, a replay inside the signature's tolerance, and
  two instances handed one event all safe.
- **Pin the provider's API version.** Without it a response shape can change
  under a deployment nobody touched.
- Orders are saved BEFORE payment, and payment is optional: unset the keys
  and the site works without it.

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
  The log is its own table and is NOT trimmed; it used to be capped at 500
  rows inside the old JSON document, which discarded it in minutes.
- **Replay protection lives in its own table, scoped per control key.** It
  used to search the audit log, so trimming that log silently re-enabled
  replayed writes. A key is claimed by insert, and RELEASED when the action
  failed before changing anything, so a transient error is not a permanent
  refusal.
- **Defaults live on the capability**, not in the stored table, which holds
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

## Tests

`tests/` runs on `node:test`. `tests/support/resolver.mjs` teaches Node's
ESM resolver about extensionless imports and the `@/` alias so test files
import the app's modules the way the app does.

What is worth testing here, and why those things:

- The **PostgREST filter encoder**, because it is the injection surface.
- The **session cookie format**, because it stands between a forged cookie
  and a signed-in session. This is why `lib/session-token.ts` is separate
  from `lib/session.ts`: the latter imports `next/headers`, which only
  resolves inside Next's runtime.
- The **webhook pipeline**, including three concurrent deliveries of one
  event, because "exactly one of these marks the order paid" is the claim.
- The **signature check**, including a non-hex signature, which used to
  make `timingSafeEqual` throw and return a 500 instead of a refusal.
- **Validation**, because the caps are a security control.

`npm run smoke` is a separate browser pass over a running server, for the
four claims that cannot be checked without one: checkout's post, redirect,
get; that the CSP blocks an injection AND leaves hydration working; that
signing out everywhere reaches a second browser; and that an order token is
the only route in. Playwright is deliberately not a dependency, so it is
installed separately and `npm run verify` does not run it.

A test that writes files puts them under `.test-tmp/`, which is gitignored.
Do not use `os.tmpdir()`: a sandboxed runner may redirect it into the
working tree, and a test that leaks files there gets committed by accident.

## What is a placeholder

The two faces, the business details in `lib/business.ts`, and the menu in
`lib/menu.ts`. All of them are stand-ins and all of them say so where a
visitor can see it. Swap the values, keep the names.

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
    npm run verify                 typecheck, lint, test, build
    npm run smoke                  browser checks, needs a running server

Port 3000 belongs to `praximations-web-new`, which is often running.

## Repo status

Remote is `praximations/catering-website`. Develop on a branch, never
straight onto `main`.
