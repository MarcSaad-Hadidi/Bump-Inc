CREATE TABLE public.execution_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id text NOT NULL REFERENCES public.organization(id),
  actor_user_id text NOT NULL,
  engagement_id uuid NOT NULL,
  expected_revision integer NOT NULL,
  target jsonb NOT NULL,
  action text NOT NULL,
  kind text DEFAULT 'synthetic' NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  request_id uuid NOT NULL,
  status text DEFAULT 'queued' NOT NULL,
  attempt integer DEFAULT 0 NOT NULL,
  max_attempts integer NOT NULL,
  timeout_ms integer NOT NULL,
  backoff_ms integer NOT NULL,
  available_at timestamptz DEFAULT now() NOT NULL,
  lease_token uuid,
  deadline_at timestamptz,
  cancel_requested_at timestamptz,
  result jsonb,
  error_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz,
  CONSTRAINT execution_job_org_id_unique UNIQUE(organization_id,id),
  CONSTRAINT execution_job_idempotency_unique UNIQUE(organization_id,actor_user_id,idempotency_key),
  CONSTRAINT execution_job_same_organization_version_fk FOREIGN KEY(organization_id,engagement_id,expected_revision)
    REFERENCES public.engagement_version(organization_id,engagement_id,revision),
  CONSTRAINT execution_job_status_check CHECK(status IN ('queued','running','retry_wait','succeeded','cancelled','denied','dead_letter')),
  CONSTRAINT execution_job_bounds_check CHECK(attempt >= 0 AND max_attempts BETWEEN 1 AND 5 AND attempt <= max_attempts AND timeout_ms BETWEEN 100 AND 30000 AND backoff_ms BETWEEN 100 AND 60000),
  CONSTRAINT execution_job_identity_check CHECK(request_hash ~ '^[a-f0-9]{64}$' AND length(idempotency_key) BETWEEN 1 AND 128 AND kind = 'synthetic'),
  CONSTRAINT execution_job_lease_check CHECK((status = 'running' AND lease_token IS NOT NULL AND deadline_at IS NOT NULL) OR (status <> 'running' AND lease_token IS NULL AND deadline_at IS NULL))
);
--> statement-breakpoint
CREATE INDEX execution_job_org_status_idx ON public.execution_job(organization_id,status);
--> statement-breakpoint
CREATE INDEX execution_job_deadline_idx ON public.execution_job(status,deadline_at);
--> statement-breakpoint
CREATE TABLE public.execution_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id text NOT NULL,
  job_id uuid NOT NULL,
  attempt integer NOT NULL,
  status text NOT NULL,
  code text,
  request_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT execution_event_same_organization_fk FOREIGN KEY(organization_id,job_id) REFERENCES public.execution_job(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX execution_event_job_created_idx ON public.execution_event(organization_id,job_id,created_at);
--> statement-breakpoint
CREATE TABLE public.execution_attempt (
  organization_id text NOT NULL,
  job_id uuid NOT NULL,
  attempt integer NOT NULL,
  token uuid NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  deadline_at timestamptz NOT NULL,
  finished_at timestamptz,
  outcome text,
  code text,
  CONSTRAINT execution_attempt_organization_id_job_id_attempt_pk PRIMARY KEY(organization_id,job_id,attempt),
  CONSTRAINT execution_attempt_same_organization_fk FOREIGN KEY(organization_id,job_id) REFERENCES public.execution_job(organization_id,id),
  CONSTRAINT execution_attempt_positive CHECK(attempt > 0)
);
--> statement-breakpoint
CREATE INDEX execution_attempt_org_started_idx ON public.execution_attempt(organization_id,started_at);
--> statement-breakpoint
CREATE TABLE public.execution_control (
  organization_id text PRIMARY KEY NOT NULL REFERENCES public.organization(id),
  emergency_stop boolean DEFAULT false NOT NULL,
  concurrency_limit integer DEFAULT 2 NOT NULL,
  rate_limit integer DEFAULT 30 NOT NULL,
  CONSTRAINT execution_control_bounds CHECK(concurrency_limit BETWEEN 1 AND 32 AND rate_limit BETWEEN 1 AND 1000)
);
--> statement-breakpoint
CREATE TABLE public.execution_outbox (
  job_id uuid PRIMARY KEY NOT NULL,
  organization_id text NOT NULL,
  publish_after timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT execution_outbox_same_organization_fk FOREIGN KEY(organization_id,job_id) REFERENCES public.execution_job(organization_id,id)
);
--> statement-breakpoint
CREATE INDEX execution_outbox_publish_idx ON public.execution_outbox(publish_after);
--> statement-breakpoint
-- Runtime is a trusted process; RLS adds tenant isolation, not a second domain policy engine.
GRANT SELECT, INSERT ON public.execution_job, public.execution_event, public.execution_attempt,
  public.execution_control, public.execution_outbox TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (status, attempt, available_at, lease_token, deadline_at, cancel_requested_at,
  result, error_code, updated_at, finished_at) ON public.execution_job TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (finished_at, outcome, code) ON public.execution_attempt TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (emergency_stop, concurrency_limit, rate_limit) ON public.execution_control TO bump_runtime;
--> statement-breakpoint
GRANT UPDATE (publish_after), DELETE ON public.execution_outbox TO bump_runtime;
--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON public.execution_job, public.execution_event, public.execution_attempt, public.execution_control FROM bump_runtime;
--> statement-breakpoint
REVOKE UPDATE ON public.execution_event FROM bump_runtime;
--> statement-breakpoint
DO $policies$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['execution_job','execution_event','execution_attempt','execution_control','execution_outbox'] LOOP
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
CREATE POLICY execution_job_create ON public.execution_job FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND actor_user_id = NULLIF(current_setting('app.user_id',true),'')
  AND status = 'queued' AND attempt = 0 AND cancel_requested_at IS NULL AND finished_at IS NULL AND result IS NULL AND error_code IS NULL
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_job.organization_id
    AND m.user_id = actor_user_id AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
CREATE POLICY execution_job_change ON public.execution_job FOR UPDATE TO bump_runtime USING (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_job.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND (m.user_id = actor_user_id OR m.role IN ('owner','admin')))
) WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_job.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND (m.user_id = actor_user_id OR m.role IN ('owner','admin')))
);
--> statement-breakpoint
CREATE POLICY execution_event_create ON public.execution_event FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_event.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
CREATE POLICY execution_attempt_create ON public.execution_attempt FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.execution_job j WHERE j.organization_id = execution_attempt.organization_id
    AND j.id = job_id AND j.actor_user_id = NULLIF(current_setting('app.user_id',true),''))
  AND finished_at IS NULL AND outcome IS NULL AND code IS NULL
);
--> statement-breakpoint
CREATE POLICY execution_attempt_finish ON public.execution_attempt FOR UPDATE TO bump_runtime USING (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND finished_at IS NULL
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_attempt.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
) WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'') AND finished_at IS NOT NULL AND outcome IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_attempt.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
CREATE POLICY execution_control_create ON public.execution_control FOR INSERT TO bump_runtime WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND emergency_stop = false AND concurrency_limit = 2 AND rate_limit = 30
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_control.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
CREATE POLICY execution_control_change ON public.execution_control FOR UPDATE TO bump_runtime USING (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_control.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin'))
) WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_control.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin'))
);
--> statement-breakpoint
CREATE POLICY execution_outbox_write ON public.execution_outbox FOR ALL TO bump_runtime USING (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_outbox.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
) WITH CHECK (
  organization_id = NULLIF(current_setting('app.tenant_id',true),'')
  AND EXISTS(SELECT 1 FROM public.member m WHERE m.organization_id = execution_outbox.organization_id
    AND m.user_id = NULLIF(current_setting('app.user_id',true),'') AND m.role IN ('owner','admin','member'))
);
--> statement-breakpoint
-- These bounded worker functions expose routing only. The migration operator must bypass
-- FORCE RLS; no such capability or reusable authorization permit is granted to runtime.
DO $operator$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Execution maintenance requires a migration operator with BYPASSRLS';
  END IF;
END
$operator$;
--> statement-breakpoint
CREATE FUNCTION public.execution_route(job uuid)
RETURNS TABLE(job_id uuid,organization_id text,actor_user_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog,public AS $fn$
  SELECT j.id,j.organization_id,j.actor_user_id FROM public.execution_job j
  WHERE j.id = job AND j.status IN ('queued','retry_wait','running') LIMIT 1
$fn$;
--> statement-breakpoint
CREATE FUNCTION public.execution_routes(batch_size integer DEFAULT 100)
RETURNS TABLE(job_id uuid,organization_id text,actor_user_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog,public AS $fn$
  SELECT j.id,j.organization_id,j.actor_user_id FROM public.execution_outbox o
  JOIN public.execution_job j ON j.id = o.job_id AND j.organization_id = o.organization_id
  WHERE o.publish_after <= now() AND j.available_at <= now() AND j.status IN ('queued','retry_wait')
  ORDER BY o.publish_after,o.job_id LIMIT LEAST(100,GREATEST(1,COALESCE(batch_size,100)))
$fn$;
--> statement-breakpoint
CREATE FUNCTION public.execution_dispatched(job uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog,public AS $fn$
  UPDATE public.execution_outbox o SET publish_after = now() + interval '5 seconds'
  WHERE o.job_id = job AND o.publish_after <= now()
    AND EXISTS(SELECT 1 FROM public.execution_job j WHERE j.id = o.job_id AND j.status IN ('queued','retry_wait'))
$fn$;
--> statement-breakpoint
CREATE FUNCTION public.execution_reject_removed_member(job uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $fn$
DECLARE j public.execution_job%ROWTYPE; transition_at timestamptz;
BEGIN
  SELECT * INTO j FROM public.execution_job WHERE id = job;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(j.organization_id),3));
  SELECT * INTO j FROM public.execution_job WHERE id = job FOR UPDATE;
  IF j.status NOT IN ('queued','retry_wait','running') OR EXISTS(
    SELECT 1 FROM public.member m WHERE m.organization_id = j.organization_id
      AND m.user_id = j.actor_user_id AND m.role IN ('owner','admin','member')
  ) THEN RETURN false; END IF;
  transition_at := clock_timestamp();
  UPDATE public.execution_attempt SET finished_at = transition_at,outcome = 'denied',code = 'membership_removed'
    WHERE organization_id = j.organization_id AND job_id = j.id AND attempt = j.attempt AND finished_at IS NULL;
  UPDATE public.execution_job SET status = 'denied',lease_token = NULL,deadline_at = NULL,
    result = NULL,error_code = 'membership_removed',updated_at = transition_at,finished_at = transition_at WHERE id = j.id;
  INSERT INTO public.execution_event(organization_id,job_id,attempt,status,code,request_id,created_at)
    VALUES(j.organization_id,j.id,j.attempt,'denied','membership_removed',j.request_id,transition_at);
  DELETE FROM public.execution_outbox WHERE job_id = j.id;
  RETURN true;
END
$fn$;
--> statement-breakpoint
CREATE FUNCTION public.execution_recover(batch_size integer DEFAULT 100) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $fn$
DECLARE candidate record; j public.execution_job%ROWTYPE; recovered integer := 0;
  next_status text; failure_code text; retry_at timestamptz; transition_at timestamptz;
BEGIN
  FOR candidate IN
    SELECT e.id,e.organization_id FROM public.execution_job e
    WHERE e.status IN ('queued','retry_wait','running') AND (
      (e.status = 'running' AND e.deadline_at <= now()) OR NOT EXISTS(
        SELECT 1 FROM public.member m WHERE m.organization_id = e.organization_id
          AND m.user_id = e.actor_user_id AND m.role IN ('owner','admin','member')))
    ORDER BY e.organization_id,e.created_at,e.id LIMIT LEAST(100,GREATEST(1,COALESCE(batch_size,100)))
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(lower(candidate.organization_id),3));
    IF public.execution_reject_removed_member(candidate.id) THEN
      recovered := recovered + 1;
      CONTINUE;
    END IF;
    SELECT * INTO j FROM public.execution_job WHERE id = candidate.id FOR UPDATE;
    transition_at := clock_timestamp();
    IF j.status <> 'running' OR j.deadline_at > transition_at THEN CONTINUE; END IF;
    next_status := CASE WHEN j.cancel_requested_at IS NOT NULL THEN 'cancelled'
      WHEN j.attempt >= j.max_attempts THEN 'dead_letter' ELSE 'retry_wait' END;
    failure_code := CASE WHEN next_status = 'cancelled' THEN 'cancelled' ELSE 'timed_out' END;
    retry_at := transition_at + make_interval(secs => LEAST(60000,j.backoff_ms * power(2,GREATEST(0,j.attempt - 1))) / 1000.0);
    UPDATE public.execution_attempt SET finished_at = transition_at,outcome = failure_code,code = failure_code
      WHERE organization_id = j.organization_id AND job_id = j.id AND attempt = j.attempt
        AND token = j.lease_token AND finished_at IS NULL;
    UPDATE public.execution_job SET status = next_status,lease_token = NULL,deadline_at = NULL,
      available_at = CASE WHEN next_status = 'retry_wait' THEN retry_at ELSE available_at END,
      result = NULL,error_code = failure_code,updated_at = transition_at,
      finished_at = CASE WHEN next_status = 'retry_wait' THEN NULL ELSE transition_at END WHERE id = j.id;
    INSERT INTO public.execution_event(organization_id,job_id,attempt,status,code,request_id,created_at)
      VALUES(j.organization_id,j.id,j.attempt,next_status,failure_code,j.request_id,transition_at);
    IF next_status = 'retry_wait' THEN
      INSERT INTO public.execution_outbox(organization_id,job_id,publish_after) VALUES(j.organization_id,j.id,retry_at)
        ON CONFLICT(job_id) DO UPDATE SET publish_after = EXCLUDED.publish_after;
    ELSE
      DELETE FROM public.execution_outbox WHERE job_id = j.id;
    END IF;
    recovered := recovered + 1;
  END LOOP;
  RETURN recovered;
END
$fn$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.execution_route(uuid),public.execution_routes(integer),
  public.execution_dispatched(uuid),public.execution_reject_removed_member(uuid),public.execution_recover(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.execution_route(uuid),public.execution_routes(integer),
  public.execution_dispatched(uuid),public.execution_reject_removed_member(uuid),public.execution_recover(integer) TO bump_runtime;
