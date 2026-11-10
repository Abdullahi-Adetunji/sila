// Single source of truth for role-based navigation. Every signed-in view
// consults this: the (app) layout renders tabs from `tabsFor(role)`, the
// login/signup/demo flows redirect to `startPathFor(role)`, and the layout
// bounces a staff account off any path not in their tab set.
//
// Keep this file in sync with the server-side role guards (every person
// path here has a requirePersonRole middleware on the corresponding API
// route; every counsellor path has requireCounsellorRole; etc.).

export type Role = "person" | "counsellor" | "lab" | "evaluator" | "admin";

export interface Tab {
  href: string;
  label: string;
}

const PERSON_TABS: Tab[] = [
  { href: "/home", label: "Home" },
  { href: "/me", label: "My result" },
  { href: "/partner", label: "Partner" },
  { href: "/consent", label: "Consent" },
  { href: "/couple", label: "Couple result" },
  { href: "/relatives", label: "Relatives" },
  { href: "/referrals", label: "Referrals" },
  { href: "/options", label: "Options" },
  { href: "/access-log", label: "Access log" },
];

const COUNSELLOR_TABS: Tab[] = [{ href: "/counsellor-queue", label: "Queue" }];
const EVALUATOR_TABS: Tab[] = [{ href: "/evaluator", label: "Dashboard" }];

// Placeholder tab sets for roles whose pages don't exist yet. When the
// admin + lab pages ship, replace these with the actual tab lists. Having
// stubs here keeps the shell honest: a `lab` or `admin` session is never
// shown a person page by accident.
const LAB_TABS: Tab[] = [{ href: "/lab", label: "Submit result" }];
const ADMIN_TABS: Tab[] = [{ href: "/admin", label: "Staff" }];

const TABS: Record<Role, Tab[]> = {
  person: PERSON_TABS,
  counsellor: COUNSELLOR_TABS,
  lab: LAB_TABS,
  evaluator: EVALUATOR_TABS,
  admin: ADMIN_TABS,
};

export function tabsFor(role: Role): Tab[] {
  return TABS[role];
}

export function startPathFor(role: Role): string {
  return TABS[role][0].href;
}

// True if the given pathname is one of the tabs a role is allowed to see.
// Used by the app shell to decide whether to redirect a staff account off
// a page it shouldn't be on.
export function isAllowedPath(role: Role, pathname: string): boolean {
  const tabs = TABS[role];
  return tabs.some((t) => t.href === pathname || pathname.startsWith(`${t.href}/`));
}
