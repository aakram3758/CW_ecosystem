-- Remove two staff RPCs nothing calls any more:
--   staff_report   → replaced by staff_report_v2 (20261025000100_admin_screens), which the dashboard uses.
--   staff_overview → the Overview screen derives its numbers client-side; the mobile app never calls staff RPCs.
drop function if exists public.staff_report(date, date, uuid, uuid);
drop function if exists public.staff_overview(uuid, uuid);
