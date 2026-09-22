-- catering-web schema
--
-- Run this in the Supabase SQL editor, or with `psql -f supabase/schema.sql`.
-- It is idempotent: running it again on an existing database is a no-op.
--
-- WHAT REPLACED WHAT. The first version of this file held one table,
-- app_state, with one row, holding the entire database as a single jsonb
-- document. Every write read the whole document, changed one field, and
-- wrote the whole document back under an optimistic version check. That
-- design has three problems no amount of application code can fix:
--
--   1. Two writers that touch unrelated things still collide, because they
--      are writing the same row. Under Vercel's concurrent instances the
--      retry loop was the only thing between a lost order and a kept one.
--   2. Nothing could be checked by the database. "This email is unique",
--      "this order belongs to a real user", "a price is a positive integer"
--      were all conventions held up by application code alone.
--   3. Every read transferred every row of every kind. The audit log was
--      capped at 500 entries for exactly this reason, which meant the
--      security log rolled over under load.
--
-- So: real tables, real constraints, real indexes. The conditional updates
-- this enables ("mark paid ONLY IF still unpaid") are single atomic
-- statements, which is what makes double-charging and double-approving
-- impossible rather than unlikely.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email

/* ================================== people ================================= */

create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  -- citext, so "Ari@example.com" and "ari@example.com" cannot both exist.
  -- The application lower-cases too; this is the guarantee underneath it.
  email           citext not null unique,
  name            text not null default '',
  -- Null for an account that only ever signs in with Google. Never leaves
  -- lib/users.ts: see PublicUser.
  password_hash   text,
  auth_provider   text not null default 'password'
                    check (auth_provider in ('password', 'google')),
  role            text not null default 'customer'
                    check (role in ('owner', 'customer')),
  -- Bumped to invalidate every session this account has open. A signed
  -- cookie cannot be withdrawn once issued, so the epoch inside it is
  -- compared against this column on every request instead.
  session_epoch   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Deliberately NOT a unique index on role = 'owner'. Who the owner is is
-- application policy (OWNER_EMAIL, else the first account), and changing
-- OWNER_EMAIL after an owner exists would then make the next signup fail on
-- a constraint violation rather than simply creating a customer. The rule
-- lives in lib/users.ts, where it can explain itself.
create index if not exists users_role on public.users (role);

/* ================================= enquiries =============================== */

create table if not exists public.enquiries (
  id            uuid primary key default gen_random_uuid(),
  -- Set when the person was signed in. The enquiry outlives the account:
  -- deleting a customer must not delete the business's record of the job.
  user_id       uuid references public.users(id) on delete set null,
  name          text not null,
  email         citext not null,
  phone         text not null default '',
  event_date    date not null,
  guests        integer not null check (guests > 0 and guests <= 5000),
  package_slug  text not null,
  notes         text not null default '',
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'confirmed', 'declined')),
  -- Private to the owner. lib/enquiries.ts builds the customer's view field
  -- by field so this cannot reach them by being added to a type.
  owner_notes   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists enquiries_created_at on public.enquiries (created_at desc);
create index if not exists enquiries_user_id on public.enquiries (user_id);
create index if not exists enquiries_email on public.enquiries (email);
create index if not exists enquiries_status on public.enquiries (status);

/* ============================== contact messages =========================== */

create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  name        text not null,
  email       citext not null,
  phone       text not null default '',
  subject     text not null,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_created_at on public.contacts (created_at desc);
create index if not exists contacts_status on public.contacts (status);

/* ================================== orders ================================= */

-- The customer-facing reference number. A sequence rather than a row count:
-- counting rows gave two simultaneous orders the same reference, and gave a
-- reused reference to the next order after any deletion.
create sequence if not exists public.order_reference_seq start with 1001;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  -- Short and human facing, what the customer quotes on the phone.
  reference         text not null unique
                      default nextval('public.order_reference_seq')::text,
  -- Unguessable, and the ONLY way to reach an order without an account.
  -- /orders/[token] is addressed by this rather than by id or reference, so
  -- a guest can return to their own order and cannot walk the list.
  token             uuid not null unique default gen_random_uuid(),
  user_id           uuid references public.users(id) on delete set null,
  name              text not null,
  email             citext not null,
  phone             text not null default '',
  event_date        date not null,
  -- People expected, which is not the same as any line quantity.
  guests            integer not null check (guests > 0 and guests <= 5000),
  address           text not null default '',
  notes             text not null default '',
  -- Integer minor units, always. No floats anywhere near money.
  subtotal_minor    bigint not null check (subtotal_minor >= 0),
  -- Stored per order, so changing the business currency later cannot
  -- reinterpret what somebody already paid.
  currency          text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  payment_status    text not null default 'unpaid'
                      check (payment_status in ('unpaid', 'paid', 'refunded')),
  -- Which provider took the money, and its id for the attempt. Named for
  -- the role rather than for Stripe, because lib/payments takes more than
  -- one provider.
  payment_provider  text,
  payment_reference text,
  paid_at           timestamptz,
  -- Paid means paid: a row cannot claim it without saying when. Refunded
  -- counts, because money has to have arrived before it can go back.
  constraint orders_paid_has_timestamp
    check ((payment_status in ('paid', 'refunded')) = (paid_at is not null)),
  owner_notes       text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_created_at on public.orders (created_at desc);
create index if not exists orders_user_id on public.orders (user_id);
create index if not exists orders_email on public.orders (email);
create index if not exists orders_status on public.orders (status);
create index if not exists orders_payment_reference on public.orders (payment_reference);

-- A line as it was at the moment of ordering. SNAPSHOTTED: name and unit
-- price are copied, never joined, so repricing the catalog tomorrow does
-- not rewrite an order somebody already placed.
create table if not exists public.order_lines (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  -- Preserves the order the customer built, which no sort key would.
  position          integer not null,
  slug              text not null,
  name              text not null,
  unit              text not null check (unit in ('person', 'item', 'sandwich')),
  unit_price_minor  bigint not null check (unit_price_minor >= 0),
  quantity          integer not null check (quantity > 0),
  line_total_minor  bigint not null check (line_total_minor >= 0),
  unique (order_id, position)
);

create index if not exists order_lines_order_id on public.order_lines (order_id);
create index if not exists order_lines_slug on public.order_lines (slug);

/* ============================ customer messages ============================ */

create table if not exists public.customer_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  sender      text not null check (sender in ('customer', 'owner')),
  kind        text not null check (kind in ('message', 'change_request')),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists customer_messages_user_id
  on public.customer_messages (user_id, created_at);
create index if not exists customer_messages_created_at
  on public.customer_messages (created_at desc);

/* ============================== saved preferences ========================== */

create table if not exists public.saved_info (
  user_id             uuid primary key references public.users(id) on delete cascade,
  venues              text[] not null default '{}',
  addresses           text[] not null default '{}',
  guest_preferences   text not null default '',
  dietary_information text not null default '',
  favorite_menu_slugs text[] not null default '{}',
  updated_at          timestamptz not null default now()
);

/* =========================== what Praxi may do ============================= */

-- A credential Praxi presents to ACT on this site. Stored as a sha256 hash:
-- the token is shown once at mint and never again.
create table if not exists public.control_keys (
  id            uuid primary key default gen_random_uuid(),
  label         text not null default 'Praxi',
  token_hash    text not null unique,
  -- First few characters, so the dashboard can name a key it cannot read.
  token_prefix  text not null,
  status        text not null default 'active' check (status in ('active', 'revoked')),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

-- Only DEVIATIONS from each capability's declared default are stored, so a
-- capability added later starts at its own default rather than inheriting
-- whatever a stale row happened to say.
create table if not exists public.capability_permissions (
  capability_id text primary key,
  mode          text not null check (mode in ('off', 'ask', 'on')),
  updated_at    timestamptz not null default now(),
  updated_by    text not null default ''
);

-- Praxi asked to do something whose permission is set to "ask".
create table if not exists public.approvals (
  id            uuid primary key default gen_random_uuid(),
  capability    text not null,
  args          jsonb not null default '{}'::jsonb,
  -- Praxi's own words about why, shown to the owner before they decide.
  reason        text not null default '',
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'denied', 'expired')),
  requested_by  text not null,
  requested_at  timestamptz not null default now(),
  decided_by    text,
  decided_at    timestamptz,
  -- Filled in once an approved action has actually run.
  result        text,
  error         text
);

create index if not exists approvals_status on public.approvals (status, requested_at desc);
create index if not exists approvals_requested_at on public.approvals (requested_at desc);

-- EVERY attempt, allowed or refused. Its own table and no cap: the previous
-- version trimmed this to 500 rows, which under the endpoint's own rate
-- limit of 60 calls a minute discarded the security log in under ten
-- minutes, and took the replay protection that read from it along too.
create table if not exists public.audit_log (
  id              bigint primary key generated always as identity,
  at              timestamptz not null default now(),
  capability      text not null,
  actor           text not null,
  decision        text not null
                    check (decision in ('allowed', 'denied', 'queued', 'executed', 'failed')),
  detail          text not null default '',
  idempotency_key text
);

create index if not exists audit_log_at on public.audit_log (at desc);
create index if not exists audit_log_capability on public.audit_log (capability, at desc);

-- Replay protection, separate from the audit log so that trimming or
-- archiving the log can never quietly re-enable a replayed write.
--
-- SCOPED PER KEY: keys are minted per integration, and one integration must
-- not be able to suppress another's write by guessing its idempotency key.
create table if not exists public.idempotency_keys (
  control_key_id  uuid not null references public.control_keys(id) on delete cascade,
  key             text not null,
  capability      text not null,
  outcome         text not null default '',
  created_at      timestamptz not null default now(),
  primary key (control_key_id, key)
);

create index if not exists idempotency_keys_created_at
  on public.idempotency_keys (created_at);

/* ============================== catalog overrides ========================== */

-- Praxi's and the owner's changes to the catalog, kept SEPARATE from
-- lib/shop.ts. The file stays the source of truth for what EXISTS; this can
-- only reprice or hide. It can never invent a product or delete one, which
-- is why there is no name or description column here.
create table if not exists public.product_overrides (
  slug        text primary key,
  price_minor bigint check (price_minor > 0),
  available   boolean,
  updated_at  timestamptz not null default now(),
  updated_by  text not null default ''
);

/* ================================= settings ================================ */

-- Small, single-value site state, such as the notice across the top. A
-- key/value table rather than a column per setting, because these come and
-- go with the copy rather than with the data model.
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

/* =============================== payments ================================== */

-- Every provider webhook event this site has already processed.
--
-- The provider's own event id is the primary key, so a redelivery, a
-- replay inside the signature's time tolerance, and two instances handed
-- the same event all collide on insert. The insert is the lock: whoever
-- wins it processes the event, and everybody else is told it is a
-- duplicate. Without this the only thing standing between a replayed
-- "payment succeeded" and a second fulfilment was that marking an order
-- paid twice happened to be harmless.
create table if not exists public.payment_events (
  -- "stripe:evt_123": namespaced, so two providers cannot collide.
  id            text primary key,
  provider      text not null,
  type          text not null,
  order_id      uuid references public.orders(id) on delete set null,
  received_at   timestamptz not null default now(),
  -- What we did about it, for reading back when a payment is disputed.
  outcome       text not null default ''
);

create index if not exists payment_events_order_id on public.payment_events (order_id);
create index if not exists payment_events_received_at on public.payment_events (received_at desc);

/* ============================== rate limiting ============================== */

-- One row per attempt. Counting rows in a window is the only shape that
-- works across concurrent serverless instances: an in-process Map, which is
-- what this used to be, gives each instance its own private allowance and
-- therefore no limit at all.
create table if not exists public.rate_limit_hits (
  id      bigint primary key generated always as identity,
  -- "login:ari@example.com", "signup:203.0.113.4". Hashed by the caller
  -- when it holds anything identifying.
  bucket  text not null,
  at      timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_at on public.rate_limit_hits (bucket, at desc);
create index if not exists rate_limit_hits_at on public.rate_limit_hits (at);

/* ============================== updated_at ================================= */

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'enquiries', 'contacts', 'orders', 'saved_info',
    'capability_permissions', 'product_overrides', 'settings'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end;
$$;

/* ================================== RLS ==================================== */

-- Every table, locked, with NO policies. That combination denies the anon
-- and authenticated roles outright, while the service-role key the server
-- uses bypasses RLS by design. Browsers reach this data only through this
-- application's own authorization checks, never directly.
--
-- If you ever add a policy here, remember that /orders/[token] is reachable
-- without an account: a policy on orders would be the one place a token
-- could leak somebody else's row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'enquiries', 'contacts', 'orders', 'order_lines',
    'customer_messages', 'saved_info', 'control_keys',
    'capability_permissions', 'approvals', 'audit_log', 'idempotency_keys',
    'product_overrides', 'settings', 'payment_events', 'rate_limit_hits'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

/* ============================== housekeeping =============================== */

-- Rows that exist only to be counted inside a window, and replay keys older
-- than any signature tolerance, are both safe to discard. Call from a
-- Supabase scheduled function, or leave it: the indexes above keep the
-- queries fast either way, and lib/rate-limit.ts also prunes as it goes.
create or replace function public.prune_expired()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.rate_limit_hits where at < now() - interval '1 day';
  delete from public.idempotency_keys where created_at < now() - interval '30 days';
  delete from public.payment_events where received_at < now() - interval '1 year';
$$;

/* ============================== place_order ================================= */

-- An order and its lines, inserted in ONE transaction.
--
-- PostgREST has no transaction that spans two requests, and an order whose
-- lines failed to insert is worse than no order at all: it shows the
-- customer a total with nothing in it. Doing both here makes the pair
-- atomic, which for the one write on the money path is worth the function.
--
-- Returns the whole order, reference and token included, because both are
-- generated here and the caller needs them for the confirmation page.
create or replace function public.place_order(
  p_order jsonb,
  p_lines jsonb
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.orders;
begin
  insert into public.orders (
    user_id, name, email, phone, event_date, guests, address, notes,
    subtotal_minor, currency, status, payment_status, owner_notes
  )
  values (
    nullif(p_order->>'user_id', '')::uuid,
    p_order->>'name',
    p_order->>'email',
    coalesce(p_order->>'phone', ''),
    (p_order->>'event_date')::date,
    (p_order->>'guests')::integer,
    coalesce(p_order->>'address', ''),
    coalesce(p_order->>'notes', ''),
    (p_order->>'subtotal_minor')::bigint,
    p_order->>'currency',
    coalesce(p_order->>'status', 'pending'),
    coalesce(p_order->>'payment_status', 'unpaid'),
    coalesce(p_order->>'owner_notes', '')
  )
  returning * into created;

  insert into public.order_lines (
    order_id, position, slug, name, unit, unit_price_minor, quantity, line_total_minor
  )
  select
    created.id,
    (line.ordinality - 1)::integer,
    line.value->>'slug',
    line.value->>'name',
    line.value->>'unit',
    (line.value->>'unit_price_minor')::bigint,
    (line.value->>'quantity')::integer,
    (line.value->>'line_total_minor')::bigint
  from jsonb_array_elements(p_lines) with ordinality as line(value, ordinality);

  -- An order with no lines is a bug in the caller, not a valid order.
  if not exists (select 1 from public.order_lines where order_id = created.id) then
    raise exception 'place_order was given no lines';
  end if;

  return created;
end;
$$;

/* ============================ dashboard counts ============================== */

-- Grouped counts as views, so the dashboard asks Postgres to count rather
-- than downloading every order and counting them in JavaScript. Both are
-- security_invoker, so they answer with the caller's own permissions rather
-- than the view owner's.
create or replace view public.enquiry_counts
  with (security_invoker = true) as
  select status, count(*)::bigint as count
  from public.enquiries
  group by status;

-- payment_status is in the grouping because a REFUNDED order is not revenue
-- and is not cancelled either. Grouping by status alone gave the dashboard's
-- revenue tile no way to exclude it, while the per-customer lifetime value on
-- the same page already did, so the two numbers disagreed.
create or replace view public.order_counts
  with (security_invoker = true) as
  select
    status,
    payment_status,
    count(*)::bigint as count,
    coalesce(sum(subtotal_minor), 0)::bigint as subtotal_minor
  from public.orders
  group by status, payment_status;
