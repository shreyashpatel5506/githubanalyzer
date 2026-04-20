-- Optional payment audit tables for Razorpay flow
-- Safe to run multiple times

BEGIN;

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS public.plan_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_plan_key text,
  new_plan_key text NOT NULL,
  changed_by text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_service_all ON public.webhook_events;
CREATE POLICY webhook_events_service_all
ON public.webhook_events FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS plan_change_history_select_own ON public.plan_change_history;
CREATE POLICY plan_change_history_select_own
ON public.plan_change_history FOR SELECT
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS plan_change_history_service_all ON public.plan_change_history;
CREATE POLICY plan_change_history_service_all
ON public.plan_change_history FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

COMMIT;
