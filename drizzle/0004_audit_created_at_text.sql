ALTER TABLE "audit_log" ALTER COLUMN "created_at" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "created_at" DROP DEFAULT;