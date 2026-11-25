-- Allow cascade deletion of unlocks and set null on payments when projects or tracks are deleted
-- This allows creators to delete content even if fans have unlocked or purchased it.

-- 1. Unlocks table foreign keys: change project_id and track_id to ON DELETE CASCADE
alter table public.unlocks
  drop constraint if exists unlocks_project_id_fkey,
  drop constraint if exists unlocks_track_id_fkey;

alter table public.unlocks
  add constraint unlocks_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade,
  add constraint unlocks_track_id_fkey
    foreign key (track_id) references public.tracks(id) on delete cascade;

-- 2. Payments table:
-- First adjust payments_target_check to permit both project_id and track_id to be NULL
-- (e.g. for deleted media or subscription payments)
alter table public.payments
  drop constraint if exists payments_target_check;

alter table public.payments
  add constraint payments_target_check check (
    (payment_type = 'media' and (
      (project_id is not null and track_id is null)
      or (project_id is null and track_id is not null)
      or (project_id is null and track_id is null)
    ))
    or (payment_type = 'subscription' and project_id is null and track_id is null)
  );

-- Now update foreign keys on payments table to ON DELETE SET NULL to preserve financial transaction history
alter table public.payments
  drop constraint if exists payments_project_id_fkey,
  drop constraint if exists payments_track_id_fkey;

alter table public.payments
  add constraint payments_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete set null,
  add constraint payments_track_id_fkey
    foreign key (track_id) references public.tracks(id) on delete set null;
