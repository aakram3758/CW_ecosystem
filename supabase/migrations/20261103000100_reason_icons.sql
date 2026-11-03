-- A failed reason gets the icon the driver canvas draws on its tile (Phosphor names, without "ph-").
-- Null means the app's default icon, so a reason added later from the dashboard still renders.
alter table public.reasons add column icon text;

update public.reasons set icon = case label_en
  when 'Branch was closed' then 'lock-simple'
  when 'No material available' then 'package'
  when 'Contact person not available' then 'user-minus'
  when 'Could not reach the location' then 'path'
end
where kind = 'failed';
