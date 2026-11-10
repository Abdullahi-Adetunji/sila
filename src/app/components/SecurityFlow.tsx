"use client";

import { Reveal } from "./Reveal";
import type { Lang } from "@/lib/content";

// A nine-step diagram of the data path, from lab upload to audit log. The
// steps mirror the concrete code paths (vault service, consent service,
// couple-risk service, audit log) — not marketing abstractions. Rendered
// as a numbered grid rather than a single SVG so the tiles reflow on phone
// widths and each tile remains a text node axe can read.

interface Step {
  number: number;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  anchor: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    anchor: "ingest",
    title: { en: "Lab uploads a result", ar: "يرفع المختبر النتيجة" },
    body: {
      en: "The simulated lab writes to the person's vault only. The lab never reads it back.",
      ar: "يرفع المختبر المحاكى إلى خزانة الشخص فقط. ولا يستطيع المختبر قراءتها لاحقاً.",
    },
  },
  {
    number: 2,
    anchor: "encrypt",
    title: { en: "AES-256-GCM encrypt", ar: "تشفير AES-256-GCM" },
    body: {
      en: "Random 12-byte IV per record, 16-byte auth tag. No plaintext hits disk.",
      ar: "متجه ابتدائي عشوائي 12 بايت لكل سجل، ووسم مصادقة 16 بايت. لا يُكتب نصّ صريح على القرص.",
    },
  },
  {
    number: 3,
    anchor: "aad",
    title: { en: "AAD binds the row", ar: "ربط البيانات بـAAD" },
    body: {
      en: "person:id | record:id | v<n>. A ciphertext moved to another vault fails to decrypt.",
      ar: "person:id | record:id | v<n>. أي نص مشفَّر يُنقل إلى خزانة أخرى يفشل في فك تشفيره.",
    },
  },
  {
    number: 4,
    anchor: "wrap",
    title: { en: "Wrap the data key", ar: "تغليف مفتاح البيانات" },
    body: {
      en: "Per-person data key wrapped under SILA_KEK. The KEK lives only in the host secret store.",
      ar: "مفتاح بيانات لكل شخص مغلَّف بـSILA_KEK. يبقى KEK في المخزن السري للمضيف فقط.",
    },
  },
  {
    number: 5,
    anchor: "link",
    title: { en: "Partner link", ar: "ربط الشريك" },
    body: {
      en: "Short one-time invite code. Single use, enough entropy that brute force is 404.",
      ar: "رمز دعوة قصير يُستخدَم لمرّة واحدة. فريد وبما يكفي لرفض محاولات التخمين.",
    },
  },
  {
    number: 6,
    anchor: "consent",
    title: { en: "Both consents active", ar: "موافقتان نافذتان" },
    body: {
      en: "Couple risk only runs when both partners currently grant couple_risk. Re-checked per request.",
      ar: "لا يُحسَب الخطر المشترك إلا بسريان موافقة كليكما. يُعاد الفحص مع كل طلب.",
    },
  },
  {
    number: 7,
    anchor: "compute",
    title: { en: "Compute in memory", ar: "الحساب في الذاكرة" },
    body: {
      en: "Decrypt both results, run assessCouple, collapse reasons to a couple-level view.",
      ar: "فك تشفير النتيجتين، تشغيل assessCouple، وتلخيص الأسباب إلى عرض على مستوى الزوجين.",
    },
  },
  {
    number: 8,
    anchor: "respond",
    title: { en: "Return a couple view", ar: "إرجاع نتيجة مشتركة" },
    body: {
      en: "No per-person fields. Chance per pregnancy, independence line, next step, done.",
      ar: "لا حقول خاصة بشخص بعينه. فرص في كل حمل، سطر الاستقلالية، الخطوة التالية، انتهى.",
    },
  },
  {
    number: 9,
    anchor: "audit",
    title: { en: "Audit, append-only", ar: "تدقيق غير قابل للتعديل" },
    body: {
      en: "Every allowed and denied read writes a hash-chained row. UPDATE/DELETE fail at the DB.",
      ar: "كل محاولة قراءة مسموحة أو مرفوضة تُسجَّل في سلسلة هاش. يرفض DB تحديث السطر أو حذفه.",
    },
  },
];

export function SecurityFlow({ lang }: { lang: Lang }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STEPS.map((step, i) => (
        <Reveal
          as="article"
          key={step.anchor}
          delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
        >
          <div className="glass-card h-full p-5">
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft font-mono text-sm font-semibold text-teal"
              >
                {String(step.number).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                {step.anchor}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-ink">{step.title[lang]}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.body[lang]}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
