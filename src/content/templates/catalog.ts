// All Sila explanation templates. Every string is DRAFT until the clinical
// adviser signs it off; Arabic is DRAFT until the native-speaker reviewer
// signs it off. Where a sentence states a risk, reuse the wording in
// src/lib/content.ts rather than inventing new numbers.

import type { Template } from "./types";

const t = (template: Template): Template => template;

export const TEMPLATES: Template[] = [
  // ---------- Individual carrier result wording ----------
  t({
    id: "individual.no_variant_found",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Shown when a person has no variants found for a gene on the panel.",
    text: {
      en: "No pathogenic variant was found for this condition in the tested set. That lowers the chance of a child being affected but does not reduce it to zero, because screening does not detect every possible variant.",
      ar: "لم يُعثر على متغير ممرض لهذه الحالة ضمن مجموعة الفحص. يُقلّل ذلك من احتمال إصابة الطفل، لكنه لا يُنزله إلى الصفر، لأن الفحص لا يكشف جميع المتغيرات الممكنة.",
    },
  }),
  t({
    id: "individual.carrier",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Shown when a person carries one variant (heterozygous).",
    text: {
      en: "You carry one copy of a variant for this condition. Carriers are healthy. What it may mean for your children depends on whether your partner also carries a variant for the same condition.",
      ar: "تحمل نسخة واحدة من متغير لهذه الحالة. الحاملون أصحاء. ما قد يعنيه ذلك لأطفالكم يعتمد على ما إذا كان شريكك يحمل أيضاً متغيراً للحالة نفسها.",
    },
  }),
  t({
    id: "individual.affected",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Shown when a person's result shows two variants (likely affected).",
    text: {
      en: "Your result shows two copies of a variant for this condition. A genetic counsellor should review this with you before any couple-level conclusion is drawn.",
      ar: "تُظهر نتيجتك نسختين من متغير لهذه الحالة. ينبغي أن يراجع مرشد وراثي هذه النتيجة معك قبل استخلاص أي خلاصة على مستوى الزوجين.",
    },
  }),
  t({
    id: "individual.uncertain",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Shown when a result is inconclusive or carries a variant of uncertain significance.",
    text: {
      en: "One part of your result was uncertain. A genetic counsellor can explain what this means for you and whether a further test would help.",
      ar: "كانت إحدى نتائجك غير مؤكدة. يمكن لمرشد وراثي أن يشرح لك ما يعنيه ذلك وما إذا كان فحص إضافي سيكون مفيداً.",
    },
  }),
  t({
    id: "individual.not_tested",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Shown when a gene was not included in the test the person had.",
    text: {
      en: "This condition was not part of the test on file for you. A couple-level risk cannot be computed for it without a result for both of you.",
      ar: "لم تكن هذه الحالة ضمن الفحص المسجّل لك. لا يمكن حساب الخطر على مستوى الزوجين دون نتيجة لكليكما.",
    },
  }),

  // ---------- Residual-risk wording ----------
  t({
    id: "residual_risk.general",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "General residual-risk statement — always paired with 'no variant found' results.",
    text: {
      en: "A “no variant found” result lowers the risk but does not remove it. The test looks for a known set of variants, and a child can still inherit a rare variant not covered by the test.",
      ar: "نتيجة «لا متغير» تُقلّل الخطر ولا تُلغيه. يبحث الفحص عن مجموعة معروفة من المتغيرات، ولا يزال بإمكان الطفل أن يرث متغيراً نادراً غير مشمول بالفحص.",
    },
  }),

  // ---------- Couple-level reason labels ----------
  t({
    id: "couple.shared_risk",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Couple-view label for a non-serious shared risk.",
    text: {
      en: "Each pregnancy carries a shared risk for one or more conditions on the panel.",
      ar: "يحمل كل حمل خطراً مشتركاً لواحدة أو أكثر من الحالات المدرجة في الفحص.",
    },
  }),
  t({
    id: "couple.shared_risk_serious",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Couple-view label for a serious shared risk (sickle, beta thalassaemia major, CF).",
    text: {
      en: "Each pregnancy carries a shared risk for a serious condition on the panel. A genetic counsellor is recommended soon.",
      ar: "يحمل كل حمل خطراً مشتركاً لحالة خطيرة مدرجة في الفحص. يُنصح بزيارة مرشد وراثي قريباً.",
    },
  }),
  t({
    id: "couple.incomplete",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Couple-view label when a shared risk cannot be computed yet.",
    text: {
      en: "Your shared risk cannot be computed for every condition yet — one of the results is uncertain or missing.",
      ar: "لا يمكن حساب الخطر المشترك لكل حالة بعد — إحدى النتائج غير مؤكدة أو مفقودة.",
    },
  }),
  t({
    id: "couple.needs_review",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Couple-view label when one person is affected. Never names which partner.",
    text: {
      en: "A specialist should review this result with you before any couple-level conclusion is drawn.",
      ar: "ينبغي أن يراجع هذه النتيجة معكما طبيب مختص قبل استخلاص أي خلاصة على مستوى الزوجين.",
    },
  }),

  // ---------- Route next-steps ----------
  t({
    id: "route.information",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Next step when the couple route is 'information'.",
    text: {
      en: "Next step: read more about your results. You can book a counsellor at any time if you have questions.",
      ar: "الخطوة التالية: اقرآ المزيد عن نتيجتكما. يمكنكما حجز موعد مع مرشد وراثي في أي وقت إن كانت لديكما أسئلة.",
    },
  }),
  t({
    id: "route.counsellor",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Next step when the couple route is 'counsellor'.",
    text: {
      en: "Next step: we suggest a session with a genetic counsellor to go through your result.",
      ar: "الخطوة التالية: نقترح جلسة مع مرشد وراثي لمراجعة نتيجتكما.",
    },
  }),
  t({
    id: "route.counsellor_priority",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Next step when the couple route is 'counsellor_priority'.",
    text: {
      en: "Next step: we suggest booking a genetic counsellor soon. Your options are easiest to discuss early.",
      ar: "الخطوة التالية: نقترح حجز موعد مع مرشد وراثي قريباً، فمناقشة الخيارات أسهل في وقت مبكر.",
    },
  }),

  // ---------- Neutral options page ----------
  t({
    id: "options.header",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Header of the neutral options page. No ranking, no recommendation.",
    text: {
      en: "These options are listed in no particular order. The choice is yours, and a counsellor can talk them through with you.",
      ar: "هذه الخيارات غير مرتّبة حسب الأفضلية. القرار لكما، ويمكن للمرشد الوراثي مناقشتها معكما.",
    },
  }),
  t({
    id: "options.talk_counsellor",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "One of the neutral options.",
    text: {
      en: "Talk it through with a genetic counsellor.",
      ar: "مناقشة الأمر مع مرشد وراثي.",
    },
  }),
  t({
    id: "options.confirm_test",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "One of the neutral options.",
    text: {
      en: "Confirm the results with a further test.",
      ar: "تأكيد النتائج بفحص إضافي.",
    },
  }),
  t({
    id: "options.pregnancy_testing",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "One of the neutral options.",
    text: {
      en: "Testing during a future pregnancy.",
      ar: "الفحص أثناء حمل مستقبلي.",
    },
  }),
  t({
    id: "options.fertility_services",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "One of the neutral options.",
    text: {
      en: "Options available through fertility services.",
      ar: "الخيارات المتاحة عبر خدمات الخصوبة.",
    },
  }),
  t({
    id: "options.continue_with_care",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "One of the neutral options.",
    text: {
      en: "Continue as planned, with early care for a child if needed.",
      ar: "المضي كما هو مخطط، مع رعاية مبكرة للطفل عند الحاجة.",
    },
  }),

  // ---------- Referral tracker step messages ----------
  t({
    id: "referral.step.referred",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "First step of the referral tracker.",
    text: { en: "Referred to a genetic counsellor.", ar: "تمّت الإحالة إلى مرشد وراثي." },
  }),
  t({
    id: "referral.step.counselling_booked",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Appointment booked.",
    text: { en: "Counselling appointment booked.", ar: "تمّ حجز موعد الاستشارة." },
  }),
  t({
    id: "referral.step.counselling_done",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Appointment completed.",
    text: { en: "Counselling appointment completed.", ar: "تمّت جلسة الاستشارة." },
  }),
  t({
    id: "referral.step.confirmatory_ordered",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "clinical_advice",
    note: "Confirmatory test ordered.",
    text: { en: "A confirmatory test was ordered.", ar: "تمّ طلب فحص تأكيدي." },
  }),
  t({
    id: "referral.step.result_received",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "clinical_advice",
    note: "Result received from the lab.",
    text: { en: "Confirmatory test result received.", ar: "استُلمت نتيجة الفحص التأكيدي." },
  }),
  t({
    id: "referral.step.specialist_referral",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "clinical_advice",
    note: "Specialist referral made.",
    text: { en: "Referred to a specialist service.", ar: "تمّت الإحالة إلى خدمة تخصّصية." },
  }),
  t({
    id: "referral.step.closed",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Referral closed.",
    text: { en: "Referral closed.", ar: "أُغلقت الإحالة." },
  }),

  // ---------- Couple chance per pregnancy: dual framing + independence ----------
  // Shown for every per-condition affected chance. The engine already returns
  // the "affected" quarters; the templates below express it in both framings
  // in each language so no one has to remember how to flip the fraction.
  t({
    id: "couple.chance.affected.1_in_4",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Dual framing for 1-in-4 (one quarter affected). Shown with a condition name.",
    text: {
      en: "Each pregnancy has a 1 in 4 chance a child is affected, and a 3 in 4 chance a child is not affected.",
      ar: "في كل حمل احتمال 1 من 4 أن يكون الطفل مصاباً، واحتمال 3 من 4 أن لا يكون مصاباً.",
    },
  }),
  t({
    id: "couple.chance.affected.1_in_2",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Dual framing for 2-in-4.",
    text: {
      en: "Each pregnancy has a 1 in 2 chance a child is affected, and a 1 in 2 chance a child is not affected.",
      ar: "في كل حمل احتمال 1 من 2 أن يكون الطفل مصاباً، واحتمال 1 من 2 أن لا يكون مصاباً.",
    },
  }),
  t({
    id: "couple.chance.affected.3_in_4",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Dual framing for 3-in-4.",
    text: {
      en: "Each pregnancy has a 3 in 4 chance a child is affected, and a 1 in 4 chance a child is not affected.",
      ar: "في كل حمل احتمال 3 من 4 أن يكون الطفل مصاباً، واحتمال 1 من 4 أن لا يكون مصاباً.",
    },
  }),
  t({
    id: "couple.chance.affected.every",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Dual framing for 4-in-4 (certainty).",
    text: {
      en: "Every pregnancy has this chance of an affected child. This is the arithmetic of the two results; a specialist should walk you through it.",
      ar: "لكل حمل هذا الاحتمال بإصابة الطفل. هذه هي الحسبة بين النتيجتين؛ ينبغي أن يرافقكما مختص.",
    },
  }),
  t({
    id: "couple.independence",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "education",
    note: "Independence-between-pregnancies note. Shown with every shared-risk framing.",
    text: {
      en: "The chance is the same in every pregnancy, whatever happened in earlier pregnancies. It does not mean one child in every four.",
      ar: "الاحتمال نفسه في كل حمل، مهما كان ما حدث في الحمول السابقة. ولا يعني أن طفلاً واحداً من كل أربعة سيُصاب.",
    },
  }),

  // ---------- Relative sharing wording ----------
  t({
    id: "relative.share.explainer",
    version: 1,
    status: "draft",
    approvedBy: null,
    sectionLabel: "decision_support",
    note: "Shown on the relative-sharing consent card.",
    text: {
      en: "You can share the fact that you carry a variant with a named relative. The default is nothing. You can revoke at any time and the relative will no longer see anything.",
      ar: "يمكنك مشاركة أنك تحمل متغيراً مع أحد الأقارب باسم مذكور. الوضع الافتراضي هو عدم المشاركة. يمكنك سحب الإذن في أي وقت، وعندها لن يرى القريب شيئاً.",
    },
  }),
];
