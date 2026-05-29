export type PlanSlug = 'essencial' | 'premium' | 'elite';

export interface CreatePreferenceParams {
  plan: PlanSlug;
  planId?: string;
  planName?: string;
  priceCents?: number;
  userId: string;
  userEmail?: string;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

/** Produção: VITE_API_URL=https://sua-api.railway.app | Local: http://localhost:3001 */
export const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function createCheckoutPreference(
  params: CreatePreferenceParams,
): Promise<PreferenceResponse> {
  const res = await fetch(apiUrl('/create-preference'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      returnBaseUrl: window.location.origin,
    }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* resposta não-JSON */
  }

  if (!res.ok) {
    throw new Error(String(data?.error || 'Não foi possível iniciar o checkout'));
  }

  return data as PreferenceResponse;
}

export function planNameToSlug(name: string): PlanSlug {
  const n = name.toLowerCase();
  if (n.includes('essencial')) return 'essencial';
  if (n.includes('elite')) return 'elite';
  return 'premium';
}

export async function redirectToMercadoPagoCheckout(
  params: CreatePreferenceParams,
): Promise<void> {
  const preference = await createCheckoutPreference(params);
  const url = preference.init_point || preference.sandbox_init_point;
  if (!url) throw new Error('URL de checkout não retornada pelo Mercado Pago');
  window.location.href = url;
}
