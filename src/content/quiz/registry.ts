import { QUIZ_ITEMS } from "./catalog";
import type { QuizConcept, QuizItem } from "./types";

const BY_ID = new Map<string, QuizItem>(QUIZ_ITEMS.map((q) => [q.id, q]));

export function allQuizItems(): QuizItem[] {
  return [...QUIZ_ITEMS];
}

export function getQuizItem(id: string): QuizItem {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Unknown quiz item id: ${id}`);
  return q;
}

export function tryQuizItem(id: string): QuizItem | undefined {
  return BY_ID.get(id);
}

export function conceptsCovered(): QuizConcept[] {
  return Array.from(new Set(QUIZ_ITEMS.map((q) => q.concept)));
}
