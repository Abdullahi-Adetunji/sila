import type { QuizItem } from "./types";

const q = (item: QuizItem): QuizItem => item;

export const QUIZ_ITEMS: QuizItem[] = [
  q({
    id: "quiz.carrier_vs_affected",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "carrier_vs_affected",
    note: "Carrier vs affected. A: direct wording; B: scenario wording.",
    forms: {
      A: {
        en: {
          question: "A carrier of a variant for a recessive condition usually:",
          choices: [
            "Has no symptoms related to the condition",
            "Has the condition",
            "Will definitely have an affected child",
          ],
          correct: 0,
        },
        ar: {
          question: "الشخص الحامل لمتغير لحالة متنحية عادةً:",
          choices: [
            "لا تظهر عليه أعراض مرتبطة بالحالة",
            "مصاب بالحالة",
            "سيكون لديه طفل مصاب بالتأكيد",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question:
            "Sara's result says she is a carrier for cystic fibrosis. Which of the following is true?",
          choices: [
            "Sara does not have cystic fibrosis",
            "Sara has cystic fibrosis",
            "Sara's children will definitely have cystic fibrosis",
          ],
          correct: 0,
        },
        ar: {
          question:
            "تقول نتيجة سارة إنها حاملة للتليف الكيسي. أيّ مما يلي صحيح؟",
          choices: [
            "سارة ليست مصابة بالتليف الكيسي",
            "سارة مصابة بالتليف الكيسي",
            "أبناء سارة سيكونون مصابين بالتليف الكيسي بالتأكيد",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.chance_per_pregnancy",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "chance_per_pregnancy",
    note: "Reading a 1-in-4 chance per pregnancy.",
    forms: {
      A: {
        en: {
          question: "A couple is told each pregnancy has a 1 in 4 chance of an affected child. This means:",
          choices: [
            "Each pregnancy has a 1 in 4 chance, independent of the others",
            "One out of their first four children will be affected",
            "There is only a chance in the first pregnancy; later ones are safe",
          ],
          correct: 0,
        },
        ar: {
          question: "قيل لزوجين إن كل حمل لديه احتمال 1 من 4 بإصابة الطفل. هذا يعني:",
          choices: [
            "كل حمل لديه احتمال 1 من 4، باستقلال عن غيره",
            "واحد من أول أربعة أطفال لهما سيكون مصاباً",
            "الاحتمال موجود في الحمل الأول فقط، أما الحمول اللاحقة فآمنة",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "If a couple's chance per pregnancy is 1 in 2, the chance for any one future pregnancy is:",
          choices: [
            "1 in 2",
            "Higher after an unaffected pregnancy",
            "Lower after an unaffected pregnancy",
          ],
          correct: 0,
        },
        ar: {
          question: "إذا كان احتمال الزوجين في كل حمل 1 من 2، فإن احتمال أي حمل مستقبلي هو:",
          choices: [
            "1 من 2",
            "أعلى بعد حمل سليم",
            "أقل بعد حمل سليم",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.independence",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "independence_between_pregnancies",
    note: "Independence between pregnancies.",
    forms: {
      A: {
        en: {
          question: "A couple with a 1 in 4 chance per pregnancy has one unaffected child. For the next pregnancy, their chance is:",
          choices: [
            "Still 1 in 4",
            "Lower than 1 in 4",
            "They will have an affected child next",
          ],
          correct: 0,
        },
        ar: {
          question: "زوجان لديهما احتمال 1 من 4 في كل حمل ولديهما طفل سليم. احتمال الحمل التالي:",
          choices: [
            "لا يزال 1 من 4",
            "أقل من 1 من 4",
            "سيكون الطفل التالي مصاباً",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "Which statement is true about the chance across several pregnancies?",
          choices: [
            "The chance is the same in every pregnancy, whatever happened before",
            "The chance decreases if an earlier pregnancy was unaffected",
            "The chance increases with each pregnancy",
          ],
          correct: 0,
        },
        ar: {
          question: "أيّ عبارة صحيحة عن الاحتمال عبر عدة حمول؟",
          choices: [
            "الاحتمال نفسه في كل حمل، مهما كان ما حدث سابقاً",
            "ينخفض الاحتمال إذا كان الحمل السابق سليماً",
            "يزداد الاحتمال مع كل حمل",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.risk_vs_diagnosis",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "risk_vs_diagnosis",
    note: "Risk vs diagnosis.",
    forms: {
      A: {
        en: {
          question: "A couple's screening result shows a shared risk. This result is:",
          choices: [
            "A chance, not a diagnosis of any living person",
            "A diagnosis that one of them has the condition",
            "A prediction that the first child is affected",
          ],
          correct: 0,
        },
        ar: {
          question: "تُظهر نتيجة الفحص لزوجين وجود خطر مشترك. هذه النتيجة:",
          choices: [
            "احتمال، وليست تشخيصاً لأي شخص",
            "تشخيص بأن أحدهما مصاب بالحالة",
            "تنبؤ بأن الطفل الأول سيكون مصاباً",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "Who gives clinical advice based on these results?",
          choices: [
            "A qualified genetic counsellor",
            "The screening app",
            "No one; the result speaks for itself",
          ],
          correct: 0,
        },
        ar: {
          question: "من يقدّم الاستشارة السريرية بناءً على هذه النتائج؟",
          choices: [
            "مرشد وراثي مؤهّل",
            "تطبيق الفحص",
            "لا أحد، فالنتيجة تتحدث عن نفسها",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.residual_risk",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "residual_risk",
    note: "Residual risk after 'no variant found'.",
    forms: {
      A: {
        en: {
          question: "Your result says 'no variant found'. Which is true?",
          choices: [
            "The risk is lower but not zero — the panel does not cover every variant",
            "The risk is zero",
            "You could not pass anything on to a child",
          ],
          correct: 0,
        },
        ar: {
          question: "تقول نتيجتك «لا متغير». أيّ مما يلي صحيح؟",
          choices: [
            "الخطر أقل لكنه ليس صفراً — الفحص لا يشمل كل متغير",
            "الخطر صفر",
            "لا يمكنك نقل شيء إلى الطفل",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "A screening panel looks for:",
          choices: [
            "A specific set of variants; a rare one can still be inherited",
            "Every possible variant in every gene",
            "A diagnosis for every condition",
          ],
          correct: 0,
        },
        ar: {
          question: "يبحث فحص الفحص عن:",
          choices: [
            "مجموعة محددة من المتغيرات، ويمكن أن يُورّث متغير نادر",
            "كل متغير ممكن في كل جين",
            "تشخيص لكل حالة",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.consanguinity",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "consanguinity",
    note: "Consanguinity awareness. Not asking the volunteer whether they are related.",
    forms: {
      A: {
        en: {
          question: "For couples related by family (for example, cousins), the chance of a rare inherited condition NOT on this panel is:",
          choices: [
            "A little higher than for unrelated couples",
            "The same as for unrelated couples",
            "Lower than for unrelated couples",
          ],
          correct: 0,
        },
        ar: {
          question: "بالنسبة للأزواج الذين تربطهم قرابة عائلية (مثل أبناء العم أو الخال)، احتمال حالة وراثية نادرة ليست ضمن هذا الفحص هو:",
          choices: [
            "أعلى قليلاً مقارنة بالأزواج غير الأقارب",
            "مماثل للأزواج غير الأقارب",
            "أقل من الأزواج غير الأقارب",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "Couples who are cousins can:",
          choices: [
            "Talk this through with a counsellor who can explain what it means for them",
            "Get a full guarantee from this panel alone",
            "Assume this panel covers every risk",
          ],
          correct: 0,
        },
        ar: {
          question: "الأزواج من الأقارب يمكنهم:",
          choices: [
            "مناقشة الأمر مع مرشد وراثي يشرح لهم ما يعنيه ذلك",
            "الحصول على ضمان كامل من هذا الفحص وحده",
            "افتراض أن هذا الفحص يغطي كل خطر",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.uncertainty",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "uncertainty",
    note: "An 'uncertain' result on a gene.",
    forms: {
      A: {
        en: {
          question: "If one of your results is 'uncertain', the best next step is:",
          choices: [
            "A genetic counsellor explains what it means and whether another test would help",
            "Assume it is a positive result",
            "Assume it is a negative result",
          ],
          correct: 0,
        },
        ar: {
          question: "إذا كانت إحدى نتائجك «غير مؤكدة»، فأفضل خطوة تالية هي:",
          choices: [
            "أن يشرح مرشد وراثي ما يعنيه ذلك وما إذا كان فحص آخر مفيداً",
            "افتراض أنها نتيجة إيجابية",
            "افتراض أنها نتيجة سلبية",
          ],
          correct: 0,
        },
      },
      B: {
        en: {
          question: "Which of the following best describes an uncertain carrier result?",
          choices: [
            "The couple-level risk cannot be computed for that condition until a specialist reviews it",
            "The person is definitely affected",
            "The person is definitely a carrier",
          ],
          correct: 0,
        },
        ar: {
          question: "أيّ مما يلي يصف الأفضل نتيجة حامل غير مؤكدة؟",
          choices: [
            "لا يمكن حساب خطر الزوجين لتلك الحالة حتى يراجعها مختص",
            "الشخص مصاب بالتأكيد",
            "الشخص حامل بالتأكيد",
          ],
          correct: 0,
        },
      },
    },
  }),
  q({
    id: "quiz.neutrality",
    version: 1,
    status: "draft",
    approvedBy: null,
    concept: "neutrality",
    note: "Not scored. Measures whether the explanation pushed the volunteer toward a decision.",
    forms: {
      A: {
        en: {
          question: "After reading the couple result, did the explanation push you toward a particular decision?",
          choices: [
            "No, it felt neutral",
            "A little",
            "Yes, it pushed me toward a decision",
          ],
          correct: null,
        },
        ar: {
          question: "بعد قراءة نتيجة الزوجين، هل دفعك الشرح نحو قرار معيّن؟",
          choices: [
            "لا، شعرت بأنه محايد",
            "قليلاً",
            "نعم، دفعني نحو قرار",
          ],
          correct: null,
        },
      },
      B: {
        en: {
          question: "Did the explanation feel like it recommended a reproductive or marriage decision?",
          choices: [
            "No, it felt neutral",
            "A little",
            "Yes, it recommended something",
          ],
          correct: null,
        },
        ar: {
          question: "هل شعرت بأن الشرح أوصى بقرار إنجابي أو زواجي؟",
          choices: [
            "لا، شعرت بأنه محايد",
            "قليلاً",
            "نعم، أوصى بشيء",
          ],
          correct: null,
        },
      },
    },
  }),
];
