# Driver screens: canvas rebuild report

Source: `design/driver/Main.dc.html` and `cw.css`. Scope: driver screens after sign-in/onboarding, including voluntary password change. No commit.

“Built” below means implemented and checked against the markup in code. It does **not** mean screenshot comparison or phone acceptance has passed. Android/iOS font metrics, shadows, RTL layout, keyboard behaviour and long database labels still need device visual review.

## Verification and boundaries

- `npx.cmd tsc --noEmit` in `apps/mobile`: passed.
- `npm.cmd run bundle`: Android export passed; output in `.expo/export-check`.
- No package-root Phosphor imports in `src`; all driver Phosphor imports are per-icon imports in `src/driver/icons.tsx`.
- No driver-to-branch or branch-to-driver imports. Branch code and shared UI files are unchanged.
- `src/data/driver-api.ts` and `src/driver/model.ts` are unchanged.
- `src/driver/state.tsx` only exposes the initial context query's error/busy/retry presentation through `renderPending`. Queries, writes, drafts, realtime, date refresh, page state and provider lifecycle are unchanged. This lets the startup screen stop using branch `ErrorState`, `Screen` and `OfflineBar`.
- No dependency added by this implementation. The pre-existing `phosphor-react-native@3.0.6` package/lock edits were left intact, as were the other pre-existing uncommitted files.
- No copy keys added, files moved, backend changes, sign-in/onboarding/splash changes, forced password-route changes, or PLAN.md edits.

## Shared rendering conventions

- New `visual.tsx` draws driver text, buttons, cards, segmented rows, fields, screen frames and sheets. These do not use the branch drawing components.
- Canvas `47px` status-bar space becomes the safe-area top inset; headers retain the remaining 61px. Password uses inset + 12px; enlarged photo uses inset + 5px.
- Navigation occupies 88px in native layout. Scroll-bottom padding is 30px for home and 32px for tab pages, equivalent to the canvas's 118px/120px under an absolutely positioned 88px navigation bar.
- Tajawal 400/500/700/800 use their named font files. Explicit line heights are translated literally. Regular text inherits the canvas root's 1.5 line height; font shorthands use the native font's normal metrics unless the canvas specifies a line height.
- Theme-variable colours use preferences tokens. Literal artwork colours are file-level constants. `shadow`/`shadowLg` share the canvas offsets, radii and light/dark opacities, plus Android elevation. Native shadow rendering is a platform approximation, not a guaranteed CSS blur match.
- `cw-press` uses the shared .98 scale helper. Fade/up/pop and the sending spinner animate opacity/transforms with the native driver. Skeleton retains the existing opacity animation, restyled to the driver skeleton token; it does not reproduce CSS gradient shimmer.
- Directional forward/back icons follow `ic.fwd`/`ic.back`; regular, duotone, bold and fill weights are selected per drawing. Modal content repeats the preference direction because native Modal has a separate hierarchy.

## Home — markup 122–272

| Order | Element | State |
| --- | --- | --- |
| 1 | Navy hero, two outlined circles, bottom 32px corners, status-bar space and 84px bottom padding | Built with literal artwork values and safe-area substitution. |
| 2 | Logo | **Asset substitution:** existing `assets/cw-logo.png`, 32px high at its intrinsic 452:362 ratio. Canvas blob `64f7fa1c6b2507847de069e36da706b4` is not present in the supplied local assets, so identity with that image is unverified. |
| 3 | Support and notification buttons, unread dot | Built: 48px buttons, 14px corners, translucent white fill; dot includes navy border. Support remains hidden without `opsPhone`. |
| 4 | Truck icon, greeting/material line, date, two-line heading | Built in order, with 20px icon and 16/15/30px text. Real names, material, date and district count retained. |
| 5 | Loading heading | Built: 72% and 44% skeletons, 30px high, 12px gap. Existing skeleton motion retained. |
| 6 | Overlapping surface card | Built: -56px top margin, 16px horizontal margin, 22px radius, 18px padding, 16px gap, large shadow. |
| 7 | Progress ring, done/total heading, three-item legend | Built: 136px ring, 15px stroke, 44px centre number, 14px centre label; chronological stops and canvas degree-based gaps. |
| 8 | Divider, suggested heading, same-district chip | Built: 1px divider and canvas 28px/9px chip with map-pin-area icon. |
| 9 | Suggested stop tile, title, material chip, weight | Built directly inside the home card; no nested plan StopCard. 58px tile/18px radius/30px icon, title 18px/1.3. Material follows the live row. |
| 10 | View-details button | Built: 56px primary button, 16px radius, 17px label, directional caret and pressed scale. Existing open-stop handler retained. |
| 11 | All-done replacement block | Built: 58px seal-check tile, title and personalised subtext. |
| 12 | No-plan state | Built inside the same card: 68px clipboard tile, centred body, equal-width 54px refresh/operations controls. Operations omitted without a phone. |
| 13 | Off-day state, next-plan row, operations link | Built: coffee tile/body, bordered surface2 row with calendar icon and caret, then transparent link. Next-plan row requires a real next plan. Existing next-plan access outside the off-day card is retained for other ready day states. |
| 14 | Card loading/error states | Built: specified skeleton layout; error tile/title/body and full-width retry button. |
| 15 | Plan-change banner | Built: 44px bell-ringing tile, title/body, 44px view/dismiss buttons, border and entrance motion. Uses notification text, not prototype sentences. |
| 16 | By-district heading and all-stops link | Built: 19px heading, 44px link target and 14px caret. |
| 17 | District rows | Built: 68px minimum height, 44px state tile, name/count and 6px progress bar; completed groups use the fill check icon. |

## Today's plan — markup 274–339

| Order | Element | State |
| --- | --- | --- |
| 1 | Header back button, title, date/progress subtitle, small ring | Built: safe inset + 61px header, 48px arrow button, 21px/1.3 title, 14px subtitle, 54px ring/7px stroke. |
| 2 | Two-button filter | Built: surface2 track, 4px padding/gap, 46px buttons, 11px corners, selected shadow. Existing all/remaining filter state retained. |
| 3 | Change banner | Built: accent-soft row, 24px bell-ringing icon, real notification title/body and 44px transparent close button. |
| 4 | Any-order information line | Built: 20px info icon, 14px bold muted text. |
| 5 | District headings | Built: map-pin-area icon, 18px title, recorded/total count and completed chip. |
| 6 | Unvisited stop cards | Built: 96px minimum height, 52px storefront tile, title and suggested chip on the first line, material/weight/status on the next, draft line and directional caret. Suggested border is 2px accent; other borders are 1px transparent. |
| 7 | Completed rows | Built after unvisited stops in each group: 60px minimum height, 26px fill status icon, 15px title, material/time subtitle and trailing status chip. |
| 8 | Data-dependent tags/state | Today's attempt still decides status. No “new” tag; draft tag remains real. Empty plan and no remaining stops retain their existing meaningful states using driver drawings. |

## Stop details — markup 341–422

| Order | Element | State |
| --- | --- | --- |
| 1 | Header title, request number and status chip | Built: 20px/1.3 ellipsised title; status is beside the request number, not a separate body block. |
| 2 | Access-instructions card | Built: accent-soft background, 48px door-open tile, 13px label and 17px/1.4 instructions. Hidden when absent. |
| 3 | Address block | Built: standalone 26px map-pin icon, 13px label and 16px/1.45 address. Hidden when absent. |
| 4 | Open-location button | Built: 60px navy button, gold 26px map icon, white 18px label, pressed scale. Existing device-map action retained; requires coordinates. |
| 5 | Contact block | Built: surface2 inset block, 46px circular avatar, name/phone and 54px green call button. Contact requires a name; call requires a phone. Existing branch-phone call action is retained as an additional outlined button when supplied by the data. |
| 6 | Request heading and material chip | Built: space-between row, 17px heading, 30px material chip. |
| 7 | Declared weight | Built: 48px surface2 scales tile, 13px label and 26px/1.2 value. |
| 8 | Missing-photo block / branch photo | Built: dashed placeholder or real signed 170px image, overlaid 34px enlarge chip, then 13px caption. No synthetic scale reading is drawn over a real photo. |
| 9 | Branch note | Built: 24px chat icon, label and 15px/1.45 text inside surface2. Hidden when absent. |
| 10 | Requested-on line | Built: 14px muted text from the row timestamp. |
| 11 | Recorded result block | Built: status-coloured border, 28px fill icon, time/outcome, detail inset and 44px link-style wrong-entry action. Real reason and note are retained; with no ops number the help wording is plain text. |
| 12 | Record/continue-draft footer | Built: 12/16/28px frame and 60px primary button with 26px clipboard/note icon, hidden after today's result. Bottom padding respects a larger native inset if necessary. |

## Record outcome — markup 424–545

| Order | Element | State |
| --- | --- | --- |
| 1 | Close header and branch subtitle | Built: safe inset + 61px, 48px close button, 20px/1.3 title and 14px subtitle. Close is disabled during existing busy states. |
| 2 | Three-step bar | Built outside the scrolling body: 4/16/14px padding, 6px tracks, 8px gaps and active/inactive font weights. |
| 3 | Not-sent and offline alerts | Built before form content with the canvas's 30px icons, 14px padding, 16px corners and border colours. Real errors still retain the existing mapped error sentence where available. |
| 4 | Question and declared-weight chip | Built: 22px/1.35 heading, 34px chip and 20px scales icon. |
| 5 | Three kind cards | Built: 100px minimum height, 2px transparent borders, 20px corners, 16px padding, 64px tiles and 36px duotone icons. |
| 6 | Picked-kind strip and change button | Built: 12/14px padding, 32px icon, 18px label and 44px outlined control. |
| 7 | Photo heading and required chip | Built in the specified order and sizes. |
| 8 | Camera block | Built: 180px dashed primary block, 20px corners, 72px circular camera tile. Opens the existing phone camera; no viewfinder/gallery implementation. |
| 9 | Captured photo and retake | Built: real 180px photo, overlaid green 32px photo-ready chip, then 50px retake control. Prototype decorative boxes and fabricated reading are intentionally absent. |
| 10 | Partial reason chips | Built above the note field: 44px minimum height, 12px corners, 1.5px selected/unselected borders. Labels and IDs come from the database. |
| 11 | Partial note and information line | Built: three-line native textarea (72px line box plus padding/borders), then 20px info icon and 14px/1.45 accent text. |
| 12 | Failed-reason heading and grid | Built: two equal measured columns with a 10px gap; 92px minimum tiles, 16px corners, 2px borders, 15px/1.3 labels and 22px check badges. An odd last tile stays one column wide. |
| 13 | Database icons / Other tile | **Data exception:** database reasons have no icons; source comment explains the missing column. Other is last and has the canvas's dots-three-circle icon. |
| 14 | Other textarea and failed information line | Built: two-line field, label and muted 14px/1.45 info line. Existing validation and reason payload selection are retained. |
| 15 | Footer hint and send/retry button | Built: hint above the 60px/18px-radius button, 10/16/28px frame, sending spinner, disabled colours. Existing validation, upload/retry/draft and send handlers are unchanged. |

## Success — markup 571–595

| Order | Element | State |
| --- | --- | --- |
| 1 | Navy takeover and two outline circles | Built with literal colours, circle sizes/positions and 24px horizontal/30px bottom padding. |
| 2 | Outcome ring and check disc | Built: 136px ring, 98px disc, 52px bold check, outcome-specific literal colours and pop animation. |
| 3 | Title and branch/material line | Built: 28px/1.3 heavy title, 17px/1.4 medium translucent-white branch line. |
| 4 | Partial/failed note pill | Built: translucent fill, 20px info icon, gold 15px text and 10/14px padding. Hidden for full collection. |
| 5 | Progress heading, count, bar and final-visit line | Built: 18px top margin, 10px gold bar and green final-visit message. Values remain post-write data; a real refresh error retains a retry state. |
| 6 | Gold primary button and home text button | Built: 60px/18px-radius button with pressed scale, then 50px text control. **Brief 08 exception:** primary goes to the plan when no suggestion remains; it does not follow the prototype's final-stop home destination. |

## Next plan — markup 598–638

| Order | Element | State |
| --- | --- | --- |
| 1 | Title and view-only chip | Built: 22px/1.3 title and 32px chip with 16px lock-simple icon. |
| 2 | Plan summary card | Built: 20px corners, 16px padding, 56px calendar tile, date, stop/district summary, approval line and chip. Approval line/chip require a real approval row. |
| 3 | District headers | Built: map-pin-area, 18px title and 26px count chip. |
| 4 | Read-only stop rows | Built: 80px minimum height, 12/14px padding, 48px storefront tile with 15px corners, title then material/weight. No actionable stop affordance. |
| 5 | Loading/error/no-plan state | Built with the content-state layer drawings; empty uses calendar-blank as the canvas view model specifies. |

## History — markup 640–701

| Order | Element | State |
| --- | --- | --- |
| 1 | Header | Built: safe inset + 61px, 22px/1.3 title. |
| 2 | Period row | Built: 60px bordered row, 40px calendar tile, 13px period label, 17px real date range and trailing 14px change label; pressed scale opens the period sheet. |
| 3 | Four-way filter | Built: 44px buttons, 14px labels, 4px track padding/gaps, selected surface and shadow. |
| 4 | Ring card | Built: 14/16px padding, 20px radius, 96px ring/11px stroke, 28px count/12px label, three-item legend. Segments group full/partial/failed as `hv.ringBg` does. |
| 5 | Collapsible day headings | Built: 52px minimum row, 17px heading, 13px summary, 36px/11px-radius caret tile. Existing expand/collapse state retained. |
| 6 | Visit rows | Built: 72px minimum height, 12/14px padding, 16px corners, 44px fill-status tile, title/subtitle, 26px outcome chip and time. Unreadable requests still render the existing request fallback and attempt data. |
| 7 | Period-empty block | Built: 80px history tile, 19px title, body and 52px period-change action. Global empty/loading/error uses the separate content-state presentation. |
| 8 | Wrong-entry link and sheets | Built: 48px centred link; no ops phone keeps plain wording. Period and visit sheets are detailed below. |

## Notifications — markup 703–723

| Order | Element | State |
| --- | --- | --- |
| 1 | Header | Built: back arrow, 21px/1.3 title and bottom border. |
| 2 | Notification cards | Built: 18px corners, 14px padding, 1.5px primary unread border, shadow and 12px row gap. Change notifications use accent bell-ringing; other plan notifications use success calendar-check; other notices use the primary clipboard tile. |
| 3 | Tile, title/time row, body, unread dot | Built in that order: 48px/15px-radius tile, 16px title and 13px time sharing a row, 14px body, 10px dot. Text and timestamps remain live. |
| 4 | Actions and content states | Existing mark-read and navigation handlers retained; non-actionable notices remain non-actionable. Loading/error/empty drawings use the driver layer; read failure retains retry. |

## Account — markup 725–768

| Order | Element | State |
| --- | --- | --- |
| 1 | Header | Built: 22px/1.3 title. |
| 2 | Profile card | Built: 20px corners, 16px padding, 64px navy/gold initials disc, 20px name, truck icon/material line. |
| 3 | Phone/city boxes | Built: equal-width surface2 boxes, 10/12px padding, 13px labels and 15px values. City remains conditional on live data. |
| 4 | Language row | Built: translate icon/label, then two 48px segmented choices. Existing preference update retained. |
| 5 | Theme row | Built: palette icon/label, then three 48px choices with sun/moon/circle-half icons. Existing light/dark/system preferences retained. |
| 6 | Password, operations and logout rows | Built as 60px transparent rows in one clipped surface card with separators, 24px icons and directional carets. Operations omitted without a phone; logout uses danger text without a caret. |
| 7 | Version | Built: centred 13px muted text from existing copy. |
| 8 | Logout confirmation | Built with the sheet below. Existing sign-out/busy/error handling retained. Preference-storage failures use the existing generic error toast. |

## Voluntary password change — markup 90–120, change mode

| Order | Element | State |
| --- | --- | --- |
| 1 | Scroll frame and back button | Built: safe inset + 12px top, 20px sides, 24px bottom, 22px gaps, 48px back arrow. |
| 2 | Password tile, title and subtitle | Built: 64px/20px-radius accent tile, 34px icon, 26px/1.3 title and 16px change-mode subtitle. |
| 3 | Current-password field | **Required existing behaviour retained:** an additional field precedes the canvas's new/confirm fields because `changeOwnPassword` requires current-password proof. Drawn with the same 60px/14px-radius field values. |
| 4 | New and confirmation fields | Built: labels, 60px height, 1.5px borders, 16px horizontal padding, 24px heavy centred text, 10px letter spacing and six-dot placeholders. Confirmation border reacts to mismatch. |
| 5 | Keyboard and reveal control | **Required existing behaviour retained:** standard password keyboard, not numeric-only; real rules require eight or more characters including letters/numbers. Existing reveal/hide control remains, using driver Phosphor icons and text-button styling. |
| 6 | Rules card | Built: 16px padding, 18px corners, shadow, 12px gaps, 22px check/dashed-circle icons and 15px bold labels. Existing current-password rule remains in addition to the three canvas rows. |
| 7 | Error and save footer | Built: existing error wording, then 12/20/28px footer and 58px/16px-radius save button with directional caret. Existing current-password verification/change call remains; save is disabled while invalid/busy. Forced `/change-password` is untouched. |

## Content states and initial driver context — markup 769–798

| Order | Element | State |
| --- | --- | --- |
| 1 | Content-state region | Built within the native content area below the safe-area-adjusted header and above navigation; 16px padding and 12px gaps. |
| 2 | Loading | Built: 54px/14px-radius skeleton followed by four surface rows, each with 52px tile and 70%/46% text skeletons. Existing opacity motion replaces CSS shimmer. |
| 3 | Error | Built: centred 76px warning tile, 20px title, 16px body, 56px retry, 60px bottom offset. |
| 4 | Empty | Built: centred 84px tile, 20px/1.35 title, 16px body and 60px bottom offset. Icons/copy follow each screen's content state. |
| 5 | Initial context request | **Live-data adaptation:** before identity exists, show the logo/hero skeleton and overlapping loading/error card without inventing greeting data or working navigation. `renderPending` exposes only the display state/retry needed for this. Its offline notice retries the initial context request. |

## Bottom navigation — markup 799–809

| Order | Element | State |
| --- | --- | --- |
| 1 | Navigation frame | Built: 88px height, 8/6/22px padding, surface fill, top border and its own upward shadow/elevation. |
| 2 | Four tab controls | Built: equal widths, 56px minimum target, 3px gap, 58×30px pill, 24px Phosphor icon and 13px label. Active icons use fill/primary/800; inactive use duotone/muted/700. |

## Offline toast — markup 810–818

| Order | Element | State |
| --- | --- | --- |
| 1 | Frame | Built: 12px side offsets, 16px corners, toast token, large shadow, 8px padding with 14px inline-start padding and 10px gap; up animation. |
| 2 | Icon and two text lines | Built: 26px red wifi-slash, 15px heavy title and 13px medium 80%-opacity subtitle; light/dark foreground follows the canvas. |
| 3 | Retry control | Built: 44px gold button, 12px corners, 14px label/padding; calls existing `data.retry`. |
| 4 | Placement/visibility | Built: bottom 100px over tabs, 24px on other eligible pages. As `toast.on` specifies, outcome owns its offline alert; success and password omit the toast. No driver `OfflineBar` remains. |

## Enlarged photo — markup 819–838

| Order | Element | State |
| --- | --- | --- |
| 1 | Dark modal frame and header | Built: literal `#05080C`, safe inset + 5px, 48px circular translucent close button, 20px bold X and 17px title. |
| 2 | Image | Built with the real signed image, 470px target height and contain fit; it can shrink to the available native height. Prototype scene geometry and invented scale digits are intentionally absent. |
| 3 | Bottom caption | Built: declared label and actual weight, 20px sides/34px bottom, translucent-white label and heavy white value. |

## Operations sheet — markup 839–852

| Order | Element | State |
| --- | --- | --- |
| 1 | Scrim/frame/handle | Built: native Modal/backdrop/back handling, 26px top corners, 10/20/32px padding, 16px gaps, 44×5px handle. This is a driver-local frame because shared Sheet exposes no frame-style props. Larger native bottom insets remain respected. |
| 2 | Tile and heading/body | Built: 56px/18px-radius primary-soft headset tile, 30px icon, 20px heading and 15px body. |
| 3 | Phone row | Built: surface2, 14px padding/radius, 14px label and 17px formatted live number. |
| 4 | Call button | Built: 58px green button, 16px corners, 22px bold phone, 18px label, pressed scale; existing device call and failure feedback retained. Entire sheet requires an ops phone. |

## Logout sheet — markup 853–861

| Order | Element | State |
| --- | --- | --- |
| 1 | Common frame/handle | Built with the driver sheet values above. |
| 2 | Logout tile and title/body | Built: 56px danger tile, 30px sign-out icon, 20px title and 15px body. |
| 3 | Confirm and cancel | Built: 58px literal-red/white confirmation and 52px transparent outlined cancel, both 16px corners. Existing busy/error handling retained. |

## Period sheet — markup 862–889

| Order | Element | State |
| --- | --- | --- |
| 1 | Common frame, title and close | Built: 20px title, 44px/12px-radius close control, 18px X. |
| 2 | Four quick ranges | Built: wrapping 42px minimum chips, 14px padding, 12px corners, selected borders/fills; dates remain live. |
| 3 | From/to boxes | Built: equal columns, 10px gap, 8/12px padding, 2px selected border, label and date. Existing selectable from/to behaviour retained. |
| 4 | Month and calendar | Built: seven columns, 24px weekday row, 44px date cells, 4px row gaps, 12px cell radius, range colours and 500/800 weights. **Existing behaviour retained:** previous/next-month controls remain around the month label so historical months remain reachable; the prototype only drew its fixed month. |
| 5 | Apply button | Built: 56px primary button, 16px corners, 17px label and pressed scale; existing range state update retained. |

## Visit sheet — markup 890–915

| Order | Element | State |
| --- | --- | --- |
| 1 | Common frame and header | Built: 52px/16px-radius outcome tile with 28px fill icon, 18px/1.3 title, 14px timestamp and 44px close control. |
| 2 | Outcome and material chips | Built together in one wrapping row, 32px height/10px corners/14px text. Material omitted when its request is no longer readable. |
| 3 | Driver photo | Built: 13px caption first, then real signed 150px image with 16px corners; no fabricated reading. |
| 4 | Detail blocks | Built: surface2, 12/14px padding, 14px corners, 13px label and 15px/1.45 text. Both reason and note remain when present rather than dropping real information to imitate a sample. |
| 5 | Wrong-entry link | Built: 48px centred 14px link and 18px headset; plain text with no ops phone. |

## Error wording and remaining verification

Existing generic driver error wording remains reachable for context/day/next/history/reason/notification fetches, notification mark-read, signed-photo loading, camera permission/capture failures, unavailable maps/call handlers, and send/auth failures without a specific mapped message. Preference persistence errors now use that same existing sentence. No new error copy or backend behaviour was introduced.

Required build/static checks passed. No phone runtime or screenshot-diff verification was performed in this run. The unresolved artwork limitation is the unavailable original driver logo blob; the existing app logo substitution is explicitly listed above.
