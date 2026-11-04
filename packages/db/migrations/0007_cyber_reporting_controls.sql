-- Reviewed report snapshots and provenance identities are immutable to the runtime role.
REVOKE UPDATE ON public.cyber_report FROM bump_runtime;
--> statement-breakpoint
GRANT UPDATE (approved_at, approved_by) ON public.cyber_report TO bump_runtime;
--> statement-breakpoint
REVOKE UPDATE ON public.cyber_source FROM bump_runtime;
--> statement-breakpoint
GRANT UPDATE (ciphertext, purged_at) ON public.cyber_source TO bump_runtime;
--> statement-breakpoint
REVOKE UPDATE ON public.cyber_evidence FROM bump_runtime;
--> statement-breakpoint
GRANT UPDATE (ciphertext, purged_at) ON public.cyber_evidence TO bump_runtime;
--> statement-breakpoint
REVOKE UPDATE ON public.cyber_scan FROM bump_runtime;
--> statement-breakpoint
GRANT UPDATE (stage, engine_version, observation_count, coverage_hash) ON public.cyber_scan TO bump_runtime;
