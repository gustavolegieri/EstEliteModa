
-- Mercado Pago SaaS production schema
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS mp_subscription_id text,
  ADD COLUMN IF NOT EXISTS mp_payer_id text,
  ADD COLUMN IF NOT EXISTS recurring_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_id ON public.subscriptions(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS headers jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed boolean NOT NULL DEFAULT false;

-- Backfill mp_subscription_id from legacy column
UPDATE public.subscriptions
SET mp_subscription_id = stripe_subscription_id
WHERE mp_subscription_id IS NULL AND stripe_subscription_id IS NOT NULL;

-- Plans: Essencial, Elite (Premium já existe)
INSERT INTO public.plans (name, description, price_cents, currency, interval, features, is_active, is_popular, sort_order, looks_per_month, can_download_pdf, can_share)
SELECT 'Plano Essencial', 'Ideal para começar sua jornada de estilo', 4900, 'BRL', 'monthly',
  '["3 looks mensais","Análise corporal completa","Coloração pessoal","Perfil de estilo","Suporte por email"]'::jsonb,
  true, false, 1, 3, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Essencial');

INSERT INTO public.plans (name, description, price_cents, currency, interval, features, is_active, is_popular, sort_order, looks_per_month, can_download_pdf, can_share)
SELECT 'Plano Elite', 'Experiência completa e exclusiva', 14700, 'BRL', 'monthly',
  '["7 looks mensais","Tudo do Premium","Download em PDF","Compartilhamento","Suporte prioritário","Atualizações exclusivas"]'::jsonb,
  true, false, 3, 7, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Elite');

UPDATE public.plans SET
  price_cents = 4900,
  looks_per_month = 3,
  sort_order = 1,
  is_active = true,
  description = 'Ideal para começar sua jornada de estilo',
  features = '["3 looks mensais","Análise corporal completa","Coloração pessoal","Perfil de estilo","Suporte por email"]'::jsonb
WHERE name = 'Plano Essencial';

UPDATE public.plans SET
  price_cents = 9700,
  looks_per_month = 5,
  sort_order = 2,
  is_popular = true,
  is_active = true,
  description = 'O mais escolhido pelas nossas clientes',
  features = '["5 looks mensais","Análise corporal completa","Coloração pessoal detalhada","Perfil de estilo personalizado","Guia de modelagens","Armário cápsula","Download em PDF"]'::jsonb
WHERE name = 'Plano Premium';

UPDATE public.plans SET
  price_cents = 14700,
  looks_per_month = 7,
  sort_order = 3,
  is_active = true,
  description = 'Experiência completa e exclusiva',
  features = '["7 looks mensais","Tudo do Premium","Compartilhamento","Suporte prioritário","Atualizações exclusivas"]'::jsonb
WHERE name = 'Plano Elite';

-- Production: disable demo mode
UPDATE public.site_settings SET value = 'false'::jsonb, updated_at = now() WHERE key = 'demo_mode';
INSERT INTO public.site_settings (key, value) VALUES ('payments_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now();

INSERT INTO public.site_settings (key, value) VALUES
  ('mp_access_token', to_jsonb('APP_USR-2307907731439262-020218-c0b5e7bd6f1ba43fdfd7fffaa5d3d2e4-1008081234'::text)),
  ('mp_public_key',   to_jsonb('APP_USR-33b5683d-480c-4a02-829f-1d7e4d5cf368'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Allow public to see payments are enabled (not secrets)
DROP POLICY IF EXISTS "Anyone can view non-sensitive settings" ON public.site_settings;
CREATE POLICY "Anyone can view non-sensitive settings" ON public.site_settings FOR SELECT USING (
  key <> ALL (ARRAY['stripe_secret_key','stripe_webhook_secret','mp_access_token','mp_webhook_secret'])
);

-- Enhanced financial stats
CREATE OR REPLACE FUNCTION public.admin_financial_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb;
DECLARE v_active int;
DECLARE v_canceled int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO v_active FROM public.subscriptions WHERE status = 'active';
  SELECT count(*) INTO v_canceled FROM public.subscriptions WHERE status IN ('canceled','cancelled');

  SELECT jsonb_build_object(
    'mrr_cents', COALESCE((SELECT sum(pl.price_cents) FROM public.subscriptions s JOIN public.plans pl ON pl.id = s.plan_id WHERE s.status = 'active' AND pl.interval = 'monthly'),0),
    'arr_cents', COALESCE((SELECT sum(pl.price_cents) FROM public.subscriptions s JOIN public.plans pl ON pl.id = s.plan_id WHERE s.status = 'active' AND pl.interval = 'monthly'),0) * 12,
    'total_revenue_cents', COALESCE((SELECT sum(amount_cents) FROM public.payments WHERE status IN ('approved','paid')),0),
    'monthly_revenue_cents', COALESCE((SELECT sum(amount_cents) FROM public.payments WHERE status IN ('approved','paid') AND created_at >= date_trunc('month', now())),0),
    'active_subscriptions', v_active,
    'canceled_subscriptions', v_canceled,
    'pending_subscriptions', (SELECT count(*) FROM public.subscriptions WHERE status = 'pending'),
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users_month', (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('month', now())),
    'approved_payments', (SELECT count(*) FROM public.payments WHERE status IN ('approved','paid')),
    'failed_payments', (SELECT count(*) FROM public.payments WHERE status IN ('rejected','failed','cancelled')),
    'pending_payments', (SELECT count(*) FROM public.payments WHERE status IN ('pending','in_process')),
    'chargebacks', (SELECT count(*) FROM public.payments WHERE status IN ('charged_back','refunded')),
    'avg_ticket_cents', COALESCE((SELECT avg(amount_cents)::int FROM public.payments WHERE status IN ('approved','paid')),0),
    'churn_rate', CASE WHEN (v_active + v_canceled) > 0 THEN round((v_canceled::numeric / (v_active + v_canceled)::numeric) * 100, 2) ELSE 0 END,
    'conversion_rate', CASE WHEN (SELECT count(*) FROM public.profiles) > 0 THEN
      round((v_active::numeric / (SELECT count(*) FROM public.profiles)::numeric) * 100, 2)
      ELSE 0 END,
    'subs_by_plan', COALESCE((SELECT jsonb_agg(jsonb_build_object('plan', pl.name, 'count', cnt))
      FROM (SELECT plan_id, count(*) cnt FROM public.subscriptions WHERE status='active' GROUP BY plan_id) x
      JOIN public.plans pl ON pl.id = x.plan_id),'[]'::jsonb)
  ) INTO r;
  RETURN r;
END;
$$;

-- Admin list subscriptions
CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  plan_name text,
  status text,
  mp_subscription_id text,
  recurring_amount numeric,
  next_billing_date timestamptz,
  last_payment_date timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    s.id, s.user_id, u.email::text, p.full_name, pl.name,
    s.status, s.mp_subscription_id, s.recurring_amount,
    s.next_billing_date, s.last_payment_date, s.created_at
  FROM public.subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  ORDER BY s.updated_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated;
