CREATE TYPE "public"."form_order" AS ENUM('AB', 'BA');--> statement-breakpoint
CREATE TYPE "public"."quiz_form" AS ENUM('A', 'B');--> statement-breakpoint
CREATE TYPE "public"."quiz_phase" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TYPE "public"."reading_band" AS ENUM('low', 'medium', 'high', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."ttr_kind" AS ENUM('opened_result', 'opened_referral_form', 'submitted_referral');--> statement-breakpoint
CREATE TYPE "public"."volunteer_language" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TABLE "clinician_import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" text NOT NULL,
	"rows_imported" integer NOT NULL,
	"risk_accuracy_pct" integer,
	"escalation_accuracy_pct" integer,
	"mismatches" jsonb
);
--> statement-breakpoint
CREATE TABLE "privacy_report_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" text NOT NULL,
	"ended_at" text NOT NULL,
	"passed" integer NOT NULL,
	"failed" integer NOT NULL,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "quiz_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"volunteer_id" text NOT NULL,
	"phase" "quiz_phase" NOT NULL,
	"form" "quiz_form" NOT NULL,
	"item_id" text NOT NULL,
	"answer" text NOT NULL,
	"correct" integer NOT NULL,
	"answered_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_to_referral_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"volunteer_id" text NOT NULL,
	"kind" "ttr_kind" NOT NULL,
	"at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" text PRIMARY KEY NOT NULL,
	"language" "volunteer_language" NOT NULL,
	"reading_band" "reading_band" DEFAULT 'unknown' NOT NULL,
	"form_order" "form_order" NOT NULL,
	"couple_id" text NOT NULL,
	"started_at" text NOT NULL,
	"consented_at" text,
	"completed_at" text,
	"withdrawn_at" text
);
--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "reason_snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_responses" ADD CONSTRAINT "quiz_responses_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_to_referral_events" ADD CONSTRAINT "time_to_referral_events_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_responses_volunteer_idx" ON "quiz_responses" USING btree ("volunteer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_responses_unique" ON "quiz_responses" USING btree ("volunteer_id","phase","item_id");--> statement-breakpoint
CREATE INDEX "ttr_volunteer_idx" ON "time_to_referral_events" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX "volunteers_started_idx" ON "volunteers" USING btree ("started_at");