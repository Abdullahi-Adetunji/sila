"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import { IconArrowRight, IconShield, IconUsers, IconScroll } from "../../components/Icons";

type StaffRole = "counsellor" | "lab" | "evaluator" | "admin";

interface StaffRow {
  id: string;
  email: string;
  displayName: string | null;
  role: StaffRole;
  status: "active" | "deactivated";
  createdAt: string;
  lastLoginAt: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  expiresAt: string;
}

interface AdminAction {
  seq: number;
  createdAt: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  outcome: "allowed" | "denied";
  meta: unknown;
}

interface Stats {
  staffCount: number;
  activeStaff: number;
  pendingInvites: number;
}

export default function AdminDashboard() {
  const { csrfToken, user } = useSession();
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [pending, setPending] = useState<PendingInvite[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [actions, setActions] = useState<AdminAction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("counsellor");
  const [submitting, setSubmitting] = useState(false);
  const [issuedInvite, setIssuedInvite] = useState<{ code: string; email: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, st, a] = await Promise.all([
        api.get<{ staff: StaffRow[]; pendingInvites: PendingInvite[] }>("/api/admin/staff"),
        api.get<Stats>("/api/admin/stats"),
        api.get<{ actions: AdminAction[] }>("/api/admin/actions"),
      ]);
      setStaff(s.staff);
      setPending(s.pendingInvites);
      setStats(st);
      setActions(a.actions);
      setError(null);
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 403) setError("admin-only");
      else setError("Could not load admin data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);
    setIssuedInvite(null);
    try {
      const r = await api.post<{ invite: { code: string; email: string } }>(
        "/api/admin/invite",
        { email, displayName: name, role },
        csrfToken,
      );
      setIssuedInvite({ code: r.invite.code, email: r.invite.email });
      setEmail("");
      setName("");
      await load();
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 400) {
        setError((e.body as { error?: string } | null)?.error ?? "Could not create invite.");
      } else {
        setError("Could not create invite.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    if (!csrfToken) return;
    if (!confirm("Deactivate this account? Sessions are revoked immediately. The row is not deleted.")) return;
    try {
      await api.post(`/api/admin/user/${id}/deactivate`, {}, csrfToken);
      await load();
    } catch {
      setError("Could not deactivate.");
    }
  }

  async function reactivate(id: string) {
    if (!csrfToken) return;
    try {
      await api.post(`/api/admin/user/${id}/reactivate`, {}, csrfToken);
      await load();
    } catch {
      setError("Could not reactivate.");
    }
  }

  async function regenerate(id: string) {
    if (!csrfToken) return;
    try {
      const r = await api.post<{ invite: { code: string } }>(
        `/api/admin/invite/${id}/regenerate`,
        {},
        csrfToken,
      );
      setIssuedInvite({ code: r.invite.code, email: pending?.find((p) => p.id === id)?.email ?? "" });
      await load();
    } catch {
      setError("Could not regenerate invite.");
    }
  }

  async function revoke(id: string) {
    if (!csrfToken) return;
    try {
      await api.post(`/api/admin/invite/${id}/revoke`, {}, csrfToken);
      await load();
    } catch {
      setError("Could not revoke invite.");
    }
  }

  const inviteUrl = useMemo(() => {
    if (!issuedInvite) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${issuedInvite.code}`;
  }, [issuedInvite]);

  if (error === "admin-only") {
    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          This page is only visible to admin accounts.
        </p>
      </main>
    );
  }

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            <span aria-hidden className="rule-green" />
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Staff &amp; invites
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Create counsellor, lab, evaluator or admin accounts. Admins never see any person&apos;s
            result, consent, couple view, referral, relative share or volunteer data; that ceiling
            is enforced at the route level.
          </p>
        </header>
      </Reveal>

      {stats && (
        <Reveal>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <StatTile label="Staff accounts" value={stats.staffCount} Icon={IconUsers} />
            <StatTile label="Active staff" value={stats.activeStaff} Icon={IconShield} />
            <StatTile label="Pending invites" value={stats.pendingInvites} Icon={IconScroll} />
          </div>
        </Reveal>
      )}

      {error && error !== "admin-only" && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Invite form */}
      <Reveal>
        <section className="tile p-6">
          <h2 className="text-lg font-semibold">Invite a staff member</h2>
          <p className="mt-1 text-sm text-muted">
            Sila generates a one-time setup link (72 h). The admin sees it once and shares it with
            the invitee out-of-band. No email is sent by Sila.
          </p>
          <form onSubmit={createInvite} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </label>
            <label className="block text-sm font-medium">
              Display name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </label>
            <label className="block text-sm font-medium">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="counsellor">Counsellor</option>
                <option value="lab">Lab</option>
                <option value="evaluator">Evaluator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting || !email || !name}
              className="self-end rounded-full bg-teal px-4 py-2 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {submitting ? "Creating…" : "Create invite"}
            </button>
          </form>
          {issuedInvite && (
            <div className="mt-5 rounded-xl border border-teal/40 bg-teal-soft/40 p-4">
              <p className="text-sm font-semibold text-ink">
                Invite created for <span className="font-mono">{issuedInvite.email}</span>
              </p>
              <p className="mt-2 text-xs text-muted">
                Share this one-time link out-of-band. Sila will not show it again.
              </p>
              <p className="mt-2 break-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs">
                {inviteUrl}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl).catch(() => {})}
                className="mt-3 rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                Copy link
              </button>
            </div>
          )}
        </section>
      </Reveal>

      {/* Pending invites */}
      {pending && pending.length > 0 && (
        <Reveal>
          <section className="mt-8 tile p-6">
            <h2 className="text-lg font-semibold">Pending invites</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Expires</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="py-2">{p.displayName}</td>
                      <td className="py-2 font-mono text-xs">{p.email}</td>
                      <td className="py-2">
                        <RolePill role={p.role} />
                      </td>
                      <td className="py-2 font-mono text-xs text-muted">
                        {new Date(p.expiresAt).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => regenerate(p.id)}
                          className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => revoke(p.id)}
                          className="ml-2 rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>
      )}

      {/* Staff list */}
      <Reveal>
        <section className="mt-8 tile p-6">
          <h2 className="text-lg font-semibold">Staff accounts</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Last login</th>
                  <th className="pb-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {staff?.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2 font-mono text-xs">{s.email}</td>
                    <td className="py-2"><RolePill role={s.role} /></td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          s.status === "active"
                            ? "bg-teal-soft text-teal"
                            : "bg-line text-muted"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {s.id === user?.id ? (
                        <span className="text-xs text-muted">You</span>
                      ) : s.status === "active" ? (
                        <button
                          onClick={() => deactivate(s.id)}
                          className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-affected focus:outline-none focus-visible:ring-2 focus-visible:ring-affected"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivate(s.id)}
                          className="rounded-full border border-teal/50 px-3 py-1 text-xs text-teal hover:bg-teal-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Reveal>

      {/* Admin action feed */}
      <Reveal>
        <section className="mt-8 tile p-6">
          <h2 className="text-lg font-semibold">Recent admin actions</h2>
          <p className="mt-1 text-xs text-muted">
            Only admin actions appear here. Person-scoped audit entries are never shown to admins.
          </p>
          <ul className="mt-4 divide-y divide-line text-sm">
            {actions && actions.length === 0 && (
              <li className="py-3 text-muted">No admin actions yet.</li>
            )}
            {actions?.slice(0, 50).map((a) => (
              <li key={a.seq} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted">
                    #{a.seq} · {new Date(a.createdAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="font-medium">{a.action}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        a.outcome === "allowed"
                          ? "bg-teal-soft text-teal"
                          : "bg-affected-soft text-affected"
                      }`}
                    >
                      {a.outcome}
                    </span>
                    <IconArrowRight />
                  </span>
                </div>
                {a.targetId && (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    target: {a.targetType ?? "-"}/{a.targetId}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </main>
  );
}

function StatTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: (p: { className?: string }) => React.ReactElement;
}) {
  return (
    <section className="tile p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        <span aria-hidden className="text-teal">
          <Icon />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </section>
  );
}

function RolePill({ role }: { role: StaffRole }) {
  return (
    <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal">
      {role}
    </span>
  );
}
