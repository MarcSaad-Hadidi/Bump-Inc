CREATE TABLE "audit_import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"engagement_id" uuid NOT NULL,
	"expected_revision" integer NOT NULL,
	"target" jsonb NOT NULL,
	"format" text NOT NULL,
	"importer_version" text NOT NULL,
	"source_name" text NOT NULL,
	"source_sha256" text NOT NULL,
	"byte_count" integer NOT NULL,
	"storage_backend" text NOT NULL,
	"storage_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"request_id" uuid NOT NULL,
	"status" text DEFAULT 'staging' NOT NULL,
	"execution_job_id" uuid,
	"observation_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "audit_import_execution_job_id_unique" UNIQUE("execution_job_id"),
	CONSTRAINT "audit_import_org_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "audit_import_fingerprint_unique" UNIQUE("organization_id","fingerprint"),
	CONSTRAINT "audit_import_source_check" CHECK ("audit_import"."byte_count" BETWEEN 1 AND 524288 AND length("audit_import"."source_name") BETWEEN 1 AND 255 AND "audit_import"."source_sha256" ~ '^[a-f0-9]{64}$' AND "audit_import"."fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "audit_import_format_check" CHECK ("audit_import"."format" IN ('bump-json-v1','sarif-2.1.0','cyclonedx-1.6-json') AND "audit_import"."importer_version" = 'bump-ingestion-v1'),
	CONSTRAINT "audit_import_storage_check" CHECK ("audit_import"."storage_backend" IN ('local','s3') AND "audit_import"."storage_key" = "audit_import"."organization_id" || '/' || "audit_import"."id"::text || '.json'),
	CONSTRAINT "audit_import_state_check" CHECK (("audit_import"."status" = 'staging' AND "audit_import"."execution_job_id" IS NULL AND "audit_import"."ready_at" IS NULL AND "audit_import"."observation_count" IS NULL AND "audit_import"."completed_at" IS NULL) OR ("audit_import"."status" = 'ready' AND "audit_import"."execution_job_id" IS NOT NULL AND "audit_import"."ready_at" IS NOT NULL AND (("audit_import"."observation_count" IS NULL AND "audit_import"."completed_at" IS NULL) OR ("audit_import"."observation_count" IS NOT NULL AND "audit_import"."observation_count" BETWEEN 0 AND 1000 AND "audit_import"."completed_at" IS NOT NULL))))
);
--> statement-breakpoint
CREATE TABLE "audit_import_request" (
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"import_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_import_request_organization_id_actor_user_id_idempotency_key_pk" PRIMARY KEY("organization_id","actor_user_id","idempotency_key"),
	CONSTRAINT "audit_import_request_identity_check" CHECK ("audit_import_request"."request_hash" ~ '^[a-f0-9]{64}$' AND "audit_import_request"."idempotency_key" ~ '^[a-zA-Z0-9_-]{1,128}$')
);
--> statement-breakpoint
CREATE TABLE "audit_observation" (
	"organization_id" text NOT NULL,
	"import_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"observation" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_observation_organization_id_import_id_ordinal_pk" PRIMARY KEY("organization_id","import_id","ordinal"),
	CONSTRAINT "audit_observation_ordinal_check" CHECK ("audit_observation"."ordinal" BETWEEN 0 AND 999),
	CONSTRAINT "audit_observation_shape_check" CHECK (jsonb_typeof("audit_observation"."observation") = 'object' AND "audit_observation"."observation" ?& ARRAY['kind','title','reportedSeverity','sourcePointer'] AND jsonb_typeof("audit_observation"."observation"->'kind') = 'string' AND "audit_observation"."observation"->>'kind' IN ('issue','component') AND jsonb_typeof("audit_observation"."observation"->'reportedSeverity') = 'string' AND "audit_observation"."observation"->>'reportedSeverity' IN ('unknown','info','low','medium','high','critical') AND jsonb_typeof("audit_observation"."observation"->'title') = 'string' AND length("audit_observation"."observation"->>'title') BETWEEN 1 AND 512 AND jsonb_typeof("audit_observation"."observation"->'sourcePointer') = 'string' AND length("audit_observation"."observation"->>'sourcePointer') BETWEEN 1 AND 512)
);
--> statement-breakpoint
ALTER TABLE "execution_job" DROP CONSTRAINT "execution_job_identity_check";--> statement-breakpoint
ALTER TABLE "audit_import" ADD CONSTRAINT "audit_import_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_import" ADD CONSTRAINT "audit_import_same_organization_version_fk" FOREIGN KEY ("organization_id","engagement_id","expected_revision") REFERENCES "public"."engagement_version"("organization_id","engagement_id","revision") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_import" ADD CONSTRAINT "audit_import_same_organization_job_fk" FOREIGN KEY ("organization_id","execution_job_id") REFERENCES "public"."execution_job"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_import_request" ADD CONSTRAINT "audit_import_request_same_organization_fk" FOREIGN KEY ("organization_id","import_id") REFERENCES "public"."audit_import"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_observation" ADD CONSTRAINT "audit_observation_same_organization_fk" FOREIGN KEY ("organization_id","import_id") REFERENCES "public"."audit_import"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_job" ADD CONSTRAINT "execution_job_identity_check" CHECK ("execution_job"."request_hash" ~ '^[a-f0-9]{64}$' AND length("execution_job"."idempotency_key") BETWEEN 1 AND 128 AND "execution_job"."kind" IN ('synthetic','audit.import'));
--> statement-breakpoint
GRANT SELECT, INSERT ON public.audit_import, public.audit_import_request, public.audit_observation TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (status, execution_job_id, ready_at, observation_count, completed_at) ON public.audit_import TO bump_runtime;
--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON public.audit_import, public.audit_import_request, public.audit_observation FROM bump_runtime;
--> statement-breakpoint
REVOKE UPDATE ON public.audit_import_request, public.audit_observation FROM bump_runtime;
--> statement-breakpoint
DO $policies$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['audit_import','audit_import_request','audit_observation'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO bump_runtime USING (
      organization_id = NULLIF(current_setting(''app.tenant_id'',true), '''') AND EXISTS (
        SELECT 1 FROM public.member m WHERE m.organization_id = %I.organization_id
          AND m.user_id = NULLIF(current_setting(''app.user_id'',true), '''')
          AND m.role IN (''owner'',''admin'',''member'')))', table_name || '_read', table_name, table_name);
  END LOOP;
END
$policies$;
--> statement-breakpoint
CREATE POLICY audit_import_create ON public.audit_import FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND actor_user_id = NULLIF(current_setting('app.user_id',true),'')
  AND status = 'staging' AND execution_job_id IS NULL AND ready_at IS NULL
  AND observation_count IS NULL AND completed_at IS NULL
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = audit_import.organization_id
    AND m.user_id = actor_user_id AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
CREATE POLICY audit_import_change ON public.audit_import FOR UPDATE TO bump_runtime USING (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND actor_user_id = NULLIF(current_setting('app.user_id',true),'') AND completed_at IS NULL
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = audit_import.organization_id
    AND m.user_id = actor_user_id AND m.role IN ('owner','admin','member'))
) WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND actor_user_id = NULLIF(current_setting('app.user_id',true),'') AND status = 'ready'
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = audit_import.organization_id
    AND m.user_id = actor_user_id AND m.role IN ('owner','admin','member'))
  AND EXISTS(SELECT 1 FROM public.execution_job j WHERE j.organization_id = audit_import.organization_id
    AND j.id = execution_job_id AND j.actor_user_id = audit_import.actor_user_id
    AND j.engagement_id = audit_import.engagement_id AND j.expected_revision = audit_import.expected_revision
    AND j.target = audit_import.target AND j.action = 'audit.import' AND j.kind = 'audit.import'
    AND j.payload = jsonb_build_object('importId',audit_import.id::text)
    AND (audit_import.completed_at IS NULL OR j.status = 'running'))
  AND (completed_at IS NULL OR observation_count = (
    SELECT count(*) FROM public.audit_observation o
    WHERE o.organization_id = audit_import.organization_id AND o.import_id = audit_import.id))
);
--> statement-breakpoint
CREATE POLICY audit_import_request_create ON public.audit_import_request FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND actor_user_id = NULLIF(current_setting('app.user_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = audit_import_request.organization_id
    AND m.user_id = actor_user_id AND m.role IN ('owner','admin','member'))
  AND EXISTS(SELECT 1 FROM public.audit_import i WHERE i.organization_id = audit_import_request.organization_id
    AND i.id = import_id)
);
--> statement-breakpoint
CREATE POLICY audit_observation_create ON public.audit_observation FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.audit_import i
    JOIN public.execution_job j ON j.organization_id = i.organization_id AND j.id = i.execution_job_id
    WHERE i.organization_id = audit_observation.organization_id AND i.id = import_id
      AND i.actor_user_id = NULLIF(current_setting('app.user_id',true),'')
      AND i.status = 'ready' AND i.completed_at IS NULL
      AND j.actor_user_id = i.actor_user_id AND j.kind = 'audit.import' AND j.action = 'audit.import'
      AND j.payload = jsonb_build_object('importId',i.id::text) AND j.status = 'running')
);
