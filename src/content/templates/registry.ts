import { TEMPLATES } from "./catalog";
import type { Template } from "./types";

const BY_ID = new Map<string, Template>(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown template id: ${id}`);
  return t;
}

export function tryTemplate(id: string): Template | undefined {
  return BY_ID.get(id);
}

export function allTemplates(): Template[] {
  return [...TEMPLATES];
}
