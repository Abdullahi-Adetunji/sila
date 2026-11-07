// User-facing wording in English and Arabic.
// DRAFT: every string here must be approved by the clinical adviser, and the
// Arabic reviewed by a native speaker, before user testing.

import { PANEL, type Bilingual } from "./genetics/panel";
import type { Route } from "./genetics/engine";

export type Lang = "en" | "ar";

const ODDS: Record<Lang, string[]> = {
  en: ["no chance", "a 1 in 4 chance", "a 1 in 2 chance", "a 3 in 4 chance", "certainty"],
  ar: ["لا احتمال", "احتمال ١ من ٤", "احتمال ١ من ٢", "احتمال ٣ من ٤", "يقين"],
};

export function odds(lang: Lang, quarters: number): string {
  return ODDS[lang][quarters] ?? `${quarters}/4`;
}

export function phenotypeName(lang: Lang, englishName: string): string {
  for (const g of PANEL) {
    const p = g.phenotypes.find((ph) => ph.name.en === englishName);
    if (p) return p.name[lang];
  }
  return englishName;
}

export function conditionName(lang: Lang, gene: string): string {
  return PANEL.find((g) => g.gene === gene)?.condition[lang] ?? gene;
}

type Copy = Record<string, Bilingual>;

export const T: Copy = {
  appName: { en: "Sila", ar: "صلة" },
  screenTitle: { en: "Your couple result", ar: "نتيجتكما المشتركة" },
  draft: {
    en: "Prototype using synthetic data. Wording is a draft awaiting clinical review.",
    ar: "نموذج أولي يستخدم بيانات اصطناعية. الصياغة مسودة بانتظار المراجعة السريرية.",
  },
  privacy: {
    en: "You both agreed to see this shared result. Neither of you can see the other's individual result unless they choose to share it.",
    ar: "وافقتما معاً على عرض هذه النتيجة المشتركة. لا يمكن لأي منكما رؤية النتيجة الفردية للآخر إلا إذا اختار مشاركتها.",
  },
  everyPregnancy: {
    en: "The chance is the same in every pregnancy. It does not mean one child in every four.",
    ar: "الاحتمال نفسه في كل حمل، ولا يعني أن طفلاً واحداً من كل أربعة أطفال سيُصاب.",
  },
  legendAffected: { en: "Has the condition", ar: "مصاب بالحالة" },
  legendCarrier: { en: "Carrier, healthy", ar: "حامل للمتغير، سليم" },
  legendUnaffected: { en: "Not a carrier", ar: "غير حامل" },
  noSharedTitle: {
    en: "No shared risk was found for the conditions tested.",
    ar: "لم يُعثر على خطر مشترك في الحالات التي شملها الفحص.",
  },
  noSharedBody: {
    en: "Screening finds most variants but not all, so a small chance always remains. A counsellor can explain what this means for you.",
    ar: "يكشف الفحص معظم المتغيرات وليس جميعها، لذلك يبقى دائماً احتمال ضئيل. يمكن للمرشد الوراثي أن يشرح لكما ما يعنيه ذلك.",
  },
  uncertain: {
    en: "One result needs a genetic counsellor to review it before your shared risk can be calculated for",
    ar: "تحتاج إحدى النتائج إلى مراجعة من مرشد وراثي قبل حساب الخطر المشترك في",
  },
  partnerNeedsTesting: {
    en: "One of you carries a variant and the other has not been tested for it. A test would show whether you share a risk for",
    ar: "أحدكما يحمل متغيراً والآخر لم يُفحص له بعد. سيُظهر الفحص ما إذا كان بينكما خطر مشترك في",
  },
  personAffected: {
    en: "One result shows a condition that a specialist should review.",
    ar: "تُظهر إحدى النتائج حالة ينبغي أن يراجعها طبيب مختص.",
  },
  optionsTitle: { en: "Options couples in this situation can consider", ar: "خيارات يمكن للأزواج في هذا الوضع النظر فيها" },
  optionsNote: {
    en: "These are listed in no particular order. The choice is yours, and a counsellor can talk them through with you.",
    ar: "هذه الخيارات غير مرتبة حسب الأفضلية. القرار لكما، ويمكن للمرشد الوراثي مناقشتها معكما.",
  },
  opt1: { en: "Talk it through with a genetic counsellor", ar: "مناقشة الأمر مع مرشد وراثي" },
  opt2: { en: "Confirm the results with a further test", ar: "تأكيد النتائج بفحص إضافي" },
  opt3: { en: "Testing during a future pregnancy", ar: "الفحص أثناء حمل مستقبلي" },
  opt4: { en: "Options available through fertility services", ar: "الخيارات المتاحة عبر خدمات الخصوبة" },
  opt5: {
    en: "Continue as planned, with early care for a child if needed",
    ar: "المضي كما هو مخطط، مع رعاية مبكرة للطفل عند الحاجة",
  },
  bookCounsellor: { en: "Book a genetic counsellor", ar: "احجز موعداً مع مرشد وراثي" },
  askQuestion: { en: "Ask a question", ar: "اطرح سؤالاً" },
  demoControl: { en: "Demo: choose a synthetic couple", ar: "عرض تجريبي: اختر زوجين من البيانات الاصطناعية" },
};

export const ROUTE_TEXT: Record<Route, Bilingual> = {
  information: {
    en: "Next step: read more about your results. You can book a counsellor any time if you have questions.",
    ar: "الخطوة التالية: اقرآ المزيد عن نتيجتكما. يمكنكما حجز موعد مع مرشد وراثي في أي وقت إن كانت لديكما أسئلة.",
  },
  counsellor: {
    en: "Next step: we suggest a session with a genetic counsellor to go through your result.",
    ar: "الخطوة التالية: نقترح جلسة مع مرشد وراثي لمراجعة نتيجتكما.",
  },
  counsellor_priority: {
    en: "Next step: we suggest booking a genetic counsellor soon. Your options are easiest to discuss early.",
    ar: "الخطوة التالية: نقترح حجز موعد مع مرشد وراثي قريباً، فمناقشة الخيارات أسهل في وقت مبكر.",
  },
};
