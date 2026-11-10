"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { SectionLabel } from "../../components/SectionLabel";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { LangSwitch } from "../../components/LangSwitch";
import { Reveal } from "../../components/Reveal";
import { IconUsers } from "../../components/Icons";

interface Relative {
  id: string;
  displayName: string;
}

interface ConsentRow {
  id: string;
  purpose: string;
  targetUserId: string | null;
  targetOther?: string | null;
  scope: string | null;
}

export default function RelativesPage() {
  const { csrfToken, user } = useSession();
  const [lang, setLang] = useState<Lang>("en");
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.locale) setLang(user.locale);
  }, [user]);

  const load = useCallback(async () => {
    const [relRes, conRes] = await Promise.all([
      api.get<{ relatives: Relative[] }>("/api/relatives"),
      api.get<{ consents: ConsentRow[] }>("/api/consent"),
    ]);
    setRelatives(relRes.relatives);
    setConsents(conRes.consents);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken || !name.trim()) return;
    setError(null);
    try {
      await api.post("/api/relatives", { displayName: name.trim() }, csrfToken);
      setName("");
      await load();
    } catch {
      setError("Could not add that relative.");
    }
  }

  async function remove(id: string) {
    if (!csrfToken) return;
    try {
      await api.post(`/api/relatives/${id}`, undefined, csrfToken).catch(async () => {
        await fetch(`/api/relatives/${id}`, {
          method: "DELETE",
          headers: { "x-csrf-token": csrfToken },
          credentials: "same-origin",
        });
      });
      await load();
    } catch {
      setError("Could not remove that relative.");
    }
  }

  async function grant(relativeId: string, scope: "conditions_carried" | "full_result") {
    if (!csrfToken) return;
    try {
      await api.post(
        "/api/consent",
        { purpose: "share_with_relative", targetOther: relativeId, scope },
        csrfToken,
      );
      await load();
    } catch {
      setError("Could not grant the share.");
    }
  }

  async function revoke(relativeId: string) {
    if (!csrfToken) return;
    try {
      await api.post(
        "/api/consent/revoke",
        { purpose: "share_with_relative", targetOther: relativeId },
        csrfToken,
      );
      await load();
    } catch {
      setError("Could not revoke the share.");
    }
  }

  const activeShareFor = (rid: string): ConsentRow | undefined =>
    consents.find((c) => c.purpose === "share_with_relative" && c.targetOther === rid);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const explainer = getTemplate("relative.share.explainer");

  return (
    <main dir={dir} lang={lang}>
      <Reveal>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Extended family</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {lang === "en" ? "Relatives" : "الأقارب"}
            </h1>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </header>
      </Reveal>

      <Reveal>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <SectionLabel section={explainer.sectionLabel} lang={lang} />
          <p className="mt-3 text-sm leading-relaxed">{explainer.text[lang]}</p>
        </section>
      </Reveal>

      <Reveal>
        <form onSubmit={add} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === "en" ? "Relative display name" : "اسم القريب للعرض"}
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-full bg-teal px-4 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {lang === "en" ? "Add relative" : "إضافة قريب"}
          </button>
        </form>
      </Reveal>

      <ul className="mt-6 space-y-3">
        {relatives.map((r, i) => {
          const share = activeShareFor(r.id);
          return (
            <Reveal
              as="li"
              key={r.id}
              delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              <article className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal"
                    >
                      <IconUsers />
                    </span>
                    <p className="text-base font-semibold">{r.displayName}</p>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    {lang === "en" ? "Remove" : "حذف"}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {share ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-xs font-medium text-white">
                        {lang === "en" ? "Shared: " : "مشارَك: "}
                        {share.scope === "full_result"
                          ? lang === "en"
                            ? "full result"
                            : "النتيجة الكاملة"
                          : lang === "en"
                            ? "conditions carried"
                            : "الحالات المحمولة"}
                      </span>
                      <button
                        onClick={() => revoke(r.id)}
                        className="rounded-full border border-teal px-3 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        {lang === "en" ? "Revoke share" : "سحب المشاركة"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => grant(r.id, "conditions_carried")}
                        className="rounded-full bg-teal px-3 py-1 text-xs font-medium text-white transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        {lang === "en" ? "Share conditions carried" : "مشاركة الحالات المحمولة"}
                      </button>
                      <button
                        onClick={() => grant(r.id, "full_result")}
                        className="rounded-full border border-teal px-3 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        {lang === "en" ? "Share full result" : "مشاركة النتيجة الكاملة"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
        {relatives.length === 0 && (
          <Reveal as="li">
            <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
              {lang === "en" ? "No relatives added yet." : "لم يُضَف أي قريب بعد."}
            </p>
          </Reveal>
        )}
      </ul>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
