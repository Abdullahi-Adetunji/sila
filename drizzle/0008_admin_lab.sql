CREATE TYPE "public"."user_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
-- `ALTER TYPE role ADD VALUE 'admin'` CANNOT run inside a transaction
-- block (Postgres restriction on enum changes), and Drizzle's migrator
-- wraps each migration file in a transaction. The ADD VALUE is run
-- separately by scripts/db-migrate.ts before this migration applies,
-- using `IF NOT EXISTS` so it is safe to re-run.
CREATE TABLE "admin_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"email" varchar(254) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_user_id" uuid,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admin_totp" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"recovery_codes" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_consumed_user_id_users_id_fk" FOREIGN KEY ("consumed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_totp" ADD CONSTRAINT "admin_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invites_code_hash_unique" ON "admin_invites" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "admin_invites_email_lower_idx" ON "admin_invites" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "admin_invites_created_by_idx" ON "admin_invites" USING btree ("created_by");