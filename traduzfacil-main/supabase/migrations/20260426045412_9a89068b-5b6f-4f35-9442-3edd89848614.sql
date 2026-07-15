
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "users view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
create index on public.conversations(user_id, updated_at desc);

create policy "users select own conversations" on public.conversations
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own conversations" on public.conversations
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own conversations" on public.conversations
  for update to authenticated using (auth.uid() = user_id);
create policy "users delete own conversations" on public.conversations
  for delete to authenticated using (auth.uid() = user_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index on public.messages(conversation_id, created_at);

create policy "users select own messages" on public.messages
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own messages" on public.messages
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own messages" on public.messages
  for delete to authenticated using (auth.uid() = user_id);
