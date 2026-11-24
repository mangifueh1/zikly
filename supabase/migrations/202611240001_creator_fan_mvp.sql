create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('creator', 'fan')),
  created_at timestamptz not null default now()
);

insert into public.profiles (id, role)
select u.id,
  case when exists (select 1 from public.artists a where a.user_id = u.id)
    then 'creator' else 'fan' end
from auth.users u
on conflict (id) do nothing;

alter table public.artists
  add column if not exists subscription_price_xaf integer,
  add constraint artists_subscription_price_check
    check (subscription_price_xaf is null or subscription_price_xaf >= 100);

create or replace view public.public_artists as
select id, name, slug, bio, avatar_url, cover_url, social_links, created_at, subscription_price_xaf
from public.artists;

create or replace view public.public_projects as
select id, artist_id, title, description, category, cover_url, is_paid, price_xaf, is_published, created_at,
  exists (
    select 1 from public.tracks t
    where t.project_id = projects.id and t.is_paid = true
  ) as has_exclusive
from public.projects
where is_published = true;

alter table public.payments
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists payment_type text not null default 'media';

alter table public.payments drop constraint if exists payments_target_check;
alter table public.payments add constraint payments_target_check check (
  (payment_type = 'media' and (
    (project_id is not null and track_id is null)
    or (project_id is null and track_id is not null)
  ))
  or (payment_type = 'subscription' and project_id is null and track_id is null)
);
alter table public.payments add constraint payments_type_check
  check (payment_type in ('media', 'subscription'));
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.unlocks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists unlocks_user_idx on public.unlocks (user_id, created_at desc);

alter table public.tracks
  add column if not exists media_path text;
alter table public.tracks drop constraint if exists tracks_type_check;
alter table public.tracks add constraint tracks_type_check
  check (track_type in ('audio','video','image'));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint subscriptions_dates_check check (expires_at > starts_at)
);
create index if not exists subscriptions_user_expiry_idx
  on public.subscriptions (user_id, expires_at desc);
create index if not exists subscriptions_artist_expiry_idx
  on public.subscriptions (artist_id, expires_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

create policy profiles_self_read on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists artists_owner_manage on public.artists;
create policy artists_owner_manage on public.artists
for all to authenticated
using (
  user_id = auth.uid()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'creator')
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'creator')
);

drop policy if exists projects_owner_manage on public.projects;
create policy projects_owner_manage on public.projects
for all to authenticated
using (artist_id in (
  select a.id from public.artists a
  join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid() and p.role = 'creator'
))
with check (artist_id in (
  select a.id from public.artists a
  join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid() and p.role = 'creator'
));

drop policy if exists tracks_owner_manage on public.tracks;
create policy tracks_owner_manage on public.tracks
for all to authenticated
using (project_id in (
  select p.id from public.projects p
  join public.artists a on a.id = p.artist_id
  join public.profiles pr on pr.id = a.user_id
  where a.user_id = auth.uid() and pr.role = 'creator'
))
with check (project_id in (
  select p.id from public.projects p
  join public.artists a on a.id = p.artist_id
  join public.profiles pr on pr.id = a.user_id
  where a.user_id = auth.uid() and pr.role = 'creator'
));

create policy subscriptions_fan_read on public.subscriptions
for select to authenticated using (user_id = auth.uid());

create policy subscriptions_creator_read on public.subscriptions
for select to authenticated using (
  artist_id in (select id from public.artists where user_id = auth.uid())
);

create policy payments_fan_read on public.payments
for select to authenticated using (user_id = auth.uid());

create policy unlocks_fan_read on public.unlocks
for select to authenticated using (user_id = auth.uid());

revoke select on public.payments, public.unlocks, public.payment_events from authenticated;
grant select (
  id, artist_id, project_id, track_id, status, amount_xaf, payment_type, created_at, updated_at
) on public.payments to authenticated;
grant select (id, artist_id, project_id, track_id, created_at)
  on public.unlocks to authenticated;

drop policy if exists zikly_audio_artist_manage on storage.objects;
create policy zikly_audio_artist_manage on storage.objects
for all to authenticated
using (
  bucket_id = 'zikly-audio'
  and exists (
    select 1 from public.artists a
    join public.profiles p on p.id = a.user_id
    where a.id::text = (storage.foldername(name))[1]
      and a.user_id = auth.uid()
      and p.role = 'creator'
  )
)
with check (
  bucket_id = 'zikly-audio'
  and exists (
    select 1 from public.artists a
    join public.profiles p on p.id = a.user_id
    where a.id::text = (storage.foldername(name))[1]
      and a.user_id = auth.uid()
      and p.role = 'creator'
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_slug text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'creator' then 'creator'
    else 'fan'
  end;
  insert into public.profiles (id, role) values (new.id, v_role);

  if v_role = 'creator' then
    v_name := nullif(btrim(new.raw_user_meta_data ->> 'artist_name'), '');
    v_slug := lower(nullif(btrim(new.raw_user_meta_data ->> 'artist_slug'), ''));
    if v_name is null or v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'Creator name and a valid profile URL are required.';
    end if;
    insert into public.artists (user_id, name, slug)
    values (new.id, v_name, v_slug);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.settle_payment(
  p_payment_id uuid,
  p_status text,
  p_fapshi_status text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table(status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_starts_at timestamptz;
begin
  if p_status not in ('SUCCESS','FAILED','EXPIRED','INITIATION_UNKNOWN') then
    raise exception 'Invalid payment status';
  end if;

  select * into v_payment from public.payments
  where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status = 'SUCCESS' then
    return query select v_payment.status;
    return;
  end if;

  update public.payments
  set status = p_status,
      fapshi_status = coalesce(p_fapshi_status, fapshi_status),
      last_status_check_at = now()
  where id = p_payment_id;

  insert into public.payment_events(payment_id, event_type, payload)
  values (p_payment_id, 'STATUS_' || p_status, p_payload);

  if p_status = 'SUCCESS' then
    if v_payment.user_id is null then
      raise exception 'Payment has no authenticated fan account.';
    end if;
    if v_payment.payment_type = 'subscription' then
      select greatest(now(), coalesce(max(expires_at), now())) into v_starts_at
      from public.subscriptions
      where user_id = v_payment.user_id
        and artist_id = v_payment.artist_id;
      insert into public.subscriptions(user_id, artist_id, payment_id, starts_at, expires_at)
      values (v_payment.user_id, v_payment.artist_id, v_payment.id, v_starts_at, v_starts_at + interval '30 days');
    else
      insert into public.unlocks(
        payment_id, phone, artist_id, project_id, track_id, user_id
      )
      values (
        v_payment.id, v_payment.phone, v_payment.artist_id,
        v_payment.project_id, v_payment.track_id, v_payment.user_id
      )
      on conflict do nothing;
    end if;
  end if;

  return query select p_status;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.settle_payment(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_payment(uuid, text, text, jsonb) to service_role;

update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/flac','audio/wav',
  'video/mp4','video/webm','image/jpeg','image/png','image/webp'
]
where id = 'zikly-audio';
