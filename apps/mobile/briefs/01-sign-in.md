# Bite 1 — sign-in, password change, role routing

Everything in `apps/mobile`. The skeleton already boots: Expo SDK 58, Expo Router, Tajawal loading,
RTL on, a placeholder at `src/app/index.tsx` you will replace. Read `apps/mobile/PLAN.md` first —
especially *Data per screen*, which lists every call with its real arguments.

**Three files already hold approved material. Use them; do not retype or re-derive them.**

- `src/i18n/ar.ts`, `src/i18n/en.ts` — the approved copy, namespaced `branch` and `driver`.
- `src/ui/tokens.ts` — the palette for both themes. No spacing or radius scale, deliberately; use the
  design's literal values and don't add one.
- `src/ui/icons.ts` — 40 SVG icons, render with `react-native-svg`.
- `src/data/database.types.ts` — generated; `createClient<Database>`.

## What to build

1. Theme provider (light / dark / system) and language provider (ar / en) over those files, both
   remembered on the device.
2. Supabase client with the session in `expo-secure-store`.
3. TanStack Query provider, and online/offline from `@react-native-community/netinfo`.
4. Shared `Loading`, `ErrorState`, `EmptyState`, `OfflineBar` components.
5. In-app splash (`branch.splashB` / `branch.splashA`; driver `appName` / `tagline`).
6. The sign-in screen.
7. The forced password-change screen.
8. Role routing, and placeholder homes for both roles — a title and a sign-out button, nothing more.
   The real homes are later bites.
9. An error-code → message map covering the UPPER_SNAKE codes in `supabase/README.md`.

## Sign-in

One screen for both roles, with a segmented switch at the top: **فرع | سائق**. It is not in the
designs — style it from the tokens to match. The last choice is remembered and the screen opens on
it. Switching sides clears the typed fields and any error.

**Branch side** — chain picker + branch number + password.
Chains come from `GET ${SUPABASE_URL}/functions/v1/chains`, which needs no session and no key:
`{ chains: [{ code, name_ar, name_en }] }`. If it fails, show `branch.loadErrT` / `loadErrB` / `retry`.

**Driver side** — mobile number + password.

Both sign in through the `sign-in` Edge Function, **never `signInWithPassword`**:

```
POST ${SUPABASE_URL}/functions/v1/sign-in   { email, password }
  200 { session }                      → supabase.auth.setSession(session)
  401 { error: 'INVALID_CREDENTIALS', attempts_left }
  429 { error: 'LOCKED', retry_after }  // seconds
```

Email is built, never typed:

- branch: `b-<chain code>-<branch number>@branches.cloudswater.co`
- driver: `d-<05XXXXXXXX>@drivers.cloudswater.co`

**Phone normalisation.** The field behaves as designed — 9 digits starting with 5, shown as
`+966 5X XXX XXXX`. Normalise before building the email: strip non-digits, drop a leading `966`,
drop a leading `0`, require `^5\d{8}$`, then prefix `0`. The database stores `05XXXXXXXX` and the
login is built from that exact string.

Copy: branch `loginTitle, loginSub, chainPh, errChain, errBranch, pass, showPass, login, loggingIn,
forgot, errPass, loginOff, sharedNote, passHint, badLogin, lockMsg, forgotT, forgotB` · driver
`loginHello, loginSub, mobile, password, showPw, login, signingIn, forgot, loginErr, loginErrN,
accountsNote, lockedTitle, lockedBody`. `badLogin` and `loginErrN` take `{n}` = `attempts_left`.

## After the session

Read the caller's own `profiles` row (`role, display_name, display_name_en, must_change_password,
active`), then:

- `active` is false → sign out, show `shared.accountInactive`.
- `role` is not the side they picked → sign out, show `shared.wrongSideBranch` or
  `shared.wrongSideDriver`. **The server's role wins, always.**
- `must_change_password` → the password-change screen, with no way back.
- otherwise → that role's home.

## Password change

New password + confirm. No "current password" field here — this is the forced change after a
temporary password. (The Account version asks for the current one by calling `sign-in` first; that
is a later bite.)

**The rule is the server's rule: 8 or more characters, at least one Latin letter and at least one
digit.** Show it live: branch `r1, r2, r3`, driver `rule8, ruleNum, ruleMatch`.

```
await supabase.auth.updateUser({ password })
await supabase.rpc('complete_password_change')
```

Both, in that order. `complete_password_change` refuses with `PASSWORD_NOT_CHANGED` when the account
still has its temporary password — that means they re-entered the temporary one. Show
`shared.samePassword`.

Copy: branch `pwdT, pwdSub, pwdHdr, newPass, confPass, showPw, hidePw, saving, savePass, passSaved` ·
driver `cpTitle, cpSubFirst, newPw, confirmPw, saveContinue`.

## Copy you must add

These do not exist yet. Add them to **both** `ar.ts` and `en.ts` under a new top-level `shared`
namespace, exactly as written — do not reword:

| key | ar | en |
| --- | --- | --- |
| `roleBranch` | فرع | Branch |
| `roleDriver` | سائق | Driver |
| `wrongSideBranch` | هذا الحساب حساب سائق. بدّل إلى «سائق» وسجّل الدخول من هناك. | This is a driver account. Switch to "Driver" and sign in there. |
| `wrongSideDriver` | هذا الحساب حساب فرع. بدّل إلى «فرع» وسجّل الدخول من هناك. | This is a branch account. Switch to "Branch" and sign in there. |
| `accountInactive` | هذا الحساب موقوف. تواصل مع فريق التشغيل. | This account is disabled. Contact the Operations team. |
| `samePassword` | اختر كلمة مرور مختلفة عن المؤقتة. | Choose a password different from the temporary one. |

If you find you need any other string, add it to both files and say so in your summary. Never put a
literal string in a component.

## Two things that will bite you

**SecureStore has a ~2 KB limit per value on Android, and a Supabase session is bigger.** Writing it
whole fails silently and the user is signed out on every launch. Split the value across keys in the
storage adapter, or keep the session in `AsyncStorage` and only the refresh token in SecureStore.
Say which you chose.

**On native, the client needs `detectSessionInUrl: false`**, plus `persistSession: true` and
`autoRefreshToken: true`.

## Config

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `process.env`. Add
`apps/mobile/.env.example` with both keys and empty values; the real `.env.local` is gitignored and
Ahmed fills it. **The service-role key never goes near this app.**

## Don't

- Don't call `signInWithPassword`, or reach a table that `PLAN.md` doesn't list for this screen.
- Don't invent copy, colours, spacing or radii.
- Don't touch `apps/dashboard`, `supabase/`, or the three lifted files beyond the additions above.
- Don't add a dependency without saying why — bite 1's are installed already.
- Don't build the real home screens.
- Don't commit, branch or push. Leave the working tree dirty for review.

## Done when

On a phone in Expo Go, with a real branch account and a real driver account:

1. Each signs in from its own side of the switch and lands on its placeholder home.
2. A wrong password shows the attempts left; five wrong ones show the lock message.
3. A first sign-in forces the password change, the rule is enforced live, re-using the temporary
   password is refused with the right message, and the new password works on the next sign-in.
4. Signing in on the wrong side signs out and says so.
5. Arabic and English, light and dark, all four render correctly. Arabic is right-to-left.
6. Killing the app and reopening it keeps the user signed in.
7. `npm run typecheck` and `npm run bundle` both pass from `apps/mobile`.
