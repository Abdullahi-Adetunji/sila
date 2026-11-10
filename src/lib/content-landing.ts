// User-facing wording for the public landing page.
// DRAFT: the English copy awaits clinical review; the Arabic column awaits a
// native-speaker reviewer. Nothing here makes a new claim about risk; where a
// sentence talks about risk it mirrors wording already in src/lib/content.ts.

import type { Bilingual } from "./genetics/panel";

export const LANDING = {
  prototypeBanner: {
    en: "Prototype: synthetic data only, not medical advice.",
    ar: "نموذج أولي: بيانات اصطناعية فقط، وليس نصيحة طبية.",
  },
  draftNote: {
    en: "The Arabic wording on this page is a DRAFT awaiting a native-speaker reviewer.",
    ar: "الصياغة العربية في هذه الصفحة مسودة بانتظار مراجعة من متحدث أصلي.",
  },

  // Hero
  hero: {
    tagline: {
      en: "Private carrier results for couples, explained clearly.",
      ar: "نتائج فحص الحاملين للأزواج بخصوصية وشرح واضح.",
    },
    ctaCreate: { en: "Create account", ar: "إنشاء حساب" },
    ctaSignIn: { en: "Sign in", ar: "تسجيل الدخول" },
  },

  // Numbers strip
  stats: {
    heading: { en: "The pilot, in numbers", ar: "النسخة التجريبية بالأرقام" },
    body: {
      en: "Everything on this page is backed by something in the repo — the synthetic couples file, the panel definition, the current attack suite and the latest privacy test run.",
      ar: "كل ما يظهر هنا مدعوم بشيء في المستودع — ملف الأزواج الاصطناعيين، تعريف الفحص، مجموعة اختبارات الهجوم الحالية، ونتائج اختبارات الخصوصية.",
    },
  },

  // Security flow
  flow: {
    heading: { en: "Nine steps from the lab to a couple view", ar: "تسع خطوات من المختبر إلى النتيجة المشتركة" },
    body: {
      en: "Each tile mirrors a concrete code path. There is no AI in the risk calculation and no AI in any user-facing text.",
      ar: "كل مربّع يقابل مساراً فعلياً في الكود. لا يوجد ذكاء اصطناعي في حساب الخطر ولا في أيّ نصّ يظهر للمستخدمين.",
    },
  },

  // Panel coverage
  panel: {
    heading: { en: "Conditions this pilot screens", ar: "الحالات التي يفحصها هذا النموذج التجريبي" },
    body: {
      en: "Three genes in this pilot; adding a gene is a clinical decision, not a developer one.",
      ar: "ثلاثة جينات في هذه المرحلة. إضافة جين قرار سريري وليس قراراً تقنياً.",
    },
  },

  // How it works
  how: {
    heading: { en: "How Sila works", ar: "كيف تعمل صلة" },
    step1Title: { en: "Your result stays in your vault", ar: "تبقى نتيجتك في خزانتك" },
    step1Body: {
      en: "A lab uploads your carrier screening result into your own encrypted vault. Only you can see it.",
      ar: "يُحمّل المختبر نتيجة فحصك إلى خزانتك المشفّرة الخاصة بك. وحدك ترى هذه النتيجة.",
    },
    step2Title: { en: "Link your partner, choose what to share", ar: "اربطي حسابك بشريك حياتك، وقرّرا معاً ما يُشارَك" },
    step2Body: {
      en: "Each of you decides what the other can see. You can grant one thing and not another, and revoke at any time.",
      ar: "كلٌّ منكما يقرّر ما يستطيع الآخر رؤيته. يمكنكما منح إذن معيّن دون غيره، وسحبه في أي وقت.",
    },
    step3Title: { en: "See your couple result together", ar: "شاهدا نتيجتكما المشتركة معاً" },
    step3Body: {
      en: "Once both of you consent, the shared risk is shown for each condition, with a clear next step and a counsellor if you want one.",
      ar: "بعد موافقة كليكما، يُعرض الخطر المشترك لكل حالة، مع خطوة تالية واضحة ومرشد وراثي إذا أردتما.",
    },
  },

  // Privacy promises
  privacy: {
    heading: { en: "Our privacy promises", ar: "وعودنا بشأن الخصوصية" },
    p1: {
      en: "You own your result. Nobody, not even us, sees your plaintext data without your key.",
      ar: "أنت تملك نتيجتك. لا أحد، ولا حتى نحن، يرى بياناتك بلا تشفير دون مفتاحك.",
    },
    p2: {
      en: "A couple risk is only computed when both of you consent, and only for as long as both consents stay active.",
      ar: "لا يُحسَب الخطر المشترك إلا بموافقة كليكما، وطوال سريان هاتين الموافقتين.",
    },
    p3: {
      en: "You choose what a partner or relative sees. The default is nothing.",
      ar: "أنت من يحدّد ما يراه شريك حياتك أو أحد الأقارب. الوضع الافتراضي هو عدم المشاركة.",
    },
    p4: {
      en: "Every access decision about your data is logged where you can see it.",
      ar: "كل قرار وصول يخص بياناتك مُسجّل في سجل يمكنك الاطلاع عليه.",
    },
    p5: {
      en: "You can withdraw at any time. Your encrypted result is then destroyed.",
      ar: "يمكنك الانسحاب في أي وقت، وعندها تُحذف نتيجتك المشفّرة نهائياً.",
    },
  },

  // Isnt / Isnt
  scope: {
    heading: { en: "What Sila is and isn’t", ar: "ما هي صلة وما ليست" },
    isTitle: { en: "Sila is", ar: "صلة هي" },
    isBody: {
      en: "Education about your screening result, and decision support so you can talk through options.",
      ar: "تعليم بشأن نتيجة الفحص، ودعم لاتخاذ القرار كي تناقشا الخيارات.",
    },
    isntTitle: { en: "Sila isn’t", ar: "صلة ليست" },
    isntBody: {
      en: "A diagnosis, and never a recommendation about whom to marry. Clinical advice comes only from a qualified genetic counsellor.",
      ar: "ليست تشخيصاً، ولا توصيةً بشأن من تتزوّجان. النصيحة السريرية تأتي فقط من مرشد وراثي مؤهّل.",
    },
  },

  // Demo panel
  demo: {
    heading: { en: "Try the demo", ar: "جرّب العرض التجريبي" },
    body: {
      en: "Sign in as one of the three seeded demo accounts. All data is synthetic.",
      ar: "سجّل الدخول بوصفك أحد حسابات العرض الثلاثة المُولّدة مسبقاً. جميع البيانات اصطناعية.",
    },
    partnerA: { en: "Sign in as Partner A", ar: "تسجيل الدخول كـ شريك أ" },
    partnerB: { en: "Sign in as Partner B", ar: "تسجيل الدخول كـ شريك ب" },
    counsellor: { en: "Sign in as counsellor", ar: "تسجيل الدخول كـ مرشد" },
    reset: { en: "Reset demo accounts", ar: "إعادة ضبط حسابات العرض" },
    resetNote: {
      en: "The reset restores the demo accounts to their seeded state and is logged in the access log.",
      ar: "تُعيد إعادة الضبط حسابات العرض إلى حالتها الأصلية، وتُسجَّل في سجل الوصول.",
    },
  },

  // Footer
  footer: {
    builtBy: { en: "Built by CEDELA for the Future Health Digital Innovation Challenge.", ar: "بُنيت على يد سيديلا لتحدّي الابتكار الرقمي في الصحة المستقبلية." },
    governance: { en: "Read our data governance", ar: "اطّلع على حوكمة البيانات" },
    liveUrl: { en: "Live pilot · sila-a7fx.onrender.com", ar: "النسخة التجريبية · sila-a7fx.onrender.com" },
  },
} as const satisfies Record<string, Record<string, Bilingual> | Bilingual>;
