CREATE TABLE "engagement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"revocation_reason" text,
	CONSTRAINT "engagement_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "engagement_revision_positive" CHECK ("engagement"."current_revision" > 0),
	CONSTRAINT "engagement_revocation_complete" CHECK (("engagement"."revoked_at" IS NULL AND "engagement"."revoked_by" IS NULL AND "engagement"."revocation_reason" IS NULL) OR ("engagement"."revoked_at" IS NOT NULL AND "engagement"."revoked_by" IS NOT NULL AND "engagement"."revocation_reason" IS NOT NULL AND length(trim("engagement"."revocation_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "engagement_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"engagement_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"approver_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_approval_version_unique" UNIQUE("organization_id","engagement_id","revision")
);
--> statement-breakpoint
CREATE TABLE "engagement_version" (
	"organization_id" text NOT NULL,
	"engagement_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"objective" text NOT NULL,
	"responsible_user_id" text NOT NULL,
	"scope" jsonb NOT NULL,
	"authorization_text" text NOT NULL,
	"authorization_sha256" text NOT NULL,
	"source_reference" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_version_organization_id_engagement_id_revision_pk" PRIMARY KEY("organization_id","engagement_id","revision"),
	CONSTRAINT "engagement_version_revision_positive" CHECK ("engagement_version"."revision" > 0),
	CONSTRAINT "engagement_version_valid_interval" CHECK ("engagement_version"."valid_from" < "engagement_version"."valid_until"),
	CONSTRAINT "engagement_version_digest_format" CHECK ("engagement_version"."authorization_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "engagement" ADD CONSTRAINT "engagement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_approval" ADD CONSTRAINT "engagement_approval_same_organization_version_fk" FOREIGN KEY ("organization_id","engagement_id","revision") REFERENCES "public"."engagement_version"("organization_id","engagement_id","revision") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_version" ADD CONSTRAINT "engagement_version_same_organization_fk" FOREIGN KEY ("organization_id","engagement_id") REFERENCES "public"."engagement"("organization_id","id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Reviewed authorization boundary. Policies/grants are not represented by Drizzle snapshots.
--> statement-breakpoint
GRANT SELECT, INSERT ON public.engagement, public.engagement_version, public.engagement_approval TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (current_revision, revoked_at, revoked_by, revocation_reason) ON public.engagement TO bump_runtime;
--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON public.engagement FROM bump_runtime;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON public.engagement_version, public.engagement_approval FROM bump_runtime;
--> statement-breakpoint
ALTER TABLE public.engagement ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.engagement FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY engagement_read ON public.engagement
FOR SELECT TO bump_runtime USING (
  engagement.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
  )
);
--> statement-breakpoint
ALTER TABLE public.engagement_version ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.engagement_version FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY engagement_version_read ON public.engagement_version
FOR SELECT TO bump_runtime USING (
  engagement_version.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement_version.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
  )
);
--> statement-breakpoint
ALTER TABLE public.engagement_approval ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.engagement_approval FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY engagement_approval_read ON public.engagement_approval
FOR SELECT TO bump_runtime USING (
  engagement_approval.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement_approval.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
  )
);
--> statement-breakpoint
CREATE POLICY engagement_create ON public.engagement
FOR INSERT TO bump_runtime WITH CHECK (
  engagement.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
  AND created_by = NULLIF(current_setting('app.user_id', true), '')
  AND revoked_at IS NULL
);
--> statement-breakpoint
CREATE POLICY engagement_change ON public.engagement
FOR UPDATE TO bump_runtime USING (
  engagement.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
  AND revoked_at IS NULL
) WITH CHECK (
  engagement.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
  AND (revoked_by IS NULL OR revoked_by = NULLIF(current_setting('app.user_id', true), ''))
);
--> statement-breakpoint
CREATE POLICY engagement_version_create ON public.engagement_version
FOR INSERT TO bump_runtime WITH CHECK (
  engagement_version.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement_version.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
  AND created_by = NULLIF(current_setting('app.user_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.engagement e
    WHERE e.organization_id = engagement_version.organization_id
      AND e.id = engagement_version.engagement_id
      AND e.revoked_at IS NULL
  )
);
--> statement-breakpoint
CREATE POLICY engagement_approval_create ON public.engagement_approval
FOR INSERT TO bump_runtime WITH CHECK (
  engagement_approval.organization_id = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = engagement_approval.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner')
  )
  AND approver_user_id = NULLIF(current_setting('app.user_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.engagement e
    WHERE e.organization_id = engagement_approval.organization_id
      AND e.id = engagement_approval.engagement_id
      AND e.current_revision = engagement_approval.revision
      AND e.revoked_at IS NULL
  )
);
