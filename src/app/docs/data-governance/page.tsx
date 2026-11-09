import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data governance · Sila",
};

// Render the markdown file as plain text inside a simple HTML layout. We do
// not add a markdown library here on purpose: the governance text is served
// verbatim from the repo file so a reviewer can be sure the page and the
// doc are the same.
export default function DataGovernancePage() {
  const path = resolve(process.cwd(), "docs/data-governance.md");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    text = "Data governance document not deployed with this build.";
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-6 text-xs text-muted">
        <Link href="/" className="text-teal underline">
          &larr; Sila
        </Link>
      </p>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{text}</pre>
    </main>
  );
}
