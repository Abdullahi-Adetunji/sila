import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data governance · Sila",
  description:
    "What Sila collects, the consent model, data minimisation, the audit log, and what Sila will never do with genetic data.",
};

// Render the markdown file as structured HTML. We deliberately do not pull a
// markdown library: the governance text is served verbatim from the repo so
// a reviewer can diff the page against docs/data-governance.md. Only the
// subset of markdown used by that file is supported: headings, bullets,
// paragraphs, inline bold (**foo**), inline code (`foo`), and links
// ([text](url)).
export default function DataGovernancePage() {
  const path = resolve(process.cwd(), "docs/data-governance.md");
  let text = "";
  let updatedAt: Date | null = null;
  try {
    text = readFileSync(path, "utf8");
    updatedAt = statSync(path).mtime;
  } catch {
    text = "";
  }

  const blocks = parseMarkdown(text);
  const title = blocks.find((b) => b.kind === "h1")?.text ?? "Data governance";
  const toc = blocks.filter((b) => b.kind === "h2");

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
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-6">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Governance</p>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Sila is a prototype using synthetic data only. This page describes what Sila would
            do with real data if it were ever deployed beyond the challenge — the consent
            model, data minimisation, the audit log, retention, and what Sila will never do.
          </p>
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

        {toc.length > 0 && (
          <aside
            aria-label="On this page"
            className="mb-10 rounded-2xl border border-line bg-surface p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              On this page
            </p>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {toc.map((h) => {
                const id = slugify(h.text);
                return (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="text-teal underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
                    >
                      {h.text}
                    </a>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}

        <article className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted">
              Data governance document not deployed with this build.
            </p>
          ) : (
            blocks.map((b, i) => renderBlock(b, i))
          )}
        </article>

      </main>
    </div>
  );
}

// ---- tiny renderer (no external dep) ----------------------------------

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string };

function parseMarkdown(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
      i += 1;
    } else if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push({ kind: "ul", items });
    } else {
      // Paragraph: consume lines until a blank one.
      const buf: string[] = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "" && !/^[#\-]/.test(lines[i])) {
        buf.push(lines[i].trimEnd());
        i += 1;
      }
      blocks.push({ kind: "p", text: buf.join(" ") });
    }
  }
  return blocks;
}

function renderBlock(b: Block, i: number): React.ReactElement {
  if (b.kind === "h1") {
    // Title already appears in <header>; suppress the duplicate here.
    return <span key={i} />;
  }
  if (b.kind === "h2") {
    const id = slugify(b.text);
    return (
      <h2
        key={i}
        id={id}
        className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight first:mt-0"
      >
        {b.text}
      </h2>
    );
  }
  if (b.kind === "ul") {
    return (
      <ul key={i} className="mt-4 list-disc space-y-2 ps-6 text-sm leading-relaxed text-ink">
        {b.items.map((it, j) => (
          <li key={j}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="mt-4 text-sm leading-relaxed text-ink">
      {renderInline(b.text)}
    </p>
  );
}

// Inline: **bold**, `code`, [text](url). Nothing else.
function renderInline(src: string): React.ReactNode[] {
  const tokens: Array<{ kind: "text" | "strong" | "code" | "link"; text: string; href?: string }> =
    [];
  // Cheap tokeniser — one pass, regex-free enough to stay predictable.
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ kind: "text", text: buf });
      buf = "";
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === "*" && src[i + 1] === "*") {
      const end = src.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ kind: "strong", text: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (c === "`") {
      const end = src.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        tokens.push({ kind: "code", text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (c === "[") {
      const closeText = src.indexOf("]", i + 1);
      if (closeText !== -1 && src[closeText + 1] === "(") {
        const closeUrl = src.indexOf(")", closeText + 2);
        if (closeUrl !== -1) {
          flush();
          tokens.push({
            kind: "link",
            text: src.slice(i + 1, closeText),
            href: src.slice(closeText + 2, closeUrl),
          });
          i = closeUrl + 1;
          continue;
        }
      }
    }
    buf += c;
    i += 1;
  }
  flush();
  return tokens.map((t, idx) => {
    if (t.kind === "strong") return <strong key={idx}>{t.text}</strong>;
    if (t.kind === "code")
      return (
        <code
          key={idx}
          className="rounded bg-line/50 px-1 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {t.text}
        </code>
      );
    if (t.kind === "link") {
      // Repo-relative links point to other markdown files; rewrite common
      // internal ones to the equivalent in-app route where one exists.
      const href = rewriteLink(t.href!);
      const isExternal = /^https?:\/\//.test(href);
      return (
        <Link
          key={idx}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          {t.text}
        </Link>
      );
    }
    return <span key={idx}>{t.text}</span>;
  });
}

function rewriteLink(href: string): string {
  // Docs that aren't served as pages yet still show as a plain reference in
  // the body — leave them so a reader sees the file name to look up.
  return href;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
