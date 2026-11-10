import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MarkdownBody, parseMarkdown } from "../../components/MarkdownDoc";

// Dynamic docs route. Only the whitelisted slugs below are served; every
// other slug 404s. The docs themselves live in `docs/*.md` in the repo and
// are served verbatim (no AI touches them), rendered by the tiny markdown
// renderer in src/app/components/MarkdownDoc.tsx.
//
// If we add a doc page, extend DOC_PAGES and the slug is live. The footer
// links to these same slugs.

const DOC_PAGES: Record<string, { file: string; title: string; eyebrow: string; intro: string }> = {
  "data-governance": {
    file: "data-governance.md",
    title: "Data governance",
    eyebrow: "Governance",
    intro:
      "What Sila collects, the consent model, data minimisation, the audit log, retention, and what Sila will never do with genetic data.",
  },
  "threat-model": {
    file: "threat-model.md",
    title: "Threat model",
    eyebrow: "Security",
    intro:
      "STRIDE threats per component with the control that addresses each and the test that proves it. People threats and residual risks are listed honestly.",
  },
  "security-controls": {
    file: "security-controls.md",
    title: "Security controls",
    eyebrow: "Security",
    intro:
      "Concrete controls in place today — proxy trust, argon2id hashing, envelope encryption, append-only audit log, strict CSP.",
  },
  "evaluation-results": {
    file: "evaluation-results.md",
    title: "Evaluation results",
    eyebrow: "Review",
    intro:
      "Risk + escalation accuracy, comprehension by language and reading band, time to referral, privacy test + attack suite + accessibility results.",
  },
};

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return Object.keys(DOC_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = DOC_PAGES[slug];
  if (!page) return { title: "Docs · Sila" };
  return {
    title: `${page.title} · Sila`,
    description: page.intro,
  };
}

export default async function DocPage({ params }: Params) {
  const { slug } = await params;
  const page = DOC_PAGES[slug];
  if (!page) notFound();

  const path = resolve(process.cwd(), "docs", page.file);
  let text = "";
  let updatedAt: Date | null = null;
  try {
    text = readFileSync(path, "utf8");
    updatedAt = statSync(path).mtime;
  } catch {
    text = "";
  }

  const parsed = parseMarkdown(text);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(1200px 500px at 50% -10%, rgba(15,110,106,0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--teal) 0%, var(--accent-mint) 50%, var(--accent-sand) 100%)",
        }}
      />

      <nav className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-sm text-muted backdrop-blur transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          <span aria-hidden>←</span> Back to Sila
        </Link>
        <DocLinks activeSlug={slug} />
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-6">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{page.eyebrow}</p>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {parsed.title || page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{page.intro}</p>
          {updatedAt && (
            <p className="mt-3 text-xs text-muted">
              Last updated{" "}
              <time dateTime={updatedAt.toISOString()}>
                {updatedAt.toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
          )}
        </header>

        {parsed.toc.length > 0 && (
          <aside
            aria-label="On this page"
            className="mb-10 rounded-2xl border border-line bg-surface p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              On this page
            </p>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {parsed.toc.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="text-teal underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <article className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
          {parsed.blocks.length === 0 ? (
            <p className="text-sm text-muted">Document not deployed with this build.</p>
          ) : (
            <MarkdownBody blocks={parsed.blocks} />
          )}
        </article>
      </main>
    </div>
  );
}

function DocLinks({ activeSlug }: { activeSlug: string }) {
  const items = [
    { slug: "data-governance", label: "Governance" },
    { slug: "security-controls", label: "Controls" },
    { slug: "threat-model", label: "Threats" },
    { slug: "evaluation-results", label: "Results" },
  ];
  return (
    <ul className="hidden gap-1 text-xs sm:flex">
      {items.map((it) => {
        const active = it.slug === activeSlug;
        return (
          <li key={it.slug}>
            <Link
              href={`/docs/${it.slug}`}
              className={`rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                active
                  ? "bg-teal text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
