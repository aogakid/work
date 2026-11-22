-- Run once in Supabase SQL Editor to add team support to calendars.
-- Existing calendars are migrated to team 651.

alter table public.calendars
  add column if not exists team integer not null default 651;

update public.calendars
set team = 651
where team is null;

create index if not exists calendars_team_idx on public.calendars(team);
