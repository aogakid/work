-- Run once in Supabase SQL Editor to enable per-calendar booking hours.
create table if not exists public.calendar_hours (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  period smallint not null check (period in (1, 2)),
  starts_at time not null,
  ends_at time not null,
  constraint calendar_hours_valid_range check (starts_at < ends_at),
  constraint calendar_hours_unique_period unique (calendar_id, weekday, period)
);

alter table public.calendar_hours enable row level security;

drop policy if exists "Public can read calendar hours" on public.calendar_hours;
create policy "Public can read calendar hours"
  on public.calendar_hours for select to anon, authenticated using (true);

grant select on public.calendar_hours to anon, authenticated;
revoke insert, update, delete on public.calendar_hours from public, anon, authenticated;
grant all on public.calendar_hours to service_role;

create or replace function public.replace_calendar_hours(p_calendar_id uuid, p_hours jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) < 1 or jsonb_array_length(p_hours) > 14 then
    raise exception 'Select between one and fourteen opening periods.';
  end if;

  delete from public.calendar_hours where calendar_id = p_calendar_id;

  insert into public.calendar_hours (calendar_id, weekday, period, starts_at, ends_at)
  select
    p_calendar_id,
    (item->>'weekday')::smallint,
    (item->>'period')::smallint,
    (item->>'starts_at')::time,
    (item->>'ends_at')::time
  from jsonb_array_elements(p_hours) as entries(item);
end;
$$;

revoke all on function public.replace_calendar_hours(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_calendar_hours(uuid, jsonb) to service_role;

create or replace function public.enforce_calendar_booking_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_schedule boolean;
  is_allowed boolean;
  weekday_number smallint;
begin
  if new.status <> 'scheduled' then
    return new;
  end if;

  select exists (
    select 1 from public.calendar_hours where calendar_id = new.calendar_id
  ) into has_schedule;

  -- Calendars created before this schedule feature remain bookable until configured.
  if not has_schedule then
    return new;
  end if;

  weekday_number := extract(dow from new.appointment_date)::smallint;
  select exists (
    select 1
    from public.calendar_hours as hours
    where hours.calendar_id = new.calendar_id
      and hours.weekday = weekday_number
      and (
        new.start_time is null
        or (new.start_time >= hours.starts_at and new.start_time < hours.ends_at)
      )
  ) into is_allowed;

  if not is_allowed then
    raise exception 'This calendar is closed for the selected date or time.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_within_calendar_hours on public.appointments;
create trigger appointments_within_calendar_hours
  before insert or update of calendar_id, appointment_date, start_time, status
  on public.appointments
  for each row execute function public.enforce_calendar_booking_hours();
