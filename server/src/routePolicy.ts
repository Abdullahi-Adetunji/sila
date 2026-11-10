// Declarations of the policy stance for every mounted route. The route-
// inventory test enforces:
//   1. Every route enumerated at runtime has an entry here.
//   2. Routes that read or write "person, couple, referral, relative,
//      consent or vault" data MUST have kind "policy" with a non-empty
//      action name (the policy helper the handler goes through).
//   3. kind "public" and kind "session_only" rows carry a one-line reason.
//
// This surfaces the policy choice per-route so a reviewer can scan the
// map rather than grep every handler.

export type RouteClass =
  | { kind: "policy"; action: string }
  | { kind: "public"; reason: string }
  | { kind: "session_only"; reason: string };

export const ROUTE_POLICY: Record<string, RouteClass> = {
  // --- Auth ---
  "POST /api/auth/signup": { kind: "public", reason: "account creation entry point" },
  "POST /api/auth/login": { kind: "public", reason: "rate-limited login entry point" },
  "POST /api/auth/logout": { kind: "session_only", reason: "invalidates own session only" },
  "GET /api/auth/me": { kind: "session_only", reason: "returns own session metadata" },

  // --- Person data (self) ---
  "GET /api/me/sila-id": { kind: "policy", action: "canReadOwnSilaId" },
  "GET /api/me/result": { kind: "policy", action: "canReadOwnResult" },
  "GET /api/me/access-log": { kind: "policy", action: "canReadOwnAccessLog" },

  // --- Partner linking (own link) ---
  "GET /api/partner": { kind: "policy", action: "canManageOwnPartnerLink" },
  "POST /api/partner/invite": { kind: "policy", action: "canManageOwnPartnerLink" },
  "POST /api/partner/accept": { kind: "policy", action: "canManageOwnPartnerLink" },

  // --- Consent (own consents) ---
  "GET /api/consent": { kind: "policy", action: "canManageOwnConsent" },
  "POST /api/consent": { kind: "policy", action: "canManageOwnConsent" },
  "POST /api/consent/revoke": { kind: "policy", action: "canManageOwnConsent" },

  // --- Couple-risk ---
  "GET /api/couple/risk": { kind: "policy", action: "canReadCoupleRisk" },

  // --- Counsellor ---
  "GET /api/counsellor/case/:personId/result": { kind: "policy", action: "canCounsellorRead" },
  "GET /api/counsellor/queue": { kind: "policy", action: "canReadCounsellorQueue" },

  // --- Relatives (own) ---
  "GET /api/relatives": { kind: "policy", action: "canManageOwnRelative" },
  "POST /api/relatives": { kind: "policy", action: "canManageOwnRelative" },
  "DELETE /api/relatives/:id": { kind: "policy", action: "canManageOwnRelative" },

  // --- Referrals ---
  "GET /api/referrals": { kind: "policy", action: "canReadOwnReferrals" },
  "POST /api/referrals": { kind: "policy", action: "canCreateOwnReferral" },
  "POST /api/referrals/:id/step": { kind: "policy", action: "canAddReferralStep" },
  "GET /api/referrals/:id": { kind: "policy", action: "canReadReferral" },

  // --- Demo (DEMO_MODE-gated at the handler level) ---
  "GET /api/demo/config": { kind: "public", reason: "public feature-flag check" },
  "POST /api/demo/login": { kind: "public", reason: "DEMO_PASSWORD-authenticated; 404 unless DEMO_MODE" },
  "POST /api/demo/reset": {
    kind: "session_only",
    reason: "signed-in demo account only; touches demo accounts only (checked server-side)",
  },

  // --- Dev clock (ops, demo/evaluator-gated) ---
  "GET /api/dev/clock": { kind: "session_only", reason: "demo or evaluator account; ops endpoint" },
  "POST /api/dev/clock/advance": {
    kind: "session_only",
    reason: "demo or evaluator account; audit-logged",
  },

  // --- Volunteer (anonymous, HMAC-of-code gated at handler level) ---
  "POST /api/volunteer/join": { kind: "public", reason: "anonymous study join" },
  "GET /api/volunteer/me": {
    kind: "session_only",
    reason: "code-authenticated via x-volunteer-code header",
  },
  "POST /api/volunteer/consent": {
    kind: "session_only",
    reason: "code-authenticated via x-volunteer-code header",
  },
  "POST /api/volunteer/complete": {
    kind: "session_only",
    reason: "code-authenticated via x-volunteer-code header",
  },
  "POST /api/volunteer/withdraw": {
    kind: "session_only",
    reason: "code-authenticated via x-volunteer-code header",
  },
  "GET /api/volunteer/quiz": {
    kind: "session_only",
    reason: "code-authenticated; reads own quiz items",
  },
  "POST /api/volunteer/quiz/response": {
    kind: "session_only",
    reason: "code-authenticated; writes own quiz response",
  },
  "GET /api/volunteer/quiz/progress": {
    kind: "session_only",
    reason: "code-authenticated; reads own progress",
  },
  "POST /api/volunteer/ttr": {
    kind: "session_only",
    reason: "code-authenticated; writes own milestone",
  },
  "GET /api/volunteer/couple-view": {
    kind: "session_only",
    reason: "code-authenticated; reads a synthetic couple view, not a real person's data",
  },

  // --- Evaluator aggregates (no per-person personal data) ---
  "GET /api/evaluator/clinician-accuracy": { kind: "policy", action: "canReadEvaluatorDashboard" },
  "GET /api/evaluator/privacy": { kind: "policy", action: "canReadEvaluatorDashboard" },
  "GET /api/evaluator/attack": { kind: "policy", action: "canReadEvaluatorDashboard" },
  "GET /api/evaluator/comprehension/by-language": {
    kind: "policy",
    action: "canReadEvaluatorDashboard",
  },
  "GET /api/evaluator/comprehension/by-reading-band": {
    kind: "policy",
    action: "canReadEvaluatorDashboard",
  },
  "GET /api/evaluator/time-to-referral/by-language": {
    kind: "policy",
    action: "canReadEvaluatorDashboard",
  },
  "GET /api/evaluator/time-to-referral/by-reading-band": {
    kind: "policy",
    action: "canReadEvaluatorDashboard",
  },

  // --- Admin / staff invites ---
  // The invite endpoints are public because the invite code itself is
  // the only credential. They are rate-limited and the code is 32 bytes
  // of url-safe base64 (~192 bits).
  "GET /api/invite/:code": { kind: "public", reason: "invite code is the credential" },
  "POST /api/invite/:code/claim": { kind: "public", reason: "rate-limited claim flow" },

  // --- Admin dashboard ---
  // All gated by requireAdminRole; no personal genetic data is returned.
  "GET /api/admin/staff": { kind: "session_only", reason: "admin-only staff roster" },
  "POST /api/admin/invite": { kind: "session_only", reason: "admin creates staff invite" },
  "POST /api/admin/invite/:id/regenerate": {
    kind: "session_only",
    reason: "admin reissues staff invite",
  },
  "POST /api/admin/invite/:id/revoke": {
    kind: "session_only",
    reason: "admin cancels staff invite",
  },
  "POST /api/admin/user/:id/deactivate": {
    kind: "session_only",
    reason: "admin deactivates staff; sessions killed",
  },
  "POST /api/admin/user/:id/reactivate": {
    kind: "session_only",
    reason: "admin re-enables staff",
  },
  "GET /api/admin/actions": { kind: "session_only", reason: "admin's own action feed" },
  "GET /api/admin/stats": { kind: "session_only", reason: "admin header counts" },

  // --- Lab submit ---
  // Lab accounts can WRITE results via /submit. There is no GET; labs
  // cannot read any result back. requireLabRole gates every mutation.
  "POST /api/lab/submit": { kind: "session_only", reason: "lab-only write; no read" },
};

// Path prefixes whose routes MUST carry kind: "policy". Used by the test to
// make sure a new route under one of these prefixes is not accidentally
// labelled "public" or "session_only".
export const POLICY_REQUIRED_PATTERNS: RegExp[] = [
  /^\/api\/me(\/|$)/,
  /^\/api\/couple(\/|$)/,
  /^\/api\/consent(\/|$)/,
  /^\/api\/partner(\/|$)/,
  /^\/api\/relatives(\/|$)/,
  /^\/api\/referrals(\/|$)/,
  /^\/api\/counsellor(\/|$)/,
];

export function isPolicyRequired(path: string): boolean {
  return POLICY_REQUIRED_PATTERNS.some((re) => re.test(path));
}
