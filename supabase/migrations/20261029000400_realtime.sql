-- Migration 20 — the branch app hears changes as they happen.
--
-- Until now the app read its data when it opened, when it came back from the background, and after
-- its own writes — so a visit day set from the dashboard, a notification written for the branch or
-- a subtype added by ops reached a phone that was open in someone's hand only once they closed it
-- and opened it again. These nine tables are what the branch app reads; publishing them lets it
-- subscribe and refetch the moment one changes.
--
-- Nothing is widened by this. Realtime's postgres_changes checks every change against the
-- subscriber's own RLS before sending it, with their JWT, so a branch is told about its own
-- requests, events, attempts and notifications and nobody else's — the same rows it can already
-- select. The reference tables are readable by every signed-in user already.
--
-- Additive and reversible: `alter publication supabase_realtime drop table …` undoes it, and a
-- client that does not subscribe is unaffected.
--
-- (The plan reserved the number 20 for widening the driver's read to their own past attempts. That
-- moves to 21 and comes with bite 4.)

alter publication supabase_realtime add table
  public.requests,
  public.request_events,
  public.visit_attempts,
  public.notifications,
  public.branches,
  public.materials,
  public.material_subtypes,
  public.reasons,
  public.app_settings;
