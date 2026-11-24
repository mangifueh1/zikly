alter table public.payments
  alter column phone drop not null;

create index if not exists payments_active_target_idx
  on public.payments (user_id, payment_type, artist_id, status, created_at desc);
