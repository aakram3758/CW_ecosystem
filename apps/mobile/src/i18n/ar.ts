/**
 * Arabic copy, lifted verbatim from the approved prototypes' `T.ar` dictionaries — the branch
 * canvas and the driver canvas. This is the approved wording: change a string here only when the
 * design changes, never to make a screen fit.
 *
 * The two namespaces are kept whole and separate. Some strings happen to be identical in both
 * (`light`, `dark`, `logout`, `version`…); they are not merged, because the two designs were
 * approved independently and silently unifying their copy would be a design decision.
 *
 * Marked `[changed]` below are the approved changes applied during extraction:
 *   · branch `logoutB` — says "chain and branch number" instead of "mobile number"
 *   · driver login + password screens — the permanent 6-digit PIN became a password on the
 *     branch's rule (8+ characters, a Latin letter and a digit), so every "PIN" became "password"
 *   · driver password rules — now the branch's three rules
 *
 * The driver's demo data is bound to real data rather than frozen in the copy: sentences that
 * carried it take a placeholder (`hi`, `allDoneSub`, `truckLine`, `inDistricts`, `nextPlanValue`,
 * `planChangedBody`, `approvedAt`, `today`, `yesterday`), and values that were only demo data are
 * gone, because a row supplies them — the driver's name and initials, the city, the formatted
 * dates and month, the material name, and the four sample notifications with their timestamps
 * (real ones arrive as `notifications.title_ar` / `body_ar`, already written by the database).
 *
 * The branch `phone` / `errPhone` keys are the *contact person's* mobile on the create-request
 * screen, not a sign-in field: the branch signs in with chain + branch number.
 */

export const ar = {
  branch: {
    next: 'متابعة', splashA: 'استلام أسهل لمواد فرعك', splashB: 'ماء الغيوم للفروع',
    loginTitle: 'أهلًا بفرعك', loginSub: 'سجّل الدخول بحساب الفرع الذي أرسله لك فريق التشغيل.',
    phone: 'رقم الجوال', pass: 'كلمة المرور', showPass: 'إظهار كلمة المرور', login: 'تسجيل الدخول', loggingIn: 'جارٍ تسجيل الدخول…', forgot: 'نسيت كلمة المرور؟',
    errPhone: 'أدخل رقم جوال من 9 أرقام يبدأ بـ 5.', errPass: 'أدخل كلمة المرور.', loginOff: 'لا يوجد اتصال. تحقق من الإنترنت ثم أعد المحاولة.', sharedNote: 'حساب واحد مشترك لكل موظفي الفرع.',
    chainPh: 'اختر السلسلة', errChain: 'اختر السلسلة.', errBranch: 'أدخل رقم الفرع.', passHint: 'أول دخول؟ استخدم كلمة المرور المؤقتة (6 أرقام) من فريق التشغيل.', badLogin: 'السلسلة أو رقم الفرع أو كلمة المرور غير صحيحة. باقي {n} من 5 محاولات.', lockMsg: 'أوقفنا الدخول مؤقتًا بعد 5 محاولات خاطئة. حاول بعد 15 دقيقة، أو تواصل مع فريق التشغيل.',
    contactT: 'صاحب الطلب', contactHint: 'السائق يتصل بهذا الشخص يوم الزيارة.', cName: 'الاسم', cNamePh: 'مثال: محمد الحربي', cPhone: 'رقم الجوال', errCName: 'أدخل اسم صاحب الطلب.', noPhoto: 'بدون صورة',
    forgotT: 'نسيت كلمة المرور؟', forgotB: 'يعيد فريق التشغيل تعيين كلمة مرور الفرع. تواصل معهم على هذا الرقم:',
    opsT: 'فريق التشغيل', opsB: 'لأي استفسار عن حساب الفرع أو موقعه أو طلباته.', call: 'اتصال', whatsapp: 'واتساب', close: 'إغلاق', copy: 'نسخ', copied: 'تم النسخ', dialToast: 'في التطبيق يفتح هذا الزر الاتصال مباشرة.',
    pwdT: 'غيّر كلمة المرور المؤقتة', pwdSub: 'كلمة المرور المؤقتة (6 أرقام) لأول دخول فقط. اختر كلمة مرور جديدة لحساب الفرع، وشاركها مع موظفي الفرع.', pwdHdr: 'كلمة مرور جديدة', pwdChangeT: 'تغيير كلمة المرور', pwdChangeSub: 'كلمة المرور الجديدة تسري على كل الأجهزة التي يستخدمها موظفو الفرع.',
    curPass: 'كلمة المرور الحالية', newPass: 'كلمة المرور الجديدة', confPass: 'تأكيد كلمة المرور', showPw: 'إظهار كلمات المرور', hidePw: 'إخفاء كلمات المرور',
    r1: '8 أحرف على الأقل', r2: 'تحتوي على حرف ورقم', r3: 'التأكيد مطابق', r0: 'أدخل كلمة المرور الحالية', saving: 'جارٍ الحفظ…', savePass: 'حفظ ومتابعة', savePass2: 'حفظ كلمة المرور', passSaved: 'تم حفظ كلمة المرور الجديدة',
    locT: 'حدد موقع الفرع', locOnce: 'مرة واحدة', locWarnT: 'تأكد أنك داخل الفرع الآن', locWarnB: 'يصل السائق إلى هذا الموقع. بعد التأكيد لا يتغير إلا عبر فريق التشغيل.',
    locHint: 'اسحب الدبوس أو اضغط على الخريطة لضبطه على مدخل الفرع.', useMine: 'استخدم موقعي الحالي', confirmLoc: 'تأكيد الموقع', locating: 'جارٍ تحديد موقعك…',
    deniedT: 'لا نستطيع الوصول لموقعك', deniedB: 'إذن الموقع مرفوض. اضغط على الخريطة لوضع الدبوس على مكان الفرع يدويًا.', placePin: 'اضغط على الخريطة لوضع الدبوس',
    locConfT: 'تأكيد موقع الفرع؟', locConfB: 'سيُستخدم هذا الموقع في كل الزيارات. لتغييره لاحقًا تحتاج للتواصل مع فريق التشغيل.', yesLoc: 'نعم، أكّد الموقع', back: 'رجوع', locSaved: 'تم حفظ موقع الفرع',
    heroQ: 'عندك مواد للاستلام؟', heroA: 'نحدد لك يوم الزيارة ونبلغك', newReq: 'طلب استلام جديد', support: 'الدعم', notifs: 'الإشعارات',
    nextVisit: 'زيارتك القادمة', inDays: 'بعد {n} أيام', in2: 'بعد يومين', tomorrow: 'غدًا', today: 'اليوم',
    noVisitT: 'لا توجد زيارة محددة بعد', noVisitB: 'طلباتك بانتظار تحديد يوم الزيارة، وسنبلغك فور تحديده.', emptyT: 'لا توجد طلبات حالية', emptyB: 'عندما تتجمّع لديك مواد، أرسل طلبًا وسنحدد لك يوم الزيارة.',
    activeReqs: 'طلباتك الحالية', seeAll: 'عرض الكل', tipsT: 'جهّز المواد قبل الزيارة', tip1: 'افصل كل مادة عن الأخرى', tip2: 'ضعها قرب منطقة التحميل', tip3: 'زِن المادة قبل إرسال الطلب',
    navHome: 'الرئيسية', navReqs: 'طلباتي', navNotifs: 'الإشعارات', navAcc: 'حسابي', navLabel: 'التنقل الرئيسي',
    loadErrT: 'تعذّر تحميل البيانات', loadErrB: 'تحقق من الاتصال ثم أعد المحاولة.', retry: 'إعادة المحاولة', offT: 'لا يوجد اتصال بالإنترنت', offB: 'ما أدخلته محفوظ على الشاشة.',
    stepMat: 'المادة', stepWt: 'الوزن والتفاصيل', stepRev: 'المراجعة', stepOf: '{n} / 3',
    matQ: 'ما المادة التي تريد تسليمها؟', matSub: 'مادة واحدة لكل طلب. المواد المقفلة لها طلب مفتوح.', hasOpen: 'لديك طلب مفتوح لهذه المادة', viewIt: 'عرضه', hasOpenAll: 'كل أنواع هذه المادة لها طلبات مفتوحة', viewThem: 'عرضها', partialOpen: 'طلب مفتوح: {s}', subQ: 'اختر نوع ال{m}', subSub: 'لكل نوع طلب مستقل بوزنه وصورته.', subOpen: 'لديك طلب مفتوح لهذا النوع',
    material: 'المادة', change: 'تغيير', weight: 'الوزن', kgUnit: 'كجم', weightHint: 'الرقم الظاهر على الميزان، بالكيلوجرام وبدون كسور.',
    errW0: 'أدخل الوزن بالكيلوجرام.', errWmin: 'أقل وزن مسموح 1 كجم.', errWmax: 'أكبر وزن مسموح 5,000 كجم. للكميات الأكبر تواصل مع المسؤول.', warnW: 'وزن كبير. تأكد من الرقم قبل المتابعة.',
    photo: 'صورة الميزان', required: 'إلزامي', optional: 'اختياري', photoGuide: 'صوّر المادة على الميزان بحيث يظهر الرقم بوضوح.', takePhoto: 'التقاط صورة', gallery: 'من المعرض', uploading: 'جارٍ رفع الصورة…', photoOk: 'تم رفع الصورة', retake: 'إعادة التصوير', remove: 'حذف',
    errPhoto: 'أضف صورة الميزان للمتابعة.', photoFail: 'تعذّر رفع الصورة لعدم وجود اتصال. أعد المحاولة عند عودة الاتصال.',
    note: 'ملاحظة للسائق', notePh: 'مثال: المواد عند باب التحميل الخلفي', toReview: 'التالي: مراجعة الطلب', fixErrs: 'أكمل الحقول المحددة بالأحمر للمتابعة.',
    revT: 'راجع طلبك قبل الإرسال', noNote: 'بدون ملاحظة', edit: 'تعديل', opsLine: 'فريق التشغيل يحدد يوم الزيارة ويبلغك بإشعار.', send: 'إرسال الطلب', sendAgain: 'إعادة الإرسال', sending: 'جارٍ الإرسال…',
    sendFail: 'تعذّر إرسال الطلب لعدم وجود اتصال. بياناتك محفوظة، أعد المحاولة عند عودة الاتصال.', saveEdit: 'حفظ التعديلات', editT: 'تعديل الطلب', editLock: 'المادة لا تتغير عند التعديل. لمادة مختلفة أرسل طلبًا جديدًا.', edited: 'تم حفظ التعديلات',
    okT: 'تم إرسال طلبك', okB: 'سنحدد يوم الزيارة ونرسل لك إشعارًا. يمكنك تعديل الطلب أو إلغاؤه حتى يُعتمد يوم الزيارة.', goHome: 'العودة للرئيسية', viewReq: 'عرض الطلب',
    reqNo: 'طلب رقم {id}', no: 'رقم {id}', branchPhoto: 'صورة الميزان من الفرع', visitDay: 'يوم الزيارة', notSet: 'لم يُحدد بعد', history: 'سجل الطلب', outcomes: 'نتائج الزيارات',
    editHint: 'يمكنك التعديل أو الإلغاء حتى يُعتمد يوم الزيارة.', cancelReq: 'إلغاء الطلب', lockedT: 'لتعديل الطلب أو إلغائه تواصل مع المسؤول', contactMgr: 'تواصل مع المسؤول', againSame: 'طلب جديد لنفس المادة',
    cancelQ: 'إلغاء طلب {m}؟', cancelB: 'لن يزورك السائق لهذا الطلب. يمكنك إرسال طلب جديد في أي وقت.', yesCancel: 'نعم، ألغِ الطلب', keep: 'تراجع', cancelledT: 'تم إلغاء الطلب',
    mgrT: 'مسؤول مادة {m}', mgrB: 'يتابع طلبات {m}، ويستطيع تعديل الطلب أو إلغاءه أو تغيير يوم الزيارة.',
    reqsT: 'طلباتي', tabActive: 'الحالية', tabPast: 'السابقة', all: 'الكل', noActiveT: 'لا توجد طلبات حالية', noActiveB: 'أرسل طلب استلام عندما تكون موادك جاهزة.', noPastT: 'لا توجد طلبات سابقة', noPastB: 'تظهر هنا الطلبات المستلمة والمغلقة والملغاة.', noFilterT: 'لا توجد طلبات {m} هنا', noFilterB: 'جرّب مادة أخرى أو اعرض كل المواد.', showAll: 'إظهار كل المواد',
    notifsT: 'الإشعارات', markAll: 'تعليم الكل كمقروء', noNotifT: 'لا توجد إشعارات', noNotifB: 'تصلك هنا مواعيد الزيارات ونتائجها.', newL: 'جديد',
    accT: 'حسابي', sharedAcc: 'حساب مشترك لموظفي الفرع', chain: 'السلسلة', branchNo: 'رقم الفرع', city: 'المدينة', district: 'الحي', address: 'العنوان', savedLoc: 'موقع الفرع', viewOnly: 'للعرض فقط', locLocked: 'لتغيير الموقع تواصل مع فريق التشغيل.',
    language: 'اللغة', theme: 'المظهر', light: 'فاتح', dark: 'داكن', system: 'النظام', changePass: 'تغيير كلمة المرور', contactOps: 'تواصل مع التشغيل', logout: 'تسجيل الخروج',
    logoutQ: 'تسجيل الخروج من حساب الفرع؟',
    // [changed] was: 'ستحتاج رقم الجوال وكلمة المرور للدخول مرة أخرى.'
    logoutB: 'ستحتاج السلسلة ورقم الفرع وكلمة المرور للدخول مرة أخرى.',
    yesLogout: 'نعم، سجّل الخروج', version: 'الإصدار 1.0.0',
    st_await: 'بانتظار تحديد يوم الزيارة', st_resched: 'تُعاد جدولته بعد تعذّر الاستلام', st_sched: 'الزيارة يوم {d}', st_dec: 'قيد المتابعة مع المسؤول', st_done: 'تم الاستلام', st_closed: 'أُغلق الطلب', st_cancel: 'ملغي',
    sub_await: 'سنبلغك فور تحديد يوم الزيارة.', sub_sched: 'جهّز المواد قرب منطقة التحميل قبل يوم الزيارة.', sub_dec: 'سيتواصل معك المسؤول إذا احتاج أي معلومة.', sub_done: 'اكتمل في زيارة {d}.', sub_closed: 'السبب: {r}', sub_cancel: 'ألغاه الفرع قبل اعتماد يوم الزيارة.', sub_resched: 'آخر زيارة: {o}. سنبلغك باليوم الجديد.',
    ev_created: 'أُرسل الطلب', ev_edited: 'عُدّل الطلب', ev_sched: 'تحدد يوم الزيارة: {d}', ev_fail: 'تعذّر الاستلام: {r}', ev_mis: 'الكمية غير مطابقة، يتابعها المسؤول', ev_done: 'تم الاستلام', ev_requeue: 'أعاده المسؤول لتحديد يوم جديد', ev_closed: 'أُغلق الطلب: {r}', ev_cancel: 'ألغاه الفرع', pend_sched: 'تحديد يوم الزيارة', pend_visit: 'زيارة السائق: {d}', pend_dec: 'قرار المسؤول',
    o_fail: 'تعذّر الاستلام: {r}', o_mis: 'الكمية المستلمة لا تطابق الطلب، يتابعها المسؤول', o_done: 'تم الاستلام',
    r_shop: 'الفرع مغلق', r_unavail: 'المواد غير متوفرة بعد عدة محاولات', r_mgr: 'قرار المسؤول بعد المتابعة',
    n_sched: 'تحدد يوم زيارة {m}', n_sched_b: 'الزيارة يوم {d}. طلب رقم {id}.', n_morning: 'اليوم يزورك السائق لاستلام {m}', n_morning_b: 'جهّز {kg} قرب منطقة التحميل.', n_fail: 'تعذّر استلام {m}', n_fail_b: 'زيارة {d}: {r}. سنحدد يومًا جديدًا ونبلغك.', n_mis: 'طلب {m} قيد المتابعة مع المسؤول', n_mis_b: 'الكمية المستلمة في زيارة {d} لا تطابق الطلب.', n_done: 'تم استلام {m}', n_done_b: 'اكتمل طلب رقم {id} في زيارة {d}.', n_closed: 'أُغلق طلب {m}', n_closed_b: 'السبب: {r}.', n_requeue: 'طلب {m} يعود لتحديد يوم جديد', n_requeue_b: 'قرر المسؤول إعادة جدولة الطلب رقم {id}.',
    sched_toast: 'تحدد يوم زيارة طلب {m}: {d}',
  },

  driver: {
    appName: 'تطبيق السائق', tagline: 'خطة يومك في مكان واحد', 'continue': 'متابعة', back: 'رجوع', close: 'إغلاق',
    loginHello: 'أهلًا بك', loginSub: 'سجّل الدخول لعرض خطة يومك', mobile: 'رقم الجوال',
    // [changed] PIN -> password, here and in every string below that mentioned it
    password: 'كلمة المرور', showPw: 'إظهار كلمة المرور',
    login: 'تسجيل الدخول', signingIn: 'جارٍ الدخول…', forgot: 'نسيت كلمة المرور؟', loginErr: 'رقم الجوال أو كلمة المرور غير صحيحة', accountsNote: 'الحسابات يُنشئها فريق العمليات',
    cpTitle: 'عيّن كلمة مرور جديدة', cpSubFirst: 'هذا أول دخول لك. اختر كلمة مرور جديدة بدل كلمة المرور المؤقتة (6 أرقام).', cpSubChange: 'اختر كلمة مرور جديدة.',
    newPw: 'كلمة المرور الجديدة', confirmPw: 'أعد كتابة كلمة المرور',
    // [changed] the driver's rules are now the branch's rules
    rule8: '8 أحرف على الأقل', ruleNum: 'تحتوي على حرف ورقم', ruleMatch: 'التأكيد مطابق', saveContinue: 'حفظ ومتابعة',
    hi: 'أهلًا {name}', truckLine: 'شاحنة {material}',
    inDistricts: 'في {n} أحياء', progress: 'تقدّم اليوم', suggested: 'الزيارة المقترحة', sameDistrict: 'في نفس الحي', openDetails: 'عرض التفاصيل',
    allStops: 'كل الزيارات', byDistrict: 'حسب الحي', allDoneTitle: 'أنهيت خطة اليوم', allDoneSub: 'أحسنت يا {name}، سجّلت كل الزيارات.',
    noPlanHead: 'لا توجد خطة معتمدة', noPlanSub: 'لهذا اليوم بعد', noPlanBody: 'ستظهر زياراتك هنا فور اعتماد العمليات للخطة، وسيصلك إشعار.',
    refresh: 'تحديث', contactOps: 'تواصل مع العمليات', offHead: 'لست مجدولًا', offSub: 'للعمل اليوم',
    offBody: 'حدّدت العمليات أنك لا تعمل اليوم. إن كان هذا خطأ فتواصل معهم.', nextPlan: 'الخطة القادمة', nextPlanValue: '{date} · {n} زيارات',
    view: 'عرض', planChangedTitle: 'تم تعديل خطة اليوم', planChangedBody: 'أُضيفت زيارة: {branch}', gotIt: 'حسنًا',
    support: 'الدعم', notifAria: 'الإشعارات', navAria: 'التنقل الرئيسي', navToday: 'اليوم', navUpcoming: 'القادمة', navHistory: 'السجل', navAccount: 'حسابي',
    planTitle: 'خطة اليوم', filter: 'تصفية الزيارات', remaining: 'المتبقية', all: 'الكل', anyOrder: 'زُر الفروع بالترتيب الذي يناسبك',
    districtDone: 'مكتمل', newTag: 'جديدة', suggestedTag: 'مقترحة', draftTag: 'مسودة محفوظة – لم تُرسل',
    st_todo: 'لم تُزر', st_full: 'تمت', st_partial: 'كمية مختلفة', st_failed: 'تعذّرت', kg: 'كجم',
    request: 'الطلب', address: 'العنوان', access: 'تعليمات الوصول', callBranch: 'اتصال بالفرع', openMaps: 'فتح الموقع في خرائط الجوال',
    declared: 'الوزن المعلن من الفرع', branchPhoto: 'صورة الميزان من الفرع', tapEnlarge: 'اضغط للتكبير', branchNote: 'ملاحظة الفرع',
    requestedOn: 'طُلب في', record: 'تسجيل نتيجة الزيارة', continueDraft: 'متابعة التسجيل', recordedAs: 'تم التسجيل',
    wrongEntry: 'سجّلت نتيجة خاطئة؟ تواصل مع العمليات',
    outcomeTitle: 'نتيجة الزيارة', step1: '1 · النتيجة', step2: '2 · التوثيق', step3: '3 · الإرسال', question: 'هل استلمت الكمية المكتوبة؟',
    oFull: 'نعم، استلمتها كاملة', oFullSub: 'صوّر الميزان وأرسل – يُغلق الطلب', oPartial: 'لا، الكمية مختلفة', oPartialSub: 'صورة الميزان + ملاحظة – يحتاج قرار',
    oFailed: 'تعذّر الاستلام', oFailedSub: 'اختر السبب – بدون صورة',
    rFull: 'استلام كامل – أُغلق الطلب', rPartial: 'كمية مختلفة – يحتاج قرار', rFailed: 'تعذّر الاستلام – يحتاج قرار', declaredQ: 'المكتوبة من الفرع: {n}', change: 'تغيير', scalePhoto: 'صورة الميزان', required: 'مطلوب',
    takePhoto: 'صوّر الميزان', photoHint: 'اجعل رقم الميزان واضحًا', retake: 'إعادة التصوير', photoOk: 'الصورة جاهزة',
    noteLabel: 'ما الفرق ولماذا؟', notePh: 'مثال: استلمت نحو النصف، الباقي لم يُجهّز', quick1: 'أقل من المكتوب', quick2: 'جزء لم يُجهّز', quick3: 'جزء غير مطابق',
    toManagerPartial: 'سيتحوّل الطلب إلى «يحتاج قرار» عند المشرف.', reasonLabel: 'سبب تعذّر الاستلام',
    r_closed: 'الفرع مغلق', r_notReady: 'الفرع غير جاهز', r_noOne: 'لا يوجد مسؤول', r_noMat: 'لا توجد مواد', r_noReach: 'تعذّر الوصول للموقع', r_other: 'سبب آخر',
    otherLabel: 'اكتب السبب', otherPh: 'اكتب السبب باختصار', toManagerFailed: 'سيتحوّل الطلب إلى «يحتاج قرار» ليعيد المشرف جدولته أو يغلقه.',
    send: 'إرسال', sending: 'جارٍ الإرسال…', notSent: 'لم يُرسل – حاول مرة أخرى', keptData: 'صورتك واختيارك محفوظان، لن يضيع شيء.', retry: 'إعادة المحاولة',
    offline: 'لا يوجد اتصال بالإنترنت', offlineSub: 'بياناتك محفوظة على الشاشة. أعد المحاولة عند عودة الاتصال.', toastSub: 'سنحدّث البيانات عند عودة الاتصال',
    needPhoto: 'صوّر الميزان أولًا', needNote: 'اكتب الفرق وسببه', needReason: 'اختر سبب التعذّر', needOther: 'اكتب السبب',
    camHint: 'ضع رقم الميزان داخل الإطار', capture: 'التقاط الصورة',
    sFullTitle: 'تم الاستلام وأُغلق الطلب', sPartialTitle: 'تم تسجيل الاستلام', sPartialSub: 'الكمية مختلفة – الطلب الآن «يحتاج قرار»', sFailedTitle: 'تم تسجيل تعذّر الاستلام', sFailedSub: 'الطلب الآن «يحتاج قرار» عند المشرف',
    todayProgress: 'تقدّم اليوم', next: 'الزيارة التالية', toPlan: 'العودة للخطة', backHome: 'الرئيسية', lastDone: 'كانت هذه آخر زيارة اليوم',
    upTitle: 'الخطة القادمة', viewOnly: 'للعرض فقط', approved: 'معتمدة', upEmpty: 'لم تُعتمد الخطة القادمة بعد', upEmptySub: 'سيصلك إشعار فور اعتمادها من العمليات.',
    approvedAt: 'يوم العمل التالي · اعتُمدت {when}',
    contactLabel: 'صاحب الطلب', callContact: 'اتصال بصاحب الطلب', noBranchPhoto: 'لم يرفق الفرع صورة للميزان', noBranchPhotoSub: 'اعتمد على الوزن المكتوب، وصوّر الميزان عند الاستلام.',
    lockedTitle: 'تم إيقاف الدخول مؤقتًا', lockedBody: '5 محاولات خاطئة. حاول بعد 15 دقيقة، أو تواصل مع العمليات لفتح الحساب.',
    // [changed] was: 'الرقم السري غير صحيح – تبقّى {n}'
    loginErrN: 'كلمة المرور غير صحيحة – تبقّى {n}',
    left: 'زيارات باقية', left1: 'زيارة باقية', leftShort: 'باقية',
    period: 'الفترة', changePeriod: 'تغيير الفترة', rangeTitle: 'اختر الفترة', from: 'من', to: 'إلى', qToday: 'اليوم', qYesterday: 'أمس', q7: 'آخر 7 أيام', qMonth: 'هذا الشهر',
    apply: 'عرض النتائج', f_all: 'الكل', rangeEmpty: 'لا توجد زيارات في هذه الفترة', rangeEmptySub: 'جرّب فترة أخرى أو غيّر الفلتر.',
    visitsUnit: 'زيارات', driverPhoto: 'صورة الميزان التي أرسلتها', genNote: 'بقي جزء من الكمية لم يُجهّز بعد', noteLbl: 'ملاحظتك', reasonLbl: 'السبب', todayW: 'اليوم', yestW: 'أمس',
    histTitle: 'السجل', today: 'اليوم – {date}', yesterday: 'أمس – {date}', histEmpty: 'لا توجد زيارات مسجّلة بعد', histEmptySub: 'ستظهر زياراتك هنا بعد تسجيل نتائجها.',
    notifTitle: 'الإشعارات', unread: 'غير مقروء', notifEmpty: 'لا توجد إشعارات', notifEmptySub: 'ستصلك هنا تحديثات خططك.',
    accTitle: 'حسابي', cityLabel: 'المدينة', mobileLabel: 'الجوال',
    language: 'اللغة', theme: 'المظهر', light: 'فاتح', dark: 'داكن', system: 'النظام', changePw: 'تغيير كلمة المرور', logout: 'تسجيل الخروج',
    logoutQ: 'تسجيل الخروج؟', logoutBody: 'ستحتاج رقم جوالك وكلمة المرور للدخول مرة أخرى.', cancel: 'إلغاء', version: 'الإصدار 1.0.0',
    opsTitle: 'فريق العمليات', opsBody: 'للاستفسار عن الخطة أو الحساب أو كلمة المرور.', opsNumber: '[رقم العمليات]', call: 'اتصال',
    errTitle: 'تعذّر التحميل', errBody: 'تحقّق من الاتصال ثم أعد المحاولة.', doneOf: '{x} من {n} تمت', head: 'خطة اليوم: {n} زيارات', visitsOf: '{x} من {n} زيارات',
    remainingN: 'المتبقية ({n})', allN: 'الكل ({n})', daySummary: '{n} زيارات',
  },
} as const;

export type Copy = typeof ar;
