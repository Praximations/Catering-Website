# catering-web

A catering website: public pages, an online shop and a quote form, customer
accounts with order tracking and messages, and an Owner Portal for running
the business.

## Running it

    npm run dev -- --port 3100     # port 3000 belongs to praximations-web-new
    npm run verify                 # typecheck, lint, test, build
    npm test
    npm run test:watch

`npm run verify` runs the four in the order that localizes a failure
fastest: typecheck, lint, test, then build.

    npm run smoke                  # browser checks, needs a running server

Tests run on Node's own test runner. Node 22 strips types without
compiling, so there is no transpiler and no test dependency to install.
That does mean three pieces of TypeScript syntax cannot be used anywhere in
the project: parameter properties, `enum`, and `namespace`. `npm run lint`
rejects all three with a message explaining why.

`npm run smoke` is separate and not part of `verify`. It drives a real
browser against a running server, because five things cannot be checked any
other way: that checkout's post-redirect-get actually lands on the order
page, that the Content Security Policy blocks an injected script AND does
not break hydration, that signing out everywhere ends a session in a
DIFFERENT browser, that an order token is the only route to an order, and
that no page is wider than a phone once it has been scrolled. It needs
Playwright, which is deliberately not a dependency of this project:

    npm i -g playwright && npx playwright install chromium

It writes real data, so point it at a development server.

No configuration is needed to run it. Copy `.env.example` to `.env.local`
if you want to set any of it.

## First run

1. Start the dev server and go to `/signup`.
2. The FIRST account created becomes the owner and can see every enquiry.
   The page tells you this while it is still true. To choose the address
   instead, set `OWNER_EMAIL` in `.env.local` before signing up.
3. Send yourself an enquiry from `/quote`, then look at `/admin`.

## The pages

    /                   home: what we do, prices from, how ordering works, FAQ
    /shop               order online: sandwich platters, per-guest menus,
                        sharing platters, staff
    /menu               event menus, quoted rather than ordered online
    /quote              plan an event; ?package= preselects a menu
    /about              how it works: ordering online vs. catering an event
    /contact            a general message; ?subject= prefills
    /cart               the order and checkout, with a map of the address
    /orders/[token]     the order: status, progress, details, and messages,
                        reachable by its link
    /policies           privacy, terms, refunds, delivery, cookies,
                        allergens; searchable
    /login, /signup     sign in and create an account, without the footer

    /account            Overview: the next delivery and what is owed
    /account/orders     every order and quote, and reorder
    /account/messages   the conversation with the business
    /account/details    saved details, and sign out everywhere

    /admin              Owner Portal overview: what needs attention, this
                        week, coming up, recent activity, setup left to do
    /admin/orders       orders by status, search, and each order in full
    /admin/quotes       quote requests
    /admin/customers    everyone who has been in touch, stitched together by
                        email: account, orders, enquiries, messages
    /admin/inbox        conversations and contact form messages
    /admin/catalog      prices and availability, as overrides
    /admin/settings     business details, service area, site notice, team,
                        connections, policies
    /admin/praxi        what Praxi may do, what it has asked for, what it did

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
- **Payment is optional and verifiable.** The order is saved first. When a
  provider is configured, the confirmation page offers hosted checkout.
  Only a signed webhook marks an order paid, never the success redirect: a
  customer can open that URL without paying, and can close the tab after
  paying.
- **The order says what is owed, not the provider.** The webhook pipeline
  compares the amount and currency the provider reports against the stored
  order and refuses a mismatch rather than marking it paid.
- **Payments are pluggable.** `lib/payments` defines a `PaymentProvider`
  interface with Stripe as the first implementation. Adding another is a new
  file plus one line in the registry; nothing under `app/` names a provider,
  and the verification, deduplication and amount checks are shared rather
  than reimplemented per integration.

An order's confirmation page is addressed by an unguessable token rather
than the order id or the reference number, so a guest can return to their
own order and cannot reach anybody else's by editing the URL.

Money is an integer number of cents everywhere. `formatMoney` is the only
place that turns cents into something readable.

## Messages, texts and maps

**Messages.** A customer and the business talk inside the site: on the order
page, in the account's Messages tab, and in the Owner Portal's inbox and on
each order. A guest's order has its own thread; once that guest has an
account with the same email, their threads become one. Unread means the
other side has not opened it yet, and a message is marked read by the page
the person is looking at, never by a server render, which a link prefetch
would trigger without anybody reading anything.

**Text messages** are optional. With the three `TWILIO_*` variables set, the
owner can send a reply as a text too, and a customer's texted reply is filed
under their most recent order by phone number. The inbound webhook,
`/api/sms/inbound`, refuses any request without Twilio's signature, and a
redelivered text is stored once. A number with no country code is only read
as North American when the business is in the US or Canada: guessing a
country is how a text reaches a stranger.

**Maps.** Wherever an address matters (checkout, the order page, the Owner
Portal's order and customer pages, the service area in settings) it is shown
on a map. Lookups go through the server, `POST /api/geo`, rate limited and
cached for a month, to OpenStreetMap's Nominatim, and the map is an
OpenStreetMap embed, the one origin the Content Security Policy lets the site
frame. No key is needed. `MAPS=off` turns it all off; `GEOCODER_URL` points
at your own Nominatim. A lookup that fails shows the address without a map
and never blocks an order.

## Policies

`/policies` has privacy, terms, refunds, delivery, cookies and allergens,
built from `lib/policies.ts` so they describe what the site actually does.
They name a payment processor, a text message provider or a map service only
when one is configured, and they promise no cancellation window, refund
timescale, delivery fee or governing law until those are set under `policies` in
`lib/business.ts`. Until `lastUpdated` is set, every page says it is a
starting template.

## Where things live

    lib/business.ts      the name, contact details, location, service area,
                         policy terms. ONE file.
    lib/menu.ts          the packages and dishes
    app/globals.css      the palette, radius and shadow scales, and motion
                         timing, as tokens
    app/layout.tsx       the two typefaces
    components/ui.tsx    buttons, cards, fields, pills, tabs, disclosures,
                         tooltips: every screen is assembled from these
    components/icons.tsx the icon set, inline SVG

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

### Google sign-in

Google sign-in uses Supabase Auth with the server-side PKCE flow. Email and
password login remains available. To enable the Google button:

1. Enable Google in Supabase Auth and add the Google client ID and secret.
2. In Supabase URL Configuration, allow the callback for the port you use,
   such as `http://localhost:3000/auth/callback` or
   `http://localhost:3100/auth/callback`, plus
   `https://your-domain.example/auth/callback`.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in
   `.env.local` and in Vercel.

After Google verifies the person, the callback creates or connects the local
customer record by verified email and starts the same signed app session used
by password login. Google tokens are not stored in the application database.

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

## Storage

One narrow contract in `lib/db`, two adapters behind it.

Local development uses a JSON file and needs no setup at all. Set
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and the same contract talks
to Postgres over Supabase's REST endpoint instead. Run
`supabase/schema.sql` once in the SQL editor first; it is idempotent.

The schema is sixteen tables with foreign keys, check constraints, indexes,
and row level security enabled with no policies, which denies every role
except the service role the server uses. Browsers reach this data only
through this application's own authorization checks.

Two things the contract gives you that are worth knowing about, because the
rest of the code leans on them:

- **The insert is the lock.** `insertIfAbsent` returns null when a unique
  constraint already holds the value. That is how "one account per address"
  and "process this webhook event once" are enforced, rather than by
  looking first and then writing, which two simultaneous callers both pass.
- **An update returns what it changed.** Put a state check in the WHERE and
  a conditional update is one atomic statement. "Mark this order paid, but
  only if it is still unpaid" is a single statement, so two webhook
  deliveries arriving together cannot both succeed.

Anything the contract cannot express is a view or a function in
`supabase/schema.sql`. Dashboard counts are views, so counting orders does
not mean reading them all. An order and its lines are written by the
`place_order` function in one transaction, because an order whose lines
failed to insert would show the customer a total with nothing in it.

`data/` is gitignored. Real accounts and real orders do not belong in git.

### Coming from the old single-document layout

The first version of this app kept the entire database as one jsonb
document in one row. If you have one of those:

    node scripts/migrate-from-blob.mjs --from data/catering.json --dry-run
    node scripts/migrate-from-blob.mjs --print-json      # inspect the rows
    node scripts/migrate-from-blob.mjs --from-supabase   # read the old row

It never deletes the source, so a migration that goes wrong is undone by
pointing the app back at it. Everyone has to sign in again afterwards: the
cookie format changed, and old cookies are rejected rather than trusted.

## Deploying to Vercel

Set `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and the Stripe variables from
`.env.example`. Do not import that file as it stands: its
`NEXT_PUBLIC_SITE_URL` is the local address, and a production build would put
it in every payment return URL and the sitemap.

`SUPABASE_SERVICE_ROLE_KEY` takes either a secret key (`sb_secret_...`) or
the legacy `service_role` key. A secret key is sent on the `apikey` header
only, because Supabase rejects one presented as a bearer token.

Supabase is not optional there. The site refuses to start without it rather
than falling back to the local file, because each serverless instance would
get its own copy on a disk that is thrown away, so orders would appear to
save and then vanish.

Optional, and each off until set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
and `TWILIO_FROM_NUMBER` for text messages, and `GEOCODER_URL` or `MAPS=off`
for maps. After pulling a schema change, run `supabase/schema.sql` again; it
is idempotent.

In Stripe, add a webhook ending in `/api/stripe/webhook` and subscribe it
to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`payment_intent.payment_failed`, and `charge.refunded`.

## Security

What is in place, and what each piece is actually for:

- **Security headers**, in `lib/security-headers.ts`. A Content Security
  Policy with a per-request nonce and `strict-dynamic`, so an injected
  script does not run; `frame-ancestors 'none'`; HSTS in production only;
  and `Referrer-Policy: strict-origin-when-cross-origin`, because the path
  of an order page is a credential and a full-path referrer would hand it
  to any site a customer clicks through to.
- **Rate limits** on sign in, sign up, the contact form, checkout, and
  Praxi's control endpoint. Stored rather than in memory: a counter in one
  process gives every serverless instance its own allowance. Sign in is
  limited per address AND per caller, because either alone has a hole.
- **Revocable sessions.** A signed cookie cannot be recalled, so signing
  out only clears the browser doing it. "Sign out everywhere", under the
  account's Details or the Owner Portal's Settings, moves the account's
  session epoch and every cookie ever issued for it stops working at once.
- **Verified email on Google sign in.** Signing in with Google connects to
  an existing account by address, so an unverified address would be enough
  to take over the account owning it.
- **Passwords** hashed with scrypt, salted, compared in constant time, and
  length capped, because scrypt is deliberately expensive and an unbounded
  password is a way to spend the server's CPU. A wrong password and an
  address with no account take the same time and give the same message.
- **Every free-text field has a maximum**, enforced in one place. A field
  read without one is an unbounded write.
- **Payment amounts are verified** against the stored order, and webhook
  events are deduplicated by the provider's event id.
- **Inbound texts are signed.** The SMS webhook checks Twilio's HMAC over the
  exact URL and every parameter, in constant time, before anything is stored.
- **Sign in only ever sends you back to this site.** `?next=` is accepted only
  as a path here, because anything else turns the real sign in page into a
  link to a look-alike.

## Stack

Next.js 16.3.5 (App Router, webpack), React 19.2.4, TypeScript, Tailwind
v4, and `@supabase/ssr` for the Google sign in handshake. Nothing else at
runtime: auth, hashing, sessions, Postgres, and payments are the platform
and the Node standard library.

Tests and CI add no dependency either. `node:test` plus Node 22's own type
stripping, and a GitHub Actions workflow that runs typecheck, lint, test,
and build.

## Still not decided

Whose catering this is. The name, the contact details, the menu, and the
prices are all placeholders, marked as such in the files above and on the
pages that show them.
