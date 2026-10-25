CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"audit_id" uuid NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"title_fr" text NOT NULL,
	"law_article" text NOT NULL,
	"description_fr" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"business_risk_fr" text NOT NULL,
	"remediation_pitch_fr" text NOT NULL,
	"estimated_fix_cad" integer NOT NULL,
	"human_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"domain" text NOT NULL,
	"mode" text DEFAULT 'PASSIVE_LOI25' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"grade" text DEFAULT 'F' NOT NULL,
	"summary_fr" text DEFAULT 'Analyse en attente.' NOT NULL,
	"raw_probe_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_findings_audit_id_idx" ON "audit_findings" USING btree ("audit_id");