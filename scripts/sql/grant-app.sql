-- Grants the least-privilege set to sila_app. Idempotent. Run as sila_owner
-- (or a superuser) AFTER migrations have applied.
--
-- The rule for audit_log is the defining one: SELECT + INSERT only. No
-- UPDATE, no DELETE, no TRUNCATE, no ownership. The BEFORE UPDATE/DELETE/
-- TRUNCATE triggers are the second line of defence; this is the first.

-- Data tables the app owns the full lifecycle of.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users,
  sessions,
  vault_keys,
  vault_results,
  partner_links,
  consents,
  relatives,
  referrals,
  referral_steps
TO sila_app;

-- The audit log is append-only even for the app itself.
GRANT SELECT, INSERT ON TABLE audit_log TO sila_app;

-- Sequences used by bigserial / defaultRandom columns.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sila_app;

-- Make sure future tables created by sila_owner are reachable by sila_app
-- in the same way without re-running this script for every new table.
ALTER DEFAULT PRIVILEGES FOR ROLE sila_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sila_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sila_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sila_app;
