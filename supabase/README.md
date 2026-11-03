# Clouds Water Ecosystem — backend (Supabase)

Project: **Clouds Water Ecosystem** · ref `vuotbcicuhzjmtmudwgs` · region eu-central-1
API URL: `https://vuotbcicuhzjmtmudwgs.supabase.co`

The dashboard and the mobile app (branch + driver) share this one backend. All business rules live in the database,
so the two apps can never disagree.

## What's here

| Folder | What |
| --- | --- |
| `migrations/` | The schema, applied in order (01 → 24). File versions match the live migration history 1:1. 01–23 are applied to the live project; 24 (`20261104000000_audit_fixes.sql`) is applied once you run it, then renamed to the version the live project gives it. |
| `functions/` | Edge Functions `create-account` and `reset-password` (JWT required, staff only), and `sign-in` and `chains` (no JWT — the branch + driver apps call them before there is a session). `chains` returns the active chains and `app_settings.ops_phone` for «نسيت كلمة المرور؟». |
| `seed/demo.sql` | Demo branches, drivers and 40 requests in every state, dated relative to the day it runs. Already loaded. |
| `tests/lifecycle.sql` | 96 end-to-end checks as GM / supervisor / branch / driver, including the rules of migrations 21, 23 and 24. Runs in one transaction and rolls back. Expects the demo seed data. Run with `psql -f` (it uses psql meta-commands). |
| `tests/phase2.sql` | Checks for 13–16 (morning notice, sign-in lock, temporary passwords) and 24 (a reset ends every session). Ends with a deliberate error that rolls back; the message says `ALL CHECKS PASSED`. |

## Rules enforced by the database

- One open request per branch per material subtype (unique index + check in the RPCs → `DUPLICATE_OPEN_REQUEST`).
- Plans are approved only for the next working day (Fri + Sat are off, Asia/Riyadh time).
- A driver belongs to one material and one city; the plan rejects any other driver.
- Ops cancel waiting or scheduled requests with a reason; branches cancel only while waiting (shows struck-through in Scheduling).
- Driver outcomes: full → completed; partial / failed → needs decision. Photo required for full + partial, reason for partial + failed.
- 08:00 Riyadh (cron): each branch with a visit today gets a «موعد الاستلام اليوم» notification (once per visit).
- 20:00 Riyadh (cron): visits with no outcome → needs decision. 09:00 Riyadh: digest for decisions older than 24 h.
- Decisions: reschedule (undo within 15 min by the same user) or close with a reason.
- An account still on its temporary password has no role: it can read only its own profile and finish the password
  change (`complete_password_change`). The staff Edge Functions (`create-account`, `reset-password`) refuse it too
  (`NOT_ALLOWED`). A password reset deletes every session of the account.
- Photo paths: a branch's must be an uploaded object in `branch/<its own id>/`, a driver's must be in
  `request/<request id>/` (`INVALID_PHOTO`). A request can't be created on an inactive material or subtype (`MATERIAL_INACTIVE`).
- 5,000 kg is the ceiling for staff-created requests too.
- Every dashboard user has general-manager permissions. Each material has one manager (`materials.manager_id`) who gets that material's notifications; staff who manage no material get everything.
- A driver keeps reading a request, its branch and its photos after visiting it, even once it is moved off them; a visit the 20:00 sweep closed in their name does not count.
- Driver availability is per day (`driver_days_off`); planning refuses a driver on a day off, and Reports count the days off.
- Unified ops number: `app_settings.ops_phone` — branches call it when a material has no contact number.

## Security model

- `anon` can't read or call anything. Every screen needs a signed-in account with an active profile.
- Clients read through RLS (staff: all; branch: own; driver: assigned). Requests, history, profiles and notifications are
  read-only to clients — all changes go through `SECURITY DEFINER` RPCs that check the caller's role first.
- Reference rows (cities, materials…) are deactivated, never deleted.
- Photos: private bucket `request-photos` — `branch/<branch_id>/…` (branch uploads), `request/<request_id>/…` (driver uploads). Staff read all.
- The service role key is used only inside the Edge Functions. It must never go into the frontend or any `VITE_` variable.

## Logins

| Account | Login (email) | Created by |
| --- | --- | --- |
| Dashboard user | `s-<phone>@staff.cloudswater.co` (types the mobile) or a real email | `create-account` `{ kind: 'staff', display_name, phone, material_ids? }` |
| Branch | `b-<chain code>-<branch number>@branches.cloudswater.co` | `create-account` `{ kind: 'branch', branch_id }` |
| Driver | `d-<phone>@drivers.cloudswater.co` | `create-account` `{ kind: 'driver', driver_id }` |

Every new or reset account gets a 6-digit temporary password and `must_change_password = true`. After
`supabase.auth.updateUser({ password })` the app calls `rpc('complete_password_change')`.

**Password rule.** A password the user chooses must be 8+ characters with at least one Latin letter and one digit —
set in Supabase → Authentication → Email (*Minimum length 8*, *Letters and digits*), so Auth itself enforces it on
every path. The Auth admin API enforces it too, so the 6-digit temporary password is written by the database
(`set_temp_password`, service role only); signing in with it still works. A reset also lifts a sign-in lock.
`complete_password_change` refuses with `PASSWORD_NOT_CHANGED` while the account still has its temporary password.

**Sign-in lock (branch + driver apps).** The apps sign in through the `sign-in` Edge Function, not
`signInWithPassword`: `POST { email, password }` → `200 { session }` (then `supabase.auth.setSession(session)`),
`401 { error: 'INVALID_CREDENTIALS', attempts_left }` (no `attempts_left` when the password is empty or too long),
`429 { error: 'LOCKED', retry_after }`, or `403 { error: 'ACCOUNT_INACTIVE' }` (right password, deactivated account).
Other Auth failures return `AUTH_ERROR` with no detail (the detail goes to the function's log). 5 wrong passwords lock
that login for 15 minutes; the count starts again only after 15 minutes with no wrong password, so 5 failures spread
over longer than 15 minutes still lock if no gap between them reaches 15 minutes. The Password Verification hook (the in-Auth way) needs the Team
plan. Limits: a client that calls Supabase Auth directly with the public key skips the lock; the lock is per login, so
anyone who knows a login can lock it on purpose (ops can lift it with *Reset password*).

### First dashboard user (one time)

1. Supabase → Authentication → Users → **Add user** → your email + a strong password, tick *Auto confirm*.
2. Run in the SQL editor (replace the email):

```sql
insert into public.profiles (id, role, display_name, must_change_password)
select id, 'staff', 'Ahmed Akram', false from auth.users where email = 'you@example.com';
```

After that, every other account is created from the dashboard.

## RPCs (called with `supabase.rpc(name, args)`)

Staff: `staff_late_branches`, `staff_report_v2`, `staff_create_request`, `staff_cancel_request`,
`staff_approve_plan`, `staff_change_plan_driver`, `staff_decide`, `staff_undo_reschedule`,
`staff_list_staff`, `staff_update_staff`, `staff_set_account_active`, `staff_branch_overview`,
`staff_driver_overview`, `staff_reason_usage`, `staff_set_driver_day`, `staff_set_material_manager`.
Branch app: `branch_set_location`, `branch_create_request`, `branch_update_request`, `branch_cancel_request`.
Driver app: `driver_record_outcome`. Everyone: `mark_notifications_read`, `complete_password_change`.

Errors come back as UPPER_SNAKE codes in the message (e.g. `DUPLICATE_OPEN_REQUEST`, `REASON_REQUIRED`) for the apps to translate.

The branch RPCs raise: `NOT_ALLOWED`, `LOCATION_REQUIRED`, `LOCATION_ALREADY_SET` (a branch confirms its pin once —
after that only the dashboard moves it), `INVALID_LOCATION`, `KG_REQUIRED`, `KG_TOO_LARGE` (the ceiling is 5,000 kg,
enforced in both create and update), `CONTACT_REQUIRED`, `INVALID_PHONE`, `SUBTYPE_REQUIRED`, `MATERIAL_INACTIVE`, `INVALID_PHOTO`,
`DUPLICATE_OPEN_REQUEST` (with the open request's number in `detail`, also when two creates race) and `INVALID_STATUS`.

## Running the tests again

Run `tests/lifecycle.sql` with `psql -f` (it uses `set` and `echo`, which the SQL editor does not accept). It creates
temporary accounts, runs every flow and rolls everything back; the last line reports `ALL CHECKS PASSED`. Paste
`tests/phase2.sql` into the SQL editor as one batch. Both also run against a local `supabase start` stack.
