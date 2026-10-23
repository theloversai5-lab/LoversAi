create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  couple_profile_id uuid not null references public.profiles(id) on delete cascade,
  professional_profile_id uuid not null references public.profiles(id) on delete cascade,
  last_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_distinct_members check (couple_profile_id <> professional_profile_id),
  constraint conversations_unique_pair unique (couple_profile_id, professional_profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists conversations_couple_updated_idx
  on public.conversations(couple_profile_id, updated_at desc);
create index if not exists conversations_professional_updated_idx
  on public.conversations(professional_profile_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);

create or replace function private.is_conversation_member(conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        c.couple_profile_id = (select auth.uid())
        or (c.professional_profile_id = (select auth.uid())
          and private.can_view_couple_requests())
      )
  )
$$;

grant execute on function private.is_conversation_member(uuid) to authenticated;

create or replace function private.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message = new.body,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function private.touch_conversation_after_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations to authenticated;
grant insert (couple_profile_id, professional_profile_id) on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_profile_id, body) on public.messages to authenticated;

drop policy if exists "Members read conversations" on public.conversations;
create policy "Members read conversations" on public.conversations
for select to authenticated
using (
  couple_profile_id = (select auth.uid())
  or (professional_profile_id = (select auth.uid())
    and private.can_view_couple_requests())
);

drop policy if exists "Couples and approved pros start conversations" on public.conversations;
create policy "Couples and approved pros start conversations" on public.conversations
for insert to authenticated
with check (
  (
    couple_profile_id = (select auth.uid())
    and private.current_app_role() = 'couple'
    and exists (
      select 1 from public.profiles p
      where p.id = couple_profile_id
        and p.role = 'couple'
        and p.is_public and p.is_complete
    )
    and exists (
      select 1 from public.profiles p
      where p.id = professional_profile_id
        and p.role in ('planner', 'vendor')
        and p.is_public and p.is_complete
        and p.is_approved
    )
  )
  or (
    professional_profile_id = (select auth.uid())
    and private.current_app_role() in ('planner', 'vendor')
    and exists (
      select 1 from public.profiles p
      where p.id = couple_profile_id
        and p.role = 'couple'
        and p.is_public and p.is_complete and not p.is_demo
        and (p.is_demo or private.can_view_couple_requests())
    )
  )
);

drop policy if exists "Conversation members read messages" on public.messages;
create policy "Conversation members read messages" on public.messages
for select to authenticated
using (private.is_conversation_member(conversation_id));

drop policy if exists "Members send their own messages" on public.messages;
create policy "Members send their own messages" on public.messages
for insert to authenticated
with check (
  sender_profile_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when duplicate_object then
  null;
end
$$;
