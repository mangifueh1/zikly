drop policy if exists zikly_audio_artist_manage on storage.objects;
create policy zikly_audio_artist_manage on storage.objects
for all to authenticated
using (
  bucket_id = 'zikly-audio'
  and (storage.foldername(name))[1] in (
    select a.id::text from public.artists a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid()
      and p.role = 'creator'
  )
)
with check (
  bucket_id = 'zikly-audio'
  and (storage.foldername(name))[1] in (
    select a.id::text from public.artists a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid()
      and p.role = 'creator'
  )
);
