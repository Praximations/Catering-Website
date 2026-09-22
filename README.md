# catering-web

A catering website: public pages, a quote form, customer accounts, and an
owner dashboard for the enquiries that come in.

## Running it

    npm run dev -- --port 3100     # port 3000 belongs to praximations-web-new
    npm run build
    npm run typecheck
    npm run lint

No configuration is needed to run it. Copy `.env.example` to `.env.local`
if you want to set any of it.

## First run

1. Start the dev server and go to `/signup`.
2. The FIRST account created becomes the owner and can see every enquiry.
   The page tells you this while it is still true. To choose the address
   instead, set `OWNER_EMAIL` in `.env.local` before signing up.
3. Send yourself an enquiry from `/quote`, then look at `/admin`.

## The pages

    /                 home
    /menu             the four packages and their dishes
    /shop             order bulk sandwiches, packages, platters, and extras
    /cart             the cart and checkout
    /orders/[token]   order confirmation, reachable by its own link
    /about            how booking works and the practical details
    /quote            the enquiry form, open to everyone, no account needed
    /login            sign in
    /signup           create an account
    /account          a customer's own orders and enquiries
    /admin            the owner's dashboard: orders and enquiries, statuses,
                      private notes
    /admin/praxi      what Praxi may do, what it has asked for, what it did

## Ordering and payments

The shop is the Shopify-shaped half: products in `lib/shop.ts`, a cart in
a cookie, checkout, orders, and statuses the owner moves along.

The sample catalog includes three sandwich assortments sold per sandwich,
with a minimum of 50 for each assortment. The browser quantity controls show
the minimum, and checkout verifies it again on the server before an order can
be placed.

Two rules it will not bend on:

- **Prices never come from the browser.** The cart cookie holds slugs and
  quantities only; every total is recomputed server side from the catalog.
  A cookie is editable, so a price out of one would be a price the
  customer chose.
- **Payment is optional and verifiable.** The order is saved first. When
  Stripe is configured, the confirmation page offers hosted Stripe Checkout.
  Only a signed Stripe webhook marks an order paid.

An order's confirmation page is addressed by an unguessable token rather
than the order id or the reference number, so a guest can return to their
own order and cannot reach anybody else's by editing the URL.

Money is an integer number of cents everywhere. `formatMoney` is the only
place that turns cents into something readable.

## Where things live

    lib/business.ts   the name, contact details, lead time, minimum. ONE file.
    lib/menu.ts       the packages and dishes
    app/globals.css   the palette and radii, as tokens
    app/layout.tsx    the two typefaces

Change `lib/business.ts` and the whole site follows: the header, the
footer, the metadata, and the copy on every page. Same idea as the design
tokens. While the contact details are still the shipped placeholders, the
footer says so out loud rather than letting somebody email a fake address.

## Accounts and sessions

Two roles. A customer sees only their own enquiries; the owner sees all of
them and can set a status and keep a private note. Nothing else is
different between them.

- Passwords are hashed with scrypt from the Node standard library
  (`lib/passwords.ts`). No native dependency, no plaintext anywhere.
- A session is a signed cookie, httpOnly and same-site, with an HMAC over
  a payload holding only a user id and an expiry (`lib/session.ts`).
  Nothing secret is in the cookie and a tampered one is rejected.
- `SESSION_SECRET` signs it. In development one is generated and kept in
  `data/.session-secret` so logins survive a restart. In production the
  app refuses to start a session without the env var.
- Protection is applied per page (`requireUser`, `requireOwner`) and again
  inside every Server Action, never in a layout: layouts do not
  necessarily re-run on navigation, and an action can be called without
  the page ever being loaded.

## Praxi

Praxi is the intelligence layer above this site: it does not replace the
site's own database, accounts, or checkout. Two directions, two separate
credentials, and each can be switched off without touching the other.

### Outward: what this site tells Praxi

`lib/praxi.ts` sends canonical events to Praxi's universal runtime:

    customer.created   somebody creates an account
    form.submitted     a quote enquiry
    order.created      a checkout
    order.updated      the owner moves an order along
    order.fulfilled    (delivered) and order.canceled

Set both `PRAXI_API_URL` and `PRAXI_SECRET_KEY` to turn it on. With either
missing it is a no-op and the site behaves exactly as before, which the
owner dashboard states plainly rather than implying a connection that is
not there.

**It cannot break the site.** Every call has a four second timeout and
swallows its own errors: if Praxi is slow or down, the order still
completes. An analytics pipeline must never be able to fail a checkout.

`lib/praxi.ts` is hand written against the same HTTP contract as the
`@praxi/sdk` package (`Projects/Praxi/Praxi-SDK`), so this repo keeps its
zero dependencies and needs no cross repo link. Swapping the package in
later changes that one module and nothing that calls it.

### Inward: what Praxi may do to this site

Manage it at **/admin/praxi**. Every capability has three settings:

    Never          Praxi cannot, and is told so.
    Ask me first   Praxi has to request it. Nothing happens until you say yes.
    Allowed        Praxi can do it alone. Still written to the log.

Defaults are deliberate: reading is on (Praxi already receives the same
data as events), anything that changes your dashboard is ask, and anything
a customer would see, prices, availability, and the site notice, is off.

What it can be given at all is one file, `lib/capabilities.ts`. Nothing
outside that registry is reachable, so "what could Praxi possibly do to my
site" is answered by reading it.

Praxi calls two endpoints with a control key (`ck_live_...`), minted and
revoked on the same page:

    GET  /api/praxi/capabilities   what am I allowed to do here
    POST /api/praxi/control        do one of them

Beyond the on/off switch there are three further protections:

- **Approval means approval.** An "ask" request returns 202 and does
  nothing until you press the button. The dashboard shows the exact
  arguments and Praxi's stated reason, because approving something you
  cannot see is not approval.
- **Guardrails apply even when allowed.** A price must stay within 3x of
  the one in `lib/shop.ts` and inside absolute bounds, so a hallucinated
  number cannot reprice the menu. A deliberate change outside that belongs
  in the code.
- **Everything is logged, refusals included.** A permission system whose
  denials are invisible cannot be reviewed.

Notes are appended, never replaced, so Praxi cannot erase what you wrote.
Reads are shaped by hand, so private notes and password hashes are not in
what Praxi gets back. Revoking a key stops it on the next call; nothing is
cached.

## Supabase and Vercel

Local development still works with `data/catering.json`. In production,
set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and the same storage
contract uses a private Supabase row with optimistic concurrency. Run
`supabase/schema.sql` once in the Supabase SQL editor before deploying.

For Vercel, also set `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, and the Stripe
variables from `.env.example`. In Stripe, add a webhook ending in
`/api/stripe/webhook` and subscribe it to `checkout.session.completed`.

`data/` is gitignored. Real accounts and real enquiries do not belong in
git.

## Stack

Next.js 16.2.10 (App Router, webpack), React 19.2.4, TypeScript, Tailwind
v4, and no other dependencies. Deliberately the same versions as
praximations-web-new.

## Still not decided

Whose catering this is. The name, the contact details, the menu, and the
prices are all placeholders, marked as such in the files above and on the
pages that show them.
