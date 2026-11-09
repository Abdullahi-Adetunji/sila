// User-facing wording for the volunteer-mode study flow. All DRAFT until the
// clinical adviser and the native Arabic reviewer sign it off.

import type { Bilingual } from "./genetics/panel";

export const VOLUNTEER: Record<string, Bilingual> = {
  infoHeading: { en: "About this study", ar: "عن هذه الدراسة" },
  infoBody: {
    en: "Sila is a prototype for explaining carrier-screening results to couples. In this study we show you one couple result (built from synthetic, not real, data) and ask a few short quiz questions before and after. We measure how well the explanation works for you.",
    ar: "صلة نموذج أولي لشرح نتائج فحص الحاملين للأزواج. في هذه الدراسة نعرض لك نتيجة زوج واحد (مبنية على بيانات اصطناعية وليست حقيقية) ونطرح عليك أسئلة قصيرة قبلها وبعدها. نقيس مدى وضوح الشرح لك.",
  },
  infoNoAccount: {
    en: "No name, no email, no genetic data. We generate a participant code for you; you keep it, we never link it to you.",
    ar: "لا اسم، لا بريد، لا بيانات وراثية. نولّد لك رمز مشارِك وتحتفظ به دون أن نربطه بك.",
  },
  infoVoluntary: {
    en: "Taking part is voluntary. You can stop at any time and ask us to delete your answers, using your participant code.",
    ar: "المشاركة طوعية. يمكنك التوقف في أي وقت وطلب حذف إجاباتك باستخدام رمز المشارِك.",
  },
  consentHeading: { en: "Your consent", ar: "موافقتك" },
  consentItem1: {
    en: "I understand that Sila shows me a synthetic result and asks me quiz questions.",
    ar: "أفهم أن صلة ستعرض لي نتيجة اصطناعية وستطرح علي أسئلة.",
  },
  consentItem2: {
    en: "I understand that my answers are stored only against a code, not my name or email.",
    ar: "أفهم أن إجاباتي تُحفظ مقابل رمز فقط، وليس اسمي أو بريدي.",
  },
  consentItem3: {
    en: "I can withdraw at any time using my code, and my answers will be deleted.",
    ar: "يمكنني الانسحاب في أي وقت باستخدام رمزي، وستُحذف إجاباتي.",
  },
  languageLabel: { en: "Language", ar: "اللغة" },
  readingBandLabel: {
    en: "How comfortable are you reading long health text in this language?",
    ar: "ما مدى راحتك في قراءة نصوص صحية طويلة بهذه اللغة؟",
  },
  readLow: { en: "Not very comfortable", ar: "غير مرتاح" },
  readMedium: { en: "Somewhat comfortable", ar: "مرتاح نوعاً ما" },
  readHigh: { en: "Very comfortable", ar: "مرتاح جداً" },
  readUnknown: { en: "Prefer not to say", ar: "أفضل عدم الإجابة" },
  joinButton: { en: "Start the study", ar: "بدء الدراسة" },
  consentButton: { en: "I agree — continue", ar: "أوافق — متابعة" },
  withdrawButton: { en: "Withdraw and delete my answers", ar: "الانسحاب وحذف إجاباتي" },
  codeHeading: { en: "Your participant code", ar: "رمز المشارِك" },
  codeBody: {
    en: "Write this down. You will need it to withdraw later.",
    ar: "احتفظ به كتابةً. ستحتاج إليه للانسحاب لاحقاً.",
  },
  resumeButton: { en: "Enter my code to resume or withdraw", ar: "إدخال رمزي للمتابعة أو الانسحاب" },
};
