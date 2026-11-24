alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop policy if exists tracks_public_read on public.tracks;
create policy tracks_public_read on public.tracks
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = tracks.project_id and p.is_published = true
));

revoke all on public.payments from anon;
revoke all on public.unlocks from anon;
revoke all on public.subscriptions from anon;
revoke all on public.payment_events from anon;

revoke select on public.tracks from anon;
revoke select on public.tracks from authenticated;
grant select (
  id, project_id, title, description, track_type, is_paid, price_xaf,
  duration, position, created_at, updated_at
) on public.tracks to anon, authenticated;

revoke insert, update, delete on public.payments from authenticated;
revoke insert, update, delete on public.unlocks from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;
revoke insert, update, delete on public.payment_events from authenticated;

alter table public.payments alter column phone drop not null;

grant select on public.public_artists to anon, authenticated;
grant select on public.public_projects to anon, authenticated;
grant select on public.public_tracks to anon, authenticated;
