-- Clouds Water Ecosystem — 09: cover foreign keys flagged by the performance advisor
create index requests_driver_idx on public.requests (driver_id);
create index requests_subtype_idx on public.requests (subtype_id, material_id);
create index requests_cancel_reason_idx on public.requests (cancel_reason_id);
create index requests_created_by_idx on public.requests (created_by);
create index requests_cancelled_by_idx on public.requests (cancelled_by);
create index requests_closed_by_idx on public.requests (closed_by);
create index drivers_material_idx on public.drivers (material_id);
create index visit_attempts_driver_idx on public.visit_attempts (driver_id, visit_day);
create index visit_attempts_reason_idx on public.visit_attempts (reason_id);
create index notifications_request_idx on public.notifications (request_id);
create index notifications_material_idx on public.notifications (material_id);
create index plan_approvals_driver_idx on public.plan_approvals (driver_id);
create index plan_approvals_approved_by_idx on public.plan_approvals (approved_by);
create index profiles_material_idx on public.profiles (material_id);
