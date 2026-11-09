// Wraps the global console methods with a tiny redactor. Patterns known to
// carry sensitive values are replaced with a tag. The redactor runs in
// production only (NODE_ENV=production) — tests and dev get raw output so
// they can see what is going on.

const REDACT_PATTERNS: Array<{ re: RegExp; tag: string }> = [
  // argon2id hashes (very distinctive prefix)
  { re: /\$argon2[a-z0-9$+/,=]+/g, tag: "[REDACTED_ARGON2]" },
  // session ids and CSRF tokens are 64 hex chars
  { re: /\b[a-f0-9]{64}\b/g, tag: "[REDACTED_HEX_TOKEN]" },
  // participant codes: exactly 10 chars from our alphabet
  { re: /\b[BCDFGHJKMNPQRSTVWXZ23456789]{10}\b/g, tag: "[REDACTED_CODE]" },
  // variant ids on the panel
  { re: /\b(?:HbS|HbC|CFTR-p|GJB2-p)\b/g, tag: "[REDACTED_VARIANT]" },
  { re: /\bbeta\s+thalassaemia\b/gi, tag: "[REDACTED_VARIANT]" },
  // obvious password keys in a JSON-ish log line
  { re: /"password"\s*:\s*"[^"]*"/g, tag: '"password":"[REDACTED]"' },
];

export function redactLine(line: string): string {
  let out = line;
  for (const { re, tag } of REDACT_PATTERNS) out = out.replace(re, tag);
  return out;
}

function redactArg(a: unknown): unknown {
  if (typeof a === "string") return redactLine(a);
  try {
    return JSON.parse(redactLine(JSON.stringify(a))) as unknown;
  } catch {
    return a;
  }
}

let installed = false;

export function installLogRedactor(): void {
  if (installed) return;
  installed = true;
  for (const key of ["log", "info", "warn", "error", "debug"] as const) {
    const orig = console[key].bind(console);
    console[key] = (...args: unknown[]) => orig(...args.map(redactArg));
  }
}
