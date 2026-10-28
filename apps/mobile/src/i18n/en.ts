/**
 * English copy, lifted verbatim from the approved prototypes' `T.en` dictionaries.
 * Same rules and the same three `[changed]` edits as `ar.ts` — see that file's header.
 *
 * No prototype sample value survives in either namespace. The branch dictionary ended with
 * `chainV`, `cityV`, `districtV`, `branchTitle` and `addressV`, and the driver's carried its demo
 * driver's name, city, truck, dates and sample notifications; all of it is demo data dressed as
 * copy, so a sentence that held it now takes a `{placeholder}` and a bare value is gone. The real
 * ones come from `branches` / `chains` / `districts` / `drivers` / `materials`, and notification
 * text from `notifications.title_en` / `body_en`.
 *
 * Placeholders in use: `{name}` the driver, `{material}` their material, `{branch}` a branch's
 * label, `{date}` a formatted day, `{when}` a formatted time, `{n}` a count.
 */

export const en = {
  shared: {
    // Main's material/subtype hints and map label live outside its T dictionary; the screens still need them.
    materialHintCard: 'Flattened boxes and cartons',
    materialHintPlas: 'Mixed or stretch film',
    materialHintPaper: 'Office and printed paper',
    materialHintMetal: 'Iron, copper or aluminium',
    materialHintBread: 'Dry and surplus bread',
    subtypeHintMix: 'Mixed bottles and plastic items',
    subtypeHintStretch: 'Pallet and shipment wrap film',
    subtypeHintIron: 'Shelves, iron parts and scrap',
    subtypeHintCopper: 'Copper wires and pipes',
    subtypeHintAluminium: 'Drink cans and aluminium trays',
    mapStreet: 'Prince Majed St',
    roleBranch: 'Branch',
    roleDriver: 'Driver',
    wrongSideBranch: 'This is a driver account. Switch to "Driver" and sign in there.',
    wrongSideDriver: 'This is a branch account. Switch to "Branch" and sign in there.',
    accountInactive: 'This account is disabled. Contact the Operations team.',
    samePassword: 'Choose a password different from the temporary one.',
    loading: 'Loading…',
    arabic: 'Arabic',
    english: 'English',
    phonePrefix: '+966',
    phonePlaceholder: '5X XXX XXXX',
    noChains: 'No chains are available. Contact the Operations team.',
    unsupportedRole: 'This account cannot use the branch or driver app.',
    forgotNoPhone: 'Contact the Operations team to reset your password.',
    // Neither design drew a "hide" label for a single password field: the branch pairs the singular
    // `showPass` with the plural `hidePw` from its two-field screen. This is that pair's missing
    // singular half, worded off `showPass` — confirm it at the design review.
    hidePassword: 'Hide password',
    modeLabel: 'Account type',
    // The three onboarding slides. Their text is written into the canvas's markup rather than its
    // `T` dictionary, which is why the phase 0 extraction missed them — lifted verbatim here.
    onbNext: 'Next', startNow: 'Get started', skip: 'Skip', onbStep: '{n} of 3',
    onb1T: 'Request a pickup in a minute', onb1B: 'Choose the material and enter the weight. Operations sets the visit day.',
    onb2T: 'We tell you the visit day', onb2B: 'You get a notification with the visit day, and a reminder that morning.',
    onb3T: 'All your requests in one place', onb3B: 'Follow each request’s status and every visit outcome.',
    // Neither canvas drew a refused permission — it had no real camera or GPS to refuse. These are
    // written to match the voice around them and are flagged for design review.
    camDenied: 'Camera permission was not granted. Turn it on in your phone settings, or pick a photo from the gallery.',
    galDenied: 'Photo permission was not granted. Turn it on in your phone settings.',
    locDenied: 'Location permission was not granted. Turn it on in your phone settings, or drag the pin on the map yourself.',
    locFailed: 'Couldn’t find your location. Drag the pin on the map yourself.',
  },
  branch: {
    next: 'Continue', splashA: 'Easier pickups for your branch', splashB: 'Clouds Water for Branches',
    loginTitle: 'Welcome, branch team', loginSub: 'Log in with the branch account the Operations team sent you.',
    phone: 'Mobile number', pass: 'Password', showPass: 'Show password', login: 'Log in', loggingIn: 'Logging in…', forgot: 'Forgot password?',
    errPhone: 'Enter a 9-digit mobile number starting with 5.', errPass: 'Enter the password.', loginOff: 'No connection. Check the internet and try again.', sharedNote: 'One shared account for all branch staff.',
    chainPh: 'Select chain', errChain: 'Select the chain.', errBranch: 'Enter the branch number.', passHint: 'First login? Use the 6-digit temporary password from Operations.', badLogin: 'Chain, branch number or password is wrong. {n} of 5 attempts left.', lockMsg: 'Login is paused after 5 wrong attempts. Try again in 15 minutes, or contact Operations.',
    contactT: 'Request contact', contactHint: 'The driver calls this person on the visit day.', cName: 'Name', cNamePh: 'e.g. Mohammed Alharbi', cPhone: 'Mobile number', errCName: 'Enter the contact name.', noPhoto: 'No photo',
    forgotT: 'Forgot password?', forgotB: 'The Operations team resets the branch password. Contact them on this number:',
    opsT: 'Operations team', opsB: 'For any question about the branch account, location or requests.', call: 'Call', whatsapp: 'WhatsApp', close: 'Close', copy: 'Copy', copied: 'Copied', dialToast: 'In the app, this opens the call directly.',
    pwdT: 'Change the temporary password', pwdSub: 'The 6-digit temporary password works for the first login only. Choose a new password for the branch account and share it with the branch staff.', pwdHdr: 'New password', pwdChangeT: 'Change password', pwdChangeSub: 'The new password applies on every device the branch staff use.',
    curPass: 'Current password', newPass: 'New password', confPass: 'Confirm password', showPw: 'Show passwords', hidePw: 'Hide passwords',
    r1: 'At least 8 characters', r2: 'Contains a letter and a number', r3: 'Confirmation matches', r0: 'Enter the current password', saving: 'Saving…', savePass: 'Save and continue', savePass2: 'Save password', passSaved: 'New password saved',
    locT: 'Set branch location', locOnce: 'One time', locWarnT: 'Make sure you are inside the branch now', locWarnB: 'The driver comes to this location. Once confirmed, only Operations can change it.',
    locHint: 'Drag the pin or tap the map to place it at the branch entrance.', useMine: 'Use my current location', confirmLoc: 'Confirm location', locating: 'Finding your location…',
    deniedT: 'We can’t access your location', deniedB: 'Location permission is off. Tap the map to place the pin on the branch yourself.', placePin: 'Tap the map to place the pin',
    locConfT: 'Confirm branch location?', locConfB: 'This location is used for every visit. To change it later you need to contact Operations.', yesLoc: 'Yes, confirm location', back: 'Back', locSaved: 'Branch location saved',
    heroQ: 'Got materials to collect?', heroA: 'We’ll set a visit day and notify you', newReq: 'New pickup request', support: 'Support', notifs: 'Notifications',
    nextVisit: 'Your next visit', inDays: 'In {n} days', in2: 'In 2 days', tomorrow: 'Tomorrow', today: 'Today',
    noVisitT: 'No visit day set yet', noVisitB: 'Your requests are waiting for a visit day. We’ll notify you as soon as it’s set.', emptyT: 'No current requests', emptyB: 'When materials pile up, send a request and we’ll set a visit day.',
    activeReqs: 'Your current requests', seeAll: 'See all', tipsT: 'Get materials ready', tip1: 'Keep each material separate', tip2: 'Place them near the loading area', tip3: 'Weigh the material before sending the request',
    navHome: 'Home', navReqs: 'My requests', navNotifs: 'Notifications', navAcc: 'Account', navLabel: 'Main navigation',
    loadErrT: 'Couldn’t load your data', loadErrB: 'Check the connection and try again.', retry: 'Retry', offT: 'No internet connection', offB: 'What you entered stays on screen.',
    stepMat: 'Material', stepWt: 'Weight & details', stepRev: 'Review', stepOf: '{n} / 3',
    matQ: 'Which material are you handing over?', matSub: 'One material per request. Locked materials already have an open request.', hasOpen: 'You already have an open request for this material', viewIt: 'View it', hasOpenAll: 'Every type of this material has an open request', viewThem: 'View them', partialOpen: 'Open request: {s}', subQ: 'Which type of {m}?', subSub: 'Each type is its own request with its own weight and photo.', subOpen: 'You already have an open request for this type',
    material: 'Material', change: 'Change', weight: 'Weight', kgUnit: 'kg', weightHint: 'The number on the scale, in whole kilograms.',
    errW0: 'Enter the weight in kilograms.', errWmin: 'The minimum is 1 kg.', errWmax: 'The maximum is 5,000 kg. For more, contact the manager.', warnW: 'That’s a large weight. Please double-check it.',
    photo: 'Scale photo', required: 'Required', optional: 'Optional', photoGuide: 'Photograph the material on the scale so the number is clearly visible.', takePhoto: 'Take photo', gallery: 'From gallery', uploading: 'Uploading photo…', photoOk: 'Photo uploaded', retake: 'Retake', remove: 'Remove',
    errPhoto: 'Add the scale photo to continue.', photoFail: 'Couldn’t upload the photo: no connection. Try again when you’re back online.',
    note: 'Note for the driver', notePh: 'e.g. Materials are at the back loading door', toReview: 'Next: review request', fixErrs: 'Complete the fields marked in red to continue.',
    revT: 'Review before sending', noNote: 'No note', edit: 'Edit', opsLine: 'The Operations team will set the visit day and notify you.', send: 'Send request', sendAgain: 'Send again', sending: 'Sending…',
    sendFail: 'Couldn’t send: no connection. Your details are kept; try again when you’re back online.', saveEdit: 'Save changes', editT: 'Edit request', editLock: 'The material can’t change when editing. For a different material, send a new request.', edited: 'Changes saved',
    okT: 'Request sent', okB: 'We’ll set the visit day and notify you. You can edit or cancel until the visit day is approved.', goHome: 'Back to home', viewReq: 'View request',
    reqNo: 'Request {id}', no: 'No. {id}', branchPhoto: 'Scale photo from the branch', visitDay: 'Visit day', notSet: 'Not set yet', history: 'Request history', outcomes: 'Visit outcomes',
    editHint: 'You can edit or cancel until the visit day is approved.', cancelReq: 'Cancel request', lockedT: 'To edit or cancel, contact the manager', contactMgr: 'Contact the manager', againSame: 'New request for this material',
    cancelQ: 'Cancel the {m} request?', cancelB: 'The driver won’t visit for this request. You can send a new one any time.', yesCancel: 'Yes, cancel request', keep: 'Keep request', cancelledT: 'Request cancelled',
    mgrT: '{m} manager', mgrB: 'Follows up {m} requests and can edit or cancel a request or change its visit day.',
    reqsT: 'My requests', tabActive: 'Active', tabPast: 'Past', all: 'All', noActiveT: 'No active requests', noActiveB: 'Send a pickup request when your materials are ready.', noPastT: 'No past requests', noPastB: 'Collected, closed and cancelled requests show here.', noFilterT: 'No {m} requests here', noFilterB: 'Try another material or show all.', showAll: 'Show all materials',
    notifsT: 'Notifications', markAll: 'Mark all as read', noNotifT: 'No notifications', noNotifB: 'Visit days and visit outcomes appear here.', newL: 'New',
    accT: 'Account', sharedAcc: 'Shared account for branch staff', chain: 'Chain', branchNo: 'Branch no.', city: 'City', district: 'District', address: 'Address', savedLoc: 'Branch location', viewOnly: 'View only', locLocked: 'To change the location, contact Operations.',
    language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System', changePass: 'Change password', contactOps: 'Contact Operations', logout: 'Log out',
    logoutQ: 'Log out of the branch account?',
    // [changed] was: 'You’ll need the mobile number and password to log in again.'
    logoutB: 'You’ll need the chain, branch number and password to log in again.',
    yesLogout: 'Yes, log out', version: 'Version 1.0.0',
    st_await: 'Waiting for a visit day', st_resched: 'Being rescheduled after a failed pickup', st_sched: 'Visit on {d}', st_dec: 'Being followed up by the manager', st_done: 'Collected', st_closed: 'Request closed', st_cancel: 'Cancelled',
    sub_await: 'We’ll notify you as soon as the visit day is set.', sub_sched: 'Have the materials near the loading area before the visit day.', sub_dec: 'The manager will contact you if anything is needed.', sub_done: 'Completed on the {d} visit.', sub_closed: 'Reason: {r}', sub_cancel: 'Cancelled by the branch before the visit day was approved.', sub_resched: 'Last visit: {o}. We’ll notify you of the new day.',
    ev_created: 'Request sent', ev_edited: 'Request edited', ev_sched: 'Visit day set: {d}', ev_fail: 'Pickup failed: {r}', ev_mis: 'Quantity didn’t match, manager following up', ev_done: 'Collected', ev_requeue: 'Manager sent it back for a new day', ev_closed: 'Request closed: {r}', ev_cancel: 'Cancelled by the branch', pend_sched: 'Visit day to be set', pend_visit: 'Driver visit: {d}', pend_dec: 'Manager decision',
    o_fail: 'Pickup failed: {r}', o_mis: 'Collected quantity didn’t match, manager following up', o_done: 'Collected',
    r_shop: 'branch closed', r_unavail: 'materials not available after several attempts', r_mgr: 'manager decision after follow-up',
    n_sched: '{m} visit day set', n_sched_b: 'Visit on {d}. Request {id}.', n_morning: 'The driver visits today for {m}', n_morning_b: 'Have {kg} ready near the loading area.', n_fail: '{m} pickup failed', n_fail_b: '{d} visit: {r}. We’ll set a new day and notify you.', n_mis: '{m} request with the manager', n_mis_b: 'The quantity collected on {d} didn’t match the request.', n_done: '{m} collected', n_done_b: 'Request {id} completed on the {d} visit.', n_closed: '{m} request closed', n_closed_b: 'Reason: {r}.', n_requeue: '{m} request back for a new day', n_requeue_b: 'The manager decided to reschedule request {id}.',
    sched_toast: '{m} visit set: {d}',
  },

  driver: {
    appName: 'Driver app', tagline: 'Your day’s plan in one place', 'continue': 'Continue', back: 'Back', close: 'Close',
    // [changed] sign-in is one screen for both roles now, redrawn in the branch canvas
    // (Main.dc.html 171–247), and its driver wording replaces what the driver canvas's own
    // sign-in screen said. Was: 'Welcome' / 'Sign in to see your day’s plan'
    loginHello: 'Welcome, driver', loginSub: 'Log in with your mobile number and the password Operations sent you.', mobile: 'Mobile number',
    // [changed] PIN -> password, here and in every string below that mentioned it
    password: 'Password', showPw: 'Show password',
    login: 'Sign in', signingIn: 'Signing in…', forgot: 'Forgot password?', loginErr: 'Wrong mobile number or password', accountsNote: 'Accounts are created by the Operations team',
    cpTitle: 'Set a new password', cpSubFirst: 'This is your first sign-in. Replace the 6-digit temporary password with one of your own.', cpSubChange: 'Choose a new password.',
    newPw: 'New password', confirmPw: 'Re-enter password',
    // [changed] the driver's rules are now the branch's rules
    rule8: 'At least 8 characters', ruleNum: 'Contains a letter and a number', ruleMatch: 'Confirmation matches', saveContinue: 'Save and continue',
    hi: 'Hi {name}', truckLine: '{material} truck',
    inDistricts: 'across {n} districts', progress: 'Today’s progress', suggested: 'Suggested next stop', sameDistrict: 'Same district', openDetails: 'Open details',
    allStops: 'All visits', byDistrict: 'By district', allDoneTitle: 'Today’s plan is done', allDoneSub: 'Well done, {name}. Every visit is recorded.',
    noPlanHead: 'No approved plan', noPlanSub: 'for today yet', noPlanBody: 'Your visits will appear here as soon as Operations approves the plan. We’ll notify you.',
    refresh: 'Refresh', contactOps: 'Contact Operations', offHead: 'You’re not scheduled', offSub: 'to work today',
    offBody: 'Operations marked you as not working today. If that’s wrong, contact them.', nextPlan: 'Your next plan', nextPlanValue: '{date} · {n} visits',
    view: 'View', planChangedTitle: 'Today’s plan changed', planChangedBody: 'Visit added: {branch}', gotIt: 'Got it',
    support: 'Support', notifAria: 'Notifications', navAria: 'Main navigation', navToday: 'Today', navUpcoming: 'Next', navHistory: 'History', navAccount: 'Account',
    planTitle: 'Today’s plan', filter: 'Filter visits', remaining: 'Remaining', all: 'All', anyOrder: 'Visit branches in any order you like',
    districtDone: 'Complete', newTag: 'New', suggestedTag: 'Suggested', draftTag: 'Draft saved – not sent',
    st_todo: 'Not visited', st_full: 'Done', st_partial: 'Different qty', st_failed: 'Failed', kg: 'kg',
    request: 'Request', address: 'Address', access: 'Access instructions', callBranch: 'Call branch', openMaps: 'Open in your phone’s Maps',
    declared: 'Weight declared by branch', branchPhoto: 'Branch’s scale photo', tapEnlarge: 'Tap to enlarge', branchNote: 'Branch note',
    requestedOn: 'Requested on', record: 'Record visit outcome', continueDraft: 'Continue recording', recordedAs: 'Recorded',
    wrongEntry: 'Recorded the wrong outcome? Contact Operations',
    outcomeTitle: 'Visit outcome', step1: '1 · Outcome', step2: '2 · Proof', step3: '3 · Send', question: 'Did you collect the stated quantity?',
    oFull: 'Yes, all of it', oFullSub: 'Photo of the scale, then send – closes the request', oPartial: 'No, the quantity differs', oPartialSub: 'Scale photo + a note – needs a decision',
    oFailed: 'Pickup failed', oFailedSub: 'Pick a reason – no photo',
    rFull: 'Collected in full – request closed', rPartial: 'Different quantity – needs decision', rFailed: 'Pickup failed – needs decision', declaredQ: 'Stated by branch: {n}', change: 'Change', scalePhoto: 'Scale photo', required: 'Required',
    takePhoto: 'Photograph the scale', photoHint: 'Make the scale number clearly visible', retake: 'Retake', photoOk: 'Photo ready',
    noteLabel: 'What’s the difference and why?', notePh: 'e.g. Got about half, the rest wasn’t ready', quick1: 'Less than stated', quick2: 'Part wasn’t ready', quick3: 'Part doesn’t match',
    toManagerPartial: 'The request will move to “Needs decision” for the supervisor.', reasonLabel: 'Why did the pickup fail?',
    r_closed: 'Branch closed', r_notReady: 'Branch not ready', r_noOne: 'No one in charge', r_noMat: 'No materials', r_noReach: 'Couldn’t reach location', r_other: 'Other',
    otherLabel: 'Type the reason', otherPh: 'Type the reason briefly', toManagerFailed: 'The request will move to “Needs decision” so the supervisor can reschedule or close it.',
    send: 'Send', sending: 'Sending…', notSent: 'Not sent – try again', keptData: 'Your photo and choice are saved. Nothing is lost.', retry: 'Retry',
    offline: 'No internet connection', offlineSub: 'Your data stays on screen. Retry when you’re back online.', toastSub: 'We’ll refresh when you’re back online',
    needPhoto: 'Take the scale photo first', needNote: 'Write the difference and why', needReason: 'Pick a reason', needOther: 'Type the reason',
    camHint: 'Fit the scale number inside the frame', capture: 'Take photo',
    sFullTitle: 'Collected – request closed', sPartialTitle: 'Pickup recorded', sPartialSub: 'Quantity differs – request now “Needs decision”', sFailedTitle: 'Failed pickup recorded', sFailedSub: 'Request now “Needs decision” for the supervisor',
    todayProgress: 'Today’s progress', next: 'Next visit', toPlan: 'Back to plan', backHome: 'Home', lastDone: 'That was today’s last visit',
    upTitle: 'Next plan', viewOnly: 'View only', approved: 'Approved', upEmpty: 'Your next plan isn’t approved yet', upEmptySub: 'You’ll be notified as soon as Operations approves it.',
    approvedAt: 'Next working day · approved {when}',
    contactLabel: 'Requested by', callContact: 'Call requester', noBranchPhoto: 'The branch didn’t attach a scale photo', noBranchPhotoSub: 'Go by the stated weight and photograph the scale at pickup.',
    lockedTitle: 'Sign-in paused', lockedBody: '5 wrong attempts. Try again in 15 minutes, or contact Operations to unlock.',
    // [changed] twice: PIN -> password, then the redrawn sign-in screen's own wording, which
    // names the field that was wrong and counts out of five. Was: 'Wrong PIN – {n} left'
    loginErrN: 'Mobile number or password is wrong. {n} of 5 attempts left.',
    left: 'visits left', left1: 'visit left', leftShort: 'left',
    period: 'Period', changePeriod: 'Change period', rangeTitle: 'Choose a period', from: 'From', to: 'To', qToday: 'Today', qYesterday: 'Yesterday', q7: 'Last 7 days', qMonth: 'This month',
    apply: 'Show results', f_all: 'All', rangeEmpty: 'No visits in this period', rangeEmptySub: 'Try another period or filter.',
    visitsUnit: 'visits', driverPhoto: 'Scale photo you sent', genNote: 'Part of the quantity wasn’t ready', noteLbl: 'Your note', reasonLbl: 'Reason', todayW: 'Today', yestW: 'Yesterday',
    histTitle: 'History', today: 'Today – {date}', yesterday: 'Yesterday – {date}', histEmpty: 'No recorded visits yet', histEmptySub: 'Visits appear here after you record their outcome.',
    notifTitle: 'Notifications', unread: 'Unread', notifEmpty: 'No notifications', notifEmptySub: 'Updates about your plans will appear here.',
    accTitle: 'Account', cityLabel: 'City', mobileLabel: 'Mobile',
    language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System', changePw: 'Change password', logout: 'Log out',
    logoutQ: 'Log out?', logoutBody: 'You’ll need your mobile number and password to sign in again.', cancel: 'Cancel', version: 'Version 1.0.0',
    opsTitle: 'Operations team', opsBody: 'For questions about your plan, account or password.', opsNumber: '[Operations number]', call: 'Call',
    errTitle: 'Couldn’t load', errBody: 'Check your connection and try again.', doneOf: '{x} of {n} done', head: 'Today’s plan: {n} visits', visitsOf: '{x} of {n} visits',
    remainingN: 'Remaining ({n})', allN: 'All ({n})', daySummary: '{n} visits',
  },
} as const;
