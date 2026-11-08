"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { SectionLabel } from "../../components/SectionLabel";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";

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
        // The REST route expects DELETE; fall back if the proxy strips methods.
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
      <h1 className="text-2xl font-semibold">
        {lang === "en" ? "Relatives" : "الأقارب"}
      </h1>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <SectionLabel section={explainer.sectionLabel} lang={lang} />
        <p className="mt-2 text-sm">{explainer.text[lang]}</p>
      </section>

      <form onSubmit={add} className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === "en" ? "Relative display name" : "اسم القريب للعرض"}
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-full bg-teal px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {lang === "en" ? "Add relative" : "إضافة قريب"}
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {relatives.map((r) => {
          const share = activeShareFor(r.id);
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">{r.displayName}</p>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink"
                >
                  {lang === "en" ? "Remove" : "حذف"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {share ? (
                  <>
                    <span className="rounded-full bg-teal-soft px-3 py-1 text-xs text-teal">
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
                      className="rounded-full border border-teal px-3 py-1 text-xs text-teal"
                    >
                      {lang === "en" ? "Revoke share" : "سحب المشاركة"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => grant(r.id, "conditions_carried")}
                      className="rounded-full bg-teal px-3 py-1 text-xs text-white"
                    >
                      {lang === "en" ? "Share conditions carried" : "مشاركة الحالات المحمولة"}
                    </button>
                    <button
                      onClick={() => grant(r.id, "full_result")}
                      className="rounded-full border border-teal px-3 py-1 text-xs text-teal"
                    >
                      {lang === "en" ? "Share full result" : "مشاركة النتيجة الكاملة"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {relatives.length === 0 && (
          <li className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            {lang === "en"
              ? "No relatives added yet."
              : "لم يُضَف أي قريب بعد."}
          </li>
        )}
      </ul>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
