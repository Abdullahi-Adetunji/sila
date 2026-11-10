import Link from "next/link";

// Tiny markdown renderer used by /docs/<slug> pages. No external dep.
// Supports exactly the subset our docs use today:
//   # H1        ## H2        ### H3
//   - bulleted lists
//   | table | with | pipes | (and the --- separator row)
//   ```fenced code``` blocks (incl. ```mermaid which falls back to <pre>)
//   inline **bold**, `code`, [text](url)
//   paragraphs (any blank-line-separated text block not matching above)
//
// When we need more, extend here rather than adding a markdown lib.

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "code"; lang: string | null; text: string }
  | { kind: "hr" };

export interface ParsedDoc {
  title: string;
  toc: Array<{ text: string; id: string }>;
  blocks: Block[];
}

export function parseMarkdown(src: string): ParsedDoc {
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
    if (line === "---") {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || null;
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ kind: "code", lang, text: buf.join("\n") });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (line.startsWith("|")) {
      // Collect contiguous | lines, expect second row to be the separator.
      const rows: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        rows.push(lines[i].trim());
        i += 1;
      }
      if (rows.length >= 2 && /^\|[\s|:-]+\|?$/.test(rows[1].replace(/\s+/g, ""))) {
        const splitRow = (r: string): string[] =>
          r
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim());
        const header = splitRow(rows[0]);
        const body = rows.slice(2).map(splitRow);
        blocks.push({ kind: "table", header, rows: body });
      } else {
        // Treat as paragraph if the separator isn't there.
        blocks.push({ kind: "p", text: rows.join(" ") });
      }
      continue;
    }
    // Paragraph
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[#\-|`]/.test(lines[i]) &&
      lines[i].trim() !== "---"
    ) {
      buf.push(lines[i].trimEnd());
      i += 1;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  const title = blocks.find((b) => b.kind === "h1")?.text ?? "";
  const toc = blocks
    .filter((b): b is { kind: "h2"; text: string } => b.kind === "h2")
    .map((b) => ({ text: b.text, id: slugify(b.text) }));

  return { title, toc, blocks };
}

export function MarkdownBody({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockRender key={i} block={b} i={i} />
      ))}
    </>
  );
}

function BlockRender({ block, i }: { block: Block; i: number }) {
  if (block.kind === "h1") return <span />;
  if (block.kind === "h2") {
    const id = slugify(block.text);
    return (
      <h2
        id={id}
        className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight first:mt-0"
      >
        {block.text}
      </h2>
    );
  }
  if (block.kind === "h3") {
    return (
      <h3 className="mt-6 text-base font-semibold tracking-tight">{block.text}</h3>
    );
  }
  if (block.kind === "hr") {
    return <hr className="my-8 border-t border-line" />;
  }
  if (block.kind === "ul") {
    return (
      <ul className="mt-4 list-disc space-y-2 ps-6 text-sm leading-relaxed text-ink">
        {block.items.map((it, j) => (
          <li key={j}>{renderInline(it, i, j)}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === "code") {
    return (
      <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed">
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.kind === "table") {
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {block.header.map((h, j) => (
                <th
                  key={j}
                  className="border-b border-line bg-background/60 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-line px-3 py-2 align-top text-ink"
                  >
                    {renderInline(cell, i, r * 100 + c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // paragraph
  return (
    <p className="mt-4 text-sm leading-relaxed text-ink">
      {renderInline(block.text, i, 0)}
    </p>
  );
}

function renderInline(src: string, outer: number, inner: number): React.ReactNode[] {
  const tokens: Array<{ kind: "text" | "strong" | "em" | "code" | "link"; text: string; href?: string }> =
    [];
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
    const key = `${outer}-${inner}-${idx}`;
    if (t.kind === "strong") return <strong key={key}>{t.text}</strong>;
    if (t.kind === "code")
      return (
        <code
          key={key}
          className="rounded bg-line/50 px-1 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {t.text}
        </code>
      );
    if (t.kind === "link") {
      const href = rewriteDocLink(t.href!);
      const isExternal = /^https?:\/\//.test(href);
      return (
        <Link
          key={key}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          {t.text}
        </Link>
      );
    }
    return <span key={key}>{t.text}</span>;
  });
}

// Within-repo links like [pilot-path.md](pilot-path.md) become /docs/<slug>
// when the slug is one of the in-app doc pages. Everything else is left
// alone so unlisted docs appear as plain filename references.
const INTERNAL_DOCS = new Set([
  "data-governance",
  "threat-model",
  "security-controls",
  "evaluation-results",
]);

function rewriteDocLink(href: string): string {
  const m = href.match(/^(?:\.\/|\/)?([a-z0-9-]+)\.md(?:#.*)?$/i);
  if (m && INTERNAL_DOCS.has(m[1])) return `/docs/${m[1]}`;
  return href;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
