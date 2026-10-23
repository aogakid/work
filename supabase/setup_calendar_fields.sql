-- Run once in the Supabase SQL Editor to enable field deactivation/reactivation.
alter table public.calendar_fields
  add column if not exists is_active boolean not null default true;

update public.calendar_fields
set is_active = true
where is_active is null;

revoke update on public.calendar_fields from public, anon, authenticated;
grant update on public.calendar_fields to service_role;
