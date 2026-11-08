CREATE TYPE "public"."consent_purpose" AS ENUM('couple_risk', 'share_with_partner', 'share_with_relative', 'counsellor_access', 'evaluation_data');--> statement-breakpoint
CREATE TYPE "public"."partner_link_status" AS ENUM('pending', 'active', 'broken');--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grantor_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"target_user_id" uuid,
	"target_other" text,
	"scope" text,
	"wording_version" varchar(32) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "partner_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid,
	"invite_code" varchar(32) NOT NULL,
	"status" "partner_link_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_grantor_id_users_id_fk" FOREIGN KEY ("grantor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_links" ADD CONSTRAINT "partner_links_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_links" ADD CONSTRAINT "partner_links_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_grantor_purpose_idx" ON "consents" USING btree ("grantor_id","purpose");--> statement-breakpoint
CREATE INDEX "consents_target_user_idx" ON "consents" USING btree ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_links_invite_code_idx" ON "partner_links" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "partner_links_inviter_idx" ON "partner_links" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "partner_links_invitee_idx" ON "partner_links" USING btree ("invitee_id");