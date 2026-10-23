-- Allow an authorized planner or vendor to start a chat
-- with any couple whose request they can view, including demo couples.
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
    and private.can_view_couple_requests()
    and exists (
      select 1 from public.profiles p
      where p.id = couple_profile_id
        and p.role = 'couple'
        and (
          p.is_demo
          or (p.is_public and p.is_complete)
        )
    )
  )
);
