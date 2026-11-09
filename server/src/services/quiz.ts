import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { quizResponses } from "../db/schema";
import { allQuizItems, getQuizItem } from "@/content/quiz";
import type { QuizItem } from "@/content/quiz";
import type { Volunteer } from "./volunteer";
import {
  assessCouple,
  type PersonResult,
} from "@/lib/genetics/engine";
import type { ResultsByGene } from "./vault";

type Phase = "before" | "after";
type Form = "A" | "B";

const here = dirname(fileURLToPath(import.meta.url));
const couplesJsonPath = resolve(here, "../../../data/synthetic/couples.json");

interface SyntheticCouple {
  coupleId: string;
  a: { id: string; results: ResultsByGene };
  b: { id: string; results: ResultsByGene };
}

let COUPLES: SyntheticCouple[] | null = null;
function loadCouples(): SyntheticCouple[] {
  if (COUPLES) return COUPLES;
  const raw = readFileSync(couplesJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { couples: SyntheticCouple[] };
  COUPLES = parsed.couples;
  return COUPLES;
}

export function formFor(volunteer: Volunteer, phase: Phase): Form {
  if (volunteer.formOrder === "AB") return phase === "before" ? "A" : "B";
  return phase === "before" ? "B" : "A";
}

export interface QuizItemView {
  id: string;
  concept: string;
  form: Form;
  question: string;
  choices: string[];
  // Correct index is never leaked to the client.
}

export function itemsForPhase(volunteer: Volunteer, phase: Phase): QuizItemView[] {
  const form = formFor(volunteer, phase);
  const lang = volunteer.language;
  return allQuizItems().map((q) => {
    const f = q.forms[form][lang];
    return {
      id: q.id,
      concept: q.concept,
      form,
      question: f.question,
      choices: f.choices,
    };
  });
}

export async function recordResponse(input: {
  volunteerId: string;
  phase: Phase;
  itemId: string;
  answer: number;
  form: Form;
  language: "en" | "ar";
}): Promise<{ saved: true; correct: boolean | null }> {
  const item: QuizItem = getQuizItem(input.itemId);
  const f = item.forms[input.form][input.language];
  const correctIndex = f.correct;
  const correctFlag = correctIndex === null ? null : input.answer === correctIndex ? 1 : 0;
  const now = new Date().toISOString();
  await db
    .insert(quizResponses)
    .values({
      volunteerId: input.volunteerId,
      phase: input.phase,
      form: input.form,
      itemId: input.itemId,
      answer: String(input.answer),
      correct: correctFlag ?? -1,
      answeredAt: now,
    })
    .onConflictDoNothing({
      target: [quizResponses.volunteerId, quizResponses.phase, quizResponses.itemId],
    });
  return { saved: true, correct: correctFlag === null ? null : correctFlag === 1 };
}

export async function responsesFor(
  volunteerId: string,
  phase: Phase,
): Promise<Array<{ itemId: string; answer: number; correct: number }>> {
  const rows = await db
    .select({
      itemId: quizResponses.itemId,
      answer: quizResponses.answer,
      correct: quizResponses.correct,
    })
    .from(quizResponses)
    .where(and(eq(quizResponses.volunteerId, volunteerId), eq(quizResponses.phase, phase)));
  return rows.map((r) => ({
    itemId: r.itemId,
    answer: Number(r.answer),
    correct: r.correct,
  }));
}

// Synthetic couple view for the volunteer's assigned couple id. Runs the
// engine on the JSON; never reads anything from the user vault.
export function syntheticCoupleView(coupleId: string) {
  const couple = loadCouples().find((c) => c.coupleId === coupleId);
  if (!couple) return null;
  const a: PersonResult = { id: couple.a.id, results: couple.a.results };
  const b: PersonResult = { id: couple.b.id, results: couple.b.results };
  return assessCouple(a, b);
}

