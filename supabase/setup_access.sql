-- Run once in the Supabase SQL Editor after creating the calendar tables.

create table if not exists public.calendar_staff_attempts (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  source_hash text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  primary key (calendar_id, source_hash)
);

alter table public.calendar_staff_attempts enable row level security;

grant usage on schema public to service_role;
revoke all on public.calendar_staff_access from public, anon, authenticated;
revoke all on public.calendar_staff_attempts from public, anon, authenticated;
revoke update, delete on
  public.calendars,
  public.calendar_fields,
  public.staff,
  public.appointments,
  public.time_blocks
from public, anon, authenticated;
grant select, insert, update, delete on
  public.calendars,
  public.calendar_fields,
  public.staff,
  public.appointments,
  public.time_blocks,
  public.calendar_staff_access,
  public.calendar_staff_attempts
to service_role;

drop policy if exists "Public can create calendars" on public.calendars;
drop policy if exists "Public can create calendar fields" on public.calendar_fields;
drop policy if exists "Public can add staff" on public.staff;
drop policy if exists "Public can create time blocks" on public.time_blocks;
drop policy if exists "Public can view appointments" on public.appointments;
create policy "Public can view scheduled appointments"
  on public.appointments for select to anon
  using (status = 'scheduled');

revoke insert on public.calendars, public.calendar_fields, public.staff, public.time_blocks
  from public, anon, authenticated;
grant insert on public.appointments to anon;

create or replace function public.can_attempt_calendar_staff_password(
  p_calendar_id uuid,
  p_source_hash text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.calendar_staff_attempts as attempts
    where attempts.calendar_id = p_calendar_id
      and attempts.source_hash = p_source_hash
      and attempts.window_started_at > pg_catalog.now() - interval '15 minutes'
      and attempts.attempt_count >= 8
  );
$$;

create or replace function public.record_calendar_staff_password_failure(
  p_calendar_id uuid,
  p_source_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.calendar_staff_attempts as current_attempt (calendar_id, source_hash, window_started_at, attempt_count)
  values (p_calendar_id, p_source_hash, pg_catalog.now(), 1)
  on conflict (calendar_id, source_hash) do update
    set attempt_count = case
          when current_attempt.window_started_at <= pg_catalog.now() - interval '15 minutes' then 1
          else current_attempt.attempt_count + 1
        end,
        window_started_at = case
          when current_attempt.window_started_at <= pg_catalog.now() - interval '15 minutes' then pg_catalog.now()
          else current_attempt.window_started_at
        end;
end;
$$;

create or replace function public.clear_calendar_staff_password_failures(
  p_calendar_id uuid,
  p_source_hash text
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.calendar_staff_attempts
  where calendar_id = p_calendar_id and source_hash = p_source_hash;
$$;

revoke all on function public.can_attempt_calendar_staff_password(uuid, text) from public, anon, authenticated;
revoke all on function public.record_calendar_staff_password_failure(uuid, text) from public, anon, authenticated;
revoke all on function public.clear_calendar_staff_password_failures(uuid, text) from public, anon, authenticated;
grant execute on function public.can_attempt_calendar_staff_password(uuid, text) to service_role;
grant execute on function public.record_calendar_staff_password_failure(uuid, text) to service_role;
grant execute on function public.clear_calendar_staff_password_failures(uuid, text) to service_role;
