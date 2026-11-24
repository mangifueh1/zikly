create extension if not exists pgcrypto;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  bio text,
  avatar_url text,
  cover_url text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artists_name_not_blank check (char_length(btrim(name)) > 0),
  constraint artists_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index artists_slug_uidx on public.artists (lower(slug));
create unique index artists_user_uidx on public.artists (user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  cover_url text,
  is_paid boolean not null default false,
  price_xaf integer,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_not_blank check (char_length(btrim(title)) > 0),
  constraint projects_category_check check (category in ('ep','single','visual','vault_extra')),
  constraint projects_paid_price_check check (
    (is_paid = false and (price_xaf is null or price_xaf = 0))
    or (is_paid = true and price_xaf >= 100)
  )
);
create index projects_artist_idx on public.projects (artist_id);
create index projects_published_idx on public.projects (is_published, created_at desc);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  track_type text not null,
  is_paid boolean not null default false,
  price_xaf integer,
  audio_path text,
  video_url text,
  duration text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracks_title_not_blank check (char_length(btrim(title)) > 0),
  constraint tracks_type_check check (track_type in ('audio','video')),
  constraint tracks_paid_price_check check (
    (is_paid = false and (price_xaf is null or price_xaf = 0))
    or (is_paid = true and price_xaf >= 100)
  ),
  constraint tracks_audio_path_check check (
    track_type <> 'audio' or audio_path is not null
  )
);
create index tracks_project_idx on public.tracks (project_id, position);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  trans_id text,
  phone text not null,
  amount_xaf integer not null check (amount_xaf >= 100),
  artist_id uuid not null references public.artists(id),
  project_id uuid references public.projects(id),
  track_id uuid references public.tracks(id),
  status text not null default 'PENDING',
  fapshi_status text,
  last_status_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_target_check check (
    (project_id is not null and track_id is null)
    or (project_id is null and track_id is not null)
  ),
  constraint payments_status_check check (
    status in ('PENDING','SUCCESS','FAILED','EXPIRED','INITIATION_UNKNOWN')
  )
);
create unique index payments_external_uidx on public.payments (external_id) where external_id is not null;
create unique index payments_trans_uidx on public.payments (trans_id) where trans_id is not null;
create index payments_artist_idx on public.payments (artist_id, created_at desc);
create index payments_phone_idx on public.payments (phone);

create table if not exists public.unlocks (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  phone text not null,
  artist_id uuid not null references public.artists(id),
  project_id uuid references public.projects(id),
  track_id uuid references public.tracks(id),
  created_at timestamptz not null default now(),
  constraint unlocks_target_check check (
    (project_id is not null and track_id is null)
    or (project_id is null and track_id is not null)
  )
);
create unique index unlocks_payment_uidx on public.unlocks (payment_id);
create unique index unlocks_project_phone_uidx on public.unlocks (phone, artist_id, project_id)
  where project_id is not null;
create unique index unlocks_track_phone_uidx on public.unlocks (phone, track_id)
  where track_id is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_payment_idx on public.payment_events (payment_id, created_at desc);

create or replace view public.public_artists as
select id, name, slug, bio, avatar_url, cover_url, social_links, created_at
from public.artists;

create or replace view public.public_projects as
select id, artist_id, title, description, category, cover_url, is_paid, price_xaf, is_published, created_at
from public.projects
where is_published = true;

create or replace view public.public_tracks as
select id, project_id, title, description, track_type, is_paid, price_xaf, duration, position, created_at
from public.tracks
where exists (
  select 1 from public.projects p
  where p.id = tracks.project_id and p.is_published = true
);

alter table public.artists enable row level security;
alter table public.projects enable row level security;
alter table public.tracks enable row level security;
alter table public.payments enable row level security;
alter table public.unlocks enable row level security;
alter table public.payment_events enable row level security;

create policy artists_public_read on public.artists
for select to anon, authenticated using (true);

create policy artists_owner_manage on public.artists
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy projects_public_read on public.projects
for select to anon, authenticated using (is_published = true);

create policy projects_owner_manage on public.projects
for all to authenticated
using (artist_id in (select id from public.artists where user_id = auth.uid()))
with check (artist_id in (select id from public.artists where user_id = auth.uid()));

create policy tracks_public_read on public.tracks
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = tracks.project_id and p.is_published = true
));

create policy tracks_owner_manage on public.tracks
for all to authenticated
using (project_id in (
  select p.id from public.projects p
  join public.artists a on a.id = p.artist_id
  where a.user_id = auth.uid()
))
with check (project_id in (
  select p.id from public.projects p
  join public.artists a on a.id = p.artist_id
  where a.user_id = auth.uid()
));

create policy payments_artist_read on public.payments
for select to authenticated
using (artist_id in (select id from public.artists where user_id = auth.uid()));

create policy unlocks_none_public on public.unlocks
for select to anon using (false);

create policy unlocks_artist_read on public.unlocks
for select to authenticated
using (artist_id in (select id from public.artists where user_id = auth.uid()));

create policy payment_events_artist_read on public.payment_events
for select to authenticated
using (payment_id in (
  select id from public.payments
  where artist_id in (select id from public.artists where user_id = auth.uid())
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zikly-audio',
  'zikly-audio',
  false,
  104857600,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/flac','audio/wav','video/mp4','video/webm']
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy zikly_audio_artist_manage on storage.objects
for all to authenticated
using (
  bucket_id = 'zikly-audio'
  and (storage.foldername(name))[1] in (
    select id::text from public.artists where user_id = auth.uid()
  )
)
with check (
  bucket_id = 'zikly-audio'
  and (storage.foldername(name))[1] in (
    select id::text from public.artists where user_id = auth.uid()
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger artists_set_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger tracks_set_updated_at
before update on public.tracks
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

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
begin
  if p_status not in ('SUCCESS','FAILED','EXPIRED','INITIATION_UNKNOWN') then
    raise exception 'Invalid payment status';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  update public.payments
  set status = p_status,
      fapshi_status = coalesce(p_fapshi_status, fapshi_status),
      last_status_check_at = now()
  where id = p_payment_id;

  insert into public.payment_events(payment_id, event_type, payload)
  values (p_payment_id, 'STATUS_' || p_status, p_payload);

  if p_status = 'SUCCESS' then
    insert into public.unlocks(
      payment_id, phone, artist_id, project_id, track_id
    )
    values (
      v_payment.id,
      v_payment.phone,
      v_payment.artist_id,
      v_payment.project_id,
      v_payment.track_id
    )
    on conflict do nothing;
  end if;

  return query select p_status;
end;
$$;

revoke all on function public.settle_payment(uuid, text, text, jsonb) from public, anon, authenticated;
