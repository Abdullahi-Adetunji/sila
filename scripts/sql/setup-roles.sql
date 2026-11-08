-- Run once as a Postgres superuser against the Sila database.
-- Creates the two application roles. Owns no objects by itself.
--
-- sila_owner: used by migrations and drizzle-kit. Owns all app tables.
-- sila_app:   used by the API process at runtime. Least-privilege. Must not
--             own tables so it cannot disable triggers, drop columns, alter
--             the audit chain or rewrite its history.
--
-- Passwords are intentionally not set here. Set them in CI or at deploy time
-- with ALTER ROLE ... WITH LOGIN PASSWORD '...'. Example:
--   ALTER ROLE sila_owner WITH LOGIN PASSWORD 'xxx';
--   ALTER ROLE sila_app   WITH LOGIN PASSWORD 'yyy';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sila_owner') THEN
    CREATE ROLE sila_owner WITH LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sila_app') THEN
    CREATE ROLE sila_app WITH LOGIN;
  END IF;
END
$$;

-- sila_owner owns the schema we work in. sila_app only uses it.
GRANT USAGE ON SCHEMA public TO sila_app;
