-- Better Auth 1.7.12 two-factor identity records are global, like sessions/accounts.
-- The library authorizes the current user; tenant tables retain their existing RLS.
ALTER TABLE public."user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE public."two_factor" (
  "id" text PRIMARY KEY NOT NULL,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "user_id" text NOT NULL REFERENCES public."user"("id") ON DELETE cascade,
  "verified" boolean DEFAULT true NOT NULL,
  "failed_verification_count" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON public."two_factor" ("secret");
--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON public."two_factor" ("user_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."two_factor" TO bump_runtime;
