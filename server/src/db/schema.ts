import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["person", "counsellor", "lab", "evaluator"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("person"),
    locale: varchar("locale", { length: 8 }).notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfToken: text("csrf_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

// Envelope encryption: each person has a wrapped per-person data key. The KEK
// lives in env, never in the database. Deleting this row crypto-shreds the
// person's results.
export const vaultKeys = pgTable("vault_keys", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  wrappedDataKey: text("wrapped_data_key").notNull(),
  keyVersion: integer("key_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A person's encrypted carrier screening result. One row per person (M1).
// The ciphertext is AES-256-GCM(iv || ct || tag) over the full results JSON.
export const vaultResults = pgTable(
  "vault_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ciphertext: text("ciphertext").notNull(),
    payloadVersion: integer("payload_version").notNull().default(1),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vault_results_user_unique").on(t.userId)],
);

export const partnerLinkStatusEnum = pgEnum("partner_link_status", [
  "pending",
  "active",
  "broken",
]);

export const partnerLinks = pgTable(
  "partner_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id").references(() => users.id, { onDelete: "cascade" }),
    inviteCode: varchar("invite_code", { length: 32 }).notNull(),
    status: partnerLinkStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("partner_links_invite_code_idx").on(t.inviteCode),
    index("partner_links_inviter_idx").on(t.inviterId),
    index("partner_links_invitee_idx").on(t.inviteeId),
  ],
);

export const consentPurposeEnum = pgEnum("consent_purpose", [
  "couple_risk",
  "share_with_partner",
  "share_with_relative",
  "counsellor_access",
  "evaluation_data",
]);

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grantorId: uuid("grantor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: consentPurposeEnum("purpose").notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "cascade" }),
    targetOther: text("target_other"),
    scope: text("scope"),
    wordingVersion: varchar("wording_version", { length: 32 }).notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("consents_grantor_purpose_idx").on(t.grantorId, t.purpose),
    index("consents_target_user_idx").on(t.targetUserId),
  ],
);

export const auditOutcomeEnum = pgEnum("audit_outcome", ["allowed", "denied"]);

// Append-only hash-chained audit log. A DB trigger (added in the migration)
// blocks UPDATE and DELETE. Rows never contain genetic data.
export const auditLog = pgTable(
  "audit_log",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    purpose: text("purpose"),
    outcome: auditOutcomeEnum("outcome").notNull(),
    meta: jsonb("meta"),
    // Stored as text so the exact string the hash was computed over is
    // preserved byte-for-byte on readback.
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_target_idx").on(t.targetType, t.targetId),
    uniqueIndex("audit_log_hash_unique").on(t.hash),
  ],
);
