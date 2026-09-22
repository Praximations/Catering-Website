create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create or replace function public.touch_app_state_updated_at()
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

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
before update on public.app_state
for each row execute function public.touch_app_state_updated_at();

-- No public policies are intentional. The server uses the service-role key,
-- while browser clients cannot read or mutate customer and order data.
