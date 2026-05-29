import { supabase } from '@/integrations/supabase/client';

/** Ativa assinatura no Supabase após retorno aprovado do Checkout Pro */
export async function activateSubscriptionFromPayment(
  externalReference: string,
  planName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const [userId, planId] = externalReference.split(':');
  if (!userId || !planId) {
    return { ok: false, error: 'Referência de pagamento inválida' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { ok: false, error: 'Usuário não autenticado' };
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId,
      plan: planName || 'monthly',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
