CREATE TYPE "public"."referral_priority" AS ENUM('information', 'counsellor', 'counsellor_priority');--> statement-breakpoint
CREATE TYPE "public"."referral_step" AS ENUM('referred', 'counselling_booked', 'counselling_done', 'confirmatory_ordered', 'result_received', 'specialist_referral', 'closed');--> statement-breakpoint
CREATE TABLE "referral_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"step" "referral_step" NOT NULL,
	"occurred_at" text NOT NULL,
	"actor_id" uuid,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"priority" "referral_priority" NOT NULL,
	"reason_snapshot" jsonb,
	"created_at" text NOT NULL,
	"closed_at" text
);
--> statement-breakpoint
ALTER TABLE "referral_steps" ADD CONSTRAINT "referral_steps_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_steps" ADD CONSTRAINT "referral_steps_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_person_id_users_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_steps_referral_idx" ON "referral_steps" USING btree ("referral_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_steps_unique" ON "referral_steps" USING btree ("referral_id","step");--> statement-breakpoint
CREATE INDEX "referrals_person_idx" ON "referrals" USING btree ("person_id");