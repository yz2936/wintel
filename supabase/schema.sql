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
