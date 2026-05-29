import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { planNameToSlug, redirectToMercadoPagoCheckout } from '@/lib/mercadoPago';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  features: string[];
  is_popular: boolean;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [plansRes, settingsRes] = await Promise.all([
        supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('site_settings').select('key, value').eq('key', 'demo_mode'),
      ]);

      if (plansRes.data) {
        setPlans(plansRes.data.map(p => ({ ...p, features: (p.features as string[]) || [] })));
      }

      if (settingsRes.data?.[0]) {
        const v = settingsRes.data[0].value;
        setDemoMode(v === true || v === 'true');
      }

      setLoadingPlans(false);
    };
    fetchData();
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setLoadingPlanId(plan.id);

    if (demoMode) {
      try {
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const payload = {
          status: 'active',
          plan: plan.name,
          plan_id: plan.id,
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
        };

        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        const { error } = existing
          ? await supabase.from('subscriptions').update(payload).eq('id', existing.id)
          : await supabase.from('subscriptions').insert({ ...payload, user_id: user.id });
        if (error) throw error;
        toast.success('Assinatura ativada (modo demonstração)');
        navigate('/payment-success');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao ativar assinatura');
      } finally {
        setLoadingPlanId(null);
      }
      return;
    }

    try {
      await redirectToMercadoPagoCheckout({
        plan: planNameToSlug(plan.name),
        planId: plan.id,
        planName: plan.name,
        priceCents: plan.price_cents,
        userId: user.id,
        userEmail: user.email,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir checkout';
      toast.error(
        msg.includes('Failed to fetch') || msg.includes('NetworkError')
          ? 'Servidor de pagamento offline. Execute: npm run server'
          : msg,
        { duration: 8000 },
      );
      setLoadingPlanId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <Layout>
      <section className="py-12 sm:py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Investimento em você</span>
            </div>
            <h1 className="font-serif text-gradient-gold mb-4">Escolha seu Plano</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Invista em autoconhecimento e transforme sua imagem pessoal com nossa análise completa.
            </p>
          </div>

          {loadingPlans ? (
            <div className="text-center animate-pulse text-primary">Carregando planos...</div>
          ) : (
            <div
              className={`max-w-5xl mx-auto grid gap-6 sm:gap-8 ${
                plans.length === 1 ? 'max-w-lg' : plans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`glass-card rounded-3xl p-6 sm:p-8 md:p-10 relative overflow-hidden ${
                    plan.is_popular ? 'border-primary/30 glow-gold' : ''
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-sm font-medium">
                      Mais Popular
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-muted-foreground text-sm">{plan.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-5xl text-gradient-gold">
                        {formatPrice(plan.price_cents)}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.interval === 'monthly' ? 'mês' : 'ano'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Pagamento seguro via Mercado Pago Checkout Pro.
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="premium"
                    size="xl"
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlanId === plan.id}
                  >
                    {loadingPlanId === plan.id ? (
                      'Abrindo checkout...'
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Assinar Agora
                      </>
                    )}
                  </Button>

                  {demoMode && (
                    <p className="text-center text-xs text-muted-foreground mt-4">
                      Modo demonstração ativo no admin.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              Pagamento via Mercado Pago. Dúvidas?{' '}
              <a href="mailto:contato@estelite.com.br" className="text-primary hover:underline">
                contato@estelite.com.br
              </a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
