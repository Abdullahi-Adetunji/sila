-- Runs after setup-roles.sql on docker-compose first start. Sets passwords
-- so .env can connect. Change these before any deploy.
ALTER ROLE sila_owner WITH LOGIN PASSWORD 'sila';
ALTER ROLE sila_app   WITH LOGIN PASSWORD 'sila';

-- Hand ownership of the database and the public schema to sila_owner.
ALTER DATABASE sila OWNER TO sila_owner;
ALTER SCHEMA public OWNER TO sila_owner;
