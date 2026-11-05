-- Preserve the existing loopback-only Loi25 prototype with the non-owner runtime.
-- These tables must never be used for Cyber or real multi-client data.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits, public.audit_findings TO bump_runtime;
