create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state_json jsonb not null default jsonb_build_object(
    'selectedCompanyId', null,
    'selectedOpCos', '[]'::jsonb,
    'selectedFunctions', '[]'::jsonb,
    'selectedYear', null,
    'userProfile', '',
    'customQuestions', '[]'::jsonb,
    'messages', '[]'::jsonb
  ),
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users can read their own state"
on public.user_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own state"
on public.user_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own state"
on public.user_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.docket_watch_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  recipient_email text not null,
  frequency text not null default 'weekly' check (frequency in ('weekly')),
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.docket_watch_targets (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.docket_watch_subscriptions (id) on delete cascade,
  source_key text not null,
  state text not null,
  account_name text not null,
  utility_type text not null,
  display_name text not null,
  provider text not null,
  source_url text not null,
  extractor_type text not null,
  match_terms jsonb not null default '[]'::jsonb,
  docket_numbers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, source_key)
);

create table if not exists public.docket_watch_snapshots (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.docket_watch_targets (id) on delete cascade,
  snapshot_hash text not null,
  summary_text text not null,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  unique (target_id, snapshot_hash)
);

create table if not exists public.docket_watch_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.docket_watch_subscriptions (id) on delete cascade,
  target_id uuid not null references public.docket_watch_targets (id) on delete cascade,
  source_event_key text not null unique,
  event_type text not null,
  title text not null,
  summary text not null,
  source_url text not null,
  event_date timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.docket_watch_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.docket_watch_subscriptions (id) on delete cascade,
  event_ids jsonb not null default '[]'::jsonb,
  status text not null,
  provider text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default now()
);

alter table public.docket_watch_subscriptions enable row level security;
alter table public.docket_watch_targets enable row level security;
alter table public.docket_watch_snapshots enable row level security;
alter table public.docket_watch_events enable row level security;
alter table public.docket_watch_deliveries enable row level security;

create policy "Users can read their own docket subscriptions"
on public.docket_watch_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own docket subscriptions"
on public.docket_watch_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own docket subscriptions"
on public.docket_watch_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their own docket targets"
on public.docket_watch_targets
for select
to authenticated
using (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
);

create policy "Users can insert their own docket targets"
on public.docket_watch_targets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
);

create policy "Users can update their own docket targets"
on public.docket_watch_targets
for update
to authenticated
using (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
);

create policy "Users can read their own docket snapshots"
on public.docket_watch_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.docket_watch_targets t
    join public.docket_watch_subscriptions s on s.id = t.subscription_id
    where t.id = target_id
      and s.user_id = auth.uid()
  )
);

create policy "Users can read their own docket events"
on public.docket_watch_events
for select
to authenticated
using (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
);

create policy "Users can read their own docket deliveries"
on public.docket_watch_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.docket_watch_subscriptions s
    where s.id = subscription_id
      and s.user_id = auth.uid()
  )
);
