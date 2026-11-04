CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_locale_check" CHECK ("organization_settings"."locale" IN ('en', 'fr'))
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_audit" ADD CONSTRAINT "organization_audit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_audit_organization_created_idx" ON "organization_audit" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");

--> statement-breakpoint
-- Role provisioning is an operator/bootstrap responsibility; application roles never own tables.
GRANT USAGE ON SCHEMA public TO bump_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."user", public.session, public.account,
  public.verification, public.organization, public.member, public.invitation TO bump_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.system_probes TO bump_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.organization_settings TO bump_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.organization_audit TO bump_runtime;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.organization_audit FROM bump_runtime;
--> statement-breakpoint
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.organization_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.organization_audit FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY organization_settings_read ON public.organization_settings
FOR SELECT TO bump_runtime USING (
  "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_settings.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
  )
);
--> statement-breakpoint
CREATE POLICY organization_settings_insert ON public.organization_settings
FOR INSERT TO bump_runtime WITH CHECK (
  "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_settings.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
);
--> statement-breakpoint
CREATE POLICY organization_settings_update ON public.organization_settings
FOR UPDATE TO bump_runtime USING (
  "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_settings.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
) WITH CHECK (
  "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_settings.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
);
--> statement-breakpoint
CREATE POLICY organization_audit_read ON public.organization_audit
FOR SELECT TO bump_runtime USING (
  "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_audit.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
      AND m.role IN ('owner', 'admin')
  )
);
--> statement-breakpoint
CREATE POLICY organization_audit_insert ON public.organization_audit
FOR INSERT TO bump_runtime WITH CHECK (
  actor_user_id = NULLIF(current_setting('app.user_id', true), '')
  AND "organization_id" = NULLIF(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM public.member m
    WHERE m.organization_id = organization_audit.organization_id
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
  )
);
