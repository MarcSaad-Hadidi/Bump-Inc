CREATE TABLE public.cyber_role (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
user_id text not null,
role text not null,
CONSTRAINT cyber_role_org_id_unique UNIQUE(organization_id,id),
UNIQUE(organization_id,user_id),
CHECK(role IN ('consultant','analyst','reviewer'))
);
--> statement-breakpoint
CREATE INDEX cyber_role_tenant_created_idx ON public.cyber_role(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_client (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
name text not null,
contact text not null,
criticality integer not null default 3,
retention_days integer not null default 90,
archived_at timestamptz ,
CONSTRAINT cyber_client_org_id_unique UNIQUE(organization_id,id),
CHECK(criticality BETWEEN 1 AND 5 AND retention_days BETWEEN 1 AND 365)
);
--> statement-breakpoint
CREATE INDEX cyber_client_tenant_created_idx ON public.cyber_client(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_asset (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
label text not null,
target jsonb not null,
exposure text not null default 'internal',
archived_at timestamptz ,
CONSTRAINT cyber_asset_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_asset_tenant_created_idx ON public.cyber_asset(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_mandate (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
engagement_id uuid not null,
reference text not null,
signed_by text not null,
authorized_at timestamptz not null,
emergency_contact text not null,
engines jsonb not null,
asset_ids jsonb not null,
excluded_asset_ids jsonb not null,
limitations text not null,
CONSTRAINT cyber_mandate_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,engagement_id) REFERENCES public.engagement(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_mandate_tenant_created_idx ON public.cyber_mandate(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_source (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
asset_id uuid not null,
name text not null,
kind text not null,
ciphertext text not null,
sha256 text not null,
created_by text not null,
expires_at timestamptz not null,
purged_at timestamptz ,
CONSTRAINT cyber_source_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,asset_id) REFERENCES public.cyber_asset(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_source_tenant_created_idx ON public.cyber_source(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_audit (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
mandate_id uuid not null,
requested_by text not null,
title text not null,
idempotency_key uuid not null,
request_hash text not null,
CONSTRAINT cyber_audit_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,mandate_id) REFERENCES public.cyber_mandate(organization_id,id),
UNIQUE(organization_id,idempotency_key)
);
--> statement-breakpoint
CREATE INDEX cyber_audit_tenant_created_idx ON public.cyber_audit(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_scan (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
audit_id uuid not null,
asset_id uuid not null,
source_id uuid ,
execution_job_id uuid not null,
engine text not null,
engine_version text not null default 'pending',
stage text not null default 'queued',
observation_count integer ,
coverage_hash text ,
CONSTRAINT cyber_scan_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,audit_id) REFERENCES public.cyber_audit(organization_id,id),
FOREIGN KEY(organization_id,asset_id) REFERENCES public.cyber_asset(organization_id,id),
FOREIGN KEY(organization_id,source_id) REFERENCES public.cyber_source(organization_id,id),
FOREIGN KEY(organization_id,execution_job_id) REFERENCES public.execution_job(organization_id,id),
UNIQUE(organization_id,execution_job_id),
UNIQUE(organization_id,audit_id,asset_id,engine),
CHECK(stage IN ('queued','preparing','running','parsing','completed'))
);
--> statement-breakpoint
CREATE INDEX cyber_scan_tenant_created_idx ON public.cyber_scan(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_finding (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
asset_id uuid not null,
first_audit_id uuid not null,
last_audit_id uuid not null,
fingerprint text not null,
observation jsonb not null,
status text not null default 'to_review',
business_impact text not null default '',
recommendation text not null default '',
human_adjustment integer not null default 0,
compensating_controls boolean not null default false,
reviewed_by text ,
reviewed_at timestamptz ,
updated_at timestamptz not null default now(),
CONSTRAINT cyber_finding_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,asset_id) REFERENCES public.cyber_asset(organization_id,id),
FOREIGN KEY(organization_id,first_audit_id) REFERENCES public.cyber_audit(organization_id,id),
FOREIGN KEY(organization_id,last_audit_id) REFERENCES public.cyber_audit(organization_id,id),
UNIQUE(organization_id,client_id,fingerprint),
CHECK(status IN ('to_review','confirmed','false_positive','planned','in_progress','to_retest','verified_fixed','accepted_risk','closed') AND human_adjustment BETWEEN -20 AND 20)
);
--> statement-breakpoint
CREATE INDEX cyber_finding_tenant_created_idx ON public.cyber_finding(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_observation (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
asset_id uuid not null,
audit_id uuid not null,
scan_id uuid not null,
finding_id uuid not null,
data jsonb not null,
fingerprint text not null,
CONSTRAINT cyber_observation_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,asset_id) REFERENCES public.cyber_asset(organization_id,id),
FOREIGN KEY(organization_id,audit_id) REFERENCES public.cyber_audit(organization_id,id),
FOREIGN KEY(organization_id,scan_id) REFERENCES public.cyber_scan(organization_id,id),
FOREIGN KEY(organization_id,finding_id) REFERENCES public.cyber_finding(organization_id,id),
UNIQUE(organization_id,scan_id,fingerprint)
);
--> statement-breakpoint
CREATE INDEX cyber_observation_tenant_created_idx ON public.cyber_observation(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_evidence (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
scan_id uuid not null,
ciphertext text not null,
sha256 text not null,
expires_at timestamptz not null,
purged_at timestamptz ,
CONSTRAINT cyber_evidence_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,scan_id) REFERENCES public.cyber_scan(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_evidence_tenant_created_idx ON public.cyber_evidence(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_task (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
finding_id uuid not null,
assignee text not null,
due_at timestamptz not null,
description text not null,
status text not null default 'planned',
CONSTRAINT cyber_task_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,finding_id) REFERENCES public.cyber_finding(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_task_tenant_created_idx ON public.cyber_task(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_retest (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
finding_id uuid not null,
audit_id uuid not null,
conclusion text not null,
note text not null,
reviewer_id text not null,
CONSTRAINT cyber_retest_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,finding_id) REFERENCES public.cyber_finding(organization_id,id),
FOREIGN KEY(organization_id,audit_id) REFERENCES public.cyber_audit(organization_id,id),
CHECK(conclusion IN ('present','absent','inconclusive'))
);
--> statement-breakpoint
CREATE INDEX cyber_retest_tenant_created_idx ON public.cyber_retest(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_report (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid not null,
audit_id uuid not null,
snapshot jsonb not null,
sha256 text not null,
locale text not null,
approved_by text ,
approved_at timestamptz ,
CONSTRAINT cyber_report_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id),
FOREIGN KEY(organization_id,audit_id) REFERENCES public.cyber_audit(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_report_tenant_created_idx ON public.cyber_report(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE public.cyber_event (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id text NOT NULL REFERENCES public.organization(id),
created_at timestamptz NOT NULL DEFAULT now(),
client_id uuid ,
actor_id text not null,
action text not null,
target_id uuid not null,
detail text not null,
CONSTRAINT cyber_event_org_id_unique UNIQUE(organization_id,id),
FOREIGN KEY(organization_id,client_id) REFERENCES public.cyber_client(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX cyber_event_tenant_created_idx ON public.cyber_event(organization_id,created_at);
--> statement-breakpoint
ALTER TABLE public.cyber_role ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_role FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_role TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_role_read ON public.cyber_role FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_role_insert ON public.cyber_role FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')) AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_role TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_role_update ON public.cyber_role FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')) AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin'))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_role.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_client ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_client FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_client TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_client_read ON public.cyber_client FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_client.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_client_insert ON public.cyber_client FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_client.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_client TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_client_update ON public.cyber_client FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_client.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_client.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_asset ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_asset FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_asset TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_asset_read ON public.cyber_asset FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_asset.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_asset_insert ON public.cyber_asset FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_asset.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_asset TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_asset_update ON public.cyber_asset FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_asset.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_asset.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_mandate ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_mandate FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_mandate TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_mandate_read ON public.cyber_mandate FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_mandate.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_mandate_insert ON public.cyber_mandate FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_mandate.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_source ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_source FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_source TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_source_read ON public.cyber_source FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_source.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_source_insert ON public.cyber_source FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_source.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_source TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_source_update ON public.cyber_source FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_source.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_source.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_audit FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_audit TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_audit_read ON public.cyber_audit FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_audit.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_audit_insert ON public.cyber_audit FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_audit.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_scan ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_scan FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_scan TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_scan_read ON public.cyber_scan FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_scan.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_scan_insert ON public.cyber_scan FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_scan.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_scan TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_scan_update ON public.cyber_scan FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_scan.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_scan.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_finding ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_finding FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_finding TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_finding_read ON public.cyber_finding FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_finding.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_finding_insert ON public.cyber_finding FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_finding.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_finding TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_finding_update ON public.cyber_finding FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_finding.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_finding.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_observation ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_observation FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_observation TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_observation_read ON public.cyber_observation FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_observation.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_observation_insert ON public.cyber_observation FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_observation.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_evidence ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_evidence FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_evidence TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_evidence_read ON public.cyber_evidence FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_evidence.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_evidence_insert ON public.cyber_evidence FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_evidence.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_evidence TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_evidence_update ON public.cyber_evidence FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_evidence.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_evidence.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_task ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_task FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_task TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_task_read ON public.cyber_task FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_task.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_task_insert ON public.cyber_task FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_task.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_task TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_task_update ON public.cyber_task FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_task.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_task.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_retest ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_retest FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_retest TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_retest_read ON public.cyber_retest FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_retest.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_retest_insert ON public.cyber_retest FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_retest.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_report ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_report FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_report TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_report_read ON public.cyber_report FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_report.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_report_insert ON public.cyber_report FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_report.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
GRANT UPDATE ON public.cyber_report TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_report_update ON public.cyber_report FOR UPDATE TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_report.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),''))) WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_report.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
ALTER TABLE public.cyber_event ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.cyber_event FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cyber_event TO bump_runtime;
--> statement-breakpoint
CREATE POLICY cyber_event_read ON public.cyber_event FOR SELECT TO bump_runtime USING (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_event.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));
--> statement-breakpoint
CREATE POLICY cyber_event_insert ON public.cyber_event FOR INSERT TO bump_runtime WITH CHECK (organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND EXISTS (SELECT 1 FROM public.member m WHERE m.organization_id=cyber_event.organization_id AND m.user_id=NULLIF(current_setting('app.user_id',true),'')));

--> statement-breakpoint
ALTER TABLE public.cyber_asset ADD CONSTRAINT cyber_asset_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_mandate ADD CONSTRAINT cyber_mandate_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_source ADD CONSTRAINT cyber_source_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_audit ADD CONSTRAINT cyber_audit_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_scan ADD CONSTRAINT cyber_scan_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_finding ADD CONSTRAINT cyber_finding_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_observation ADD CONSTRAINT cyber_observation_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_evidence ADD CONSTRAINT cyber_evidence_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_task ADD CONSTRAINT cyber_task_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_retest ADD CONSTRAINT cyber_retest_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_report ADD CONSTRAINT cyber_report_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_event ADD CONSTRAINT cyber_event_client_identity UNIQUE(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_source ADD CONSTRAINT cyber_source_asset_id_client_fk FOREIGN KEY(organization_id,client_id,asset_id) REFERENCES public.cyber_asset(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_audit ADD CONSTRAINT cyber_audit_mandate_id_client_fk FOREIGN KEY(organization_id,client_id,mandate_id) REFERENCES public.cyber_mandate(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_scan ADD CONSTRAINT cyber_scan_audit_id_client_fk FOREIGN KEY(organization_id,client_id,audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_scan ADD CONSTRAINT cyber_scan_asset_id_client_fk FOREIGN KEY(organization_id,client_id,asset_id) REFERENCES public.cyber_asset(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_scan ADD CONSTRAINT cyber_scan_source_id_client_fk FOREIGN KEY(organization_id,client_id,source_id) REFERENCES public.cyber_source(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_finding ADD CONSTRAINT cyber_finding_asset_id_client_fk FOREIGN KEY(organization_id,client_id,asset_id) REFERENCES public.cyber_asset(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_finding ADD CONSTRAINT cyber_finding_first_audit_id_client_fk FOREIGN KEY(organization_id,client_id,first_audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_finding ADD CONSTRAINT cyber_finding_last_audit_id_client_fk FOREIGN KEY(organization_id,client_id,last_audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_observation ADD CONSTRAINT cyber_observation_asset_id_client_fk FOREIGN KEY(organization_id,client_id,asset_id) REFERENCES public.cyber_asset(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_observation ADD CONSTRAINT cyber_observation_audit_id_client_fk FOREIGN KEY(organization_id,client_id,audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_observation ADD CONSTRAINT cyber_observation_scan_id_client_fk FOREIGN KEY(organization_id,client_id,scan_id) REFERENCES public.cyber_scan(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_observation ADD CONSTRAINT cyber_observation_finding_id_client_fk FOREIGN KEY(organization_id,client_id,finding_id) REFERENCES public.cyber_finding(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_evidence ADD CONSTRAINT cyber_evidence_scan_id_client_fk FOREIGN KEY(organization_id,client_id,scan_id) REFERENCES public.cyber_scan(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_task ADD CONSTRAINT cyber_task_finding_id_client_fk FOREIGN KEY(organization_id,client_id,finding_id) REFERENCES public.cyber_finding(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_retest ADD CONSTRAINT cyber_retest_finding_id_client_fk FOREIGN KEY(organization_id,client_id,finding_id) REFERENCES public.cyber_finding(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_retest ADD CONSTRAINT cyber_retest_audit_id_client_fk FOREIGN KEY(organization_id,client_id,audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);
--> statement-breakpoint
ALTER TABLE public.cyber_report ADD CONSTRAINT cyber_report_audit_id_client_fk FOREIGN KEY(organization_id,client_id,audit_id) REFERENCES public.cyber_audit(organization_id,client_id,id);

--> statement-breakpoint
ALTER TABLE public.execution_job DROP CONSTRAINT execution_job_identity_check;
--> statement-breakpoint
ALTER TABLE public.execution_job ADD CONSTRAINT execution_job_identity_check CHECK(request_hash ~ '^[a-f0-9]{64}$' AND length(idempotency_key) BETWEEN 1 AND 128 AND kind IN ('synthetic','audit.import','cyber.scan'));
