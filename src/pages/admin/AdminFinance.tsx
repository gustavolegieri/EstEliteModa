import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, CreditCard, XCircle, CheckCircle2, Wallet } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const BRL = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

interface Payment {
  id: string;
  user_id: string;
  status: string;
  amount_cents: number;
  payment_method: string | null;
  provider_payment_id: string | null;
  created_at: string;
}

export default function AdminFinance() {
  const [fin, setFin] = useState<{
    mrr_cents: number; arr_cents: number; total_revenue_cents: number; monthly_revenue_cents: number;
    approved_payments: number; failed_payments: number; pending_payments?: number; chargebacks?: number;
    churn_rate?: number; avg_ticket_cents: number; active_subscriptions: number;
  } | null>(null);
  const [series, setSeries] = useState<{ date: string; revenue: number }[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    (async () => {
      const [f, g, p] = await Promise.all([
        supabase.rpc('admin_financial_stats'),
        supabase.rpc('admin_growth_series'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (f.data) setFin(f.data as never);
      if (g.data) setSeries(g.data as unknown as { date: string; revenue: number }[]);
      if (p.data) setPayments(p.data as Payment[]);
    })();
  }, []);

  const cards = [
    { label: 'Receita Total', value: BRL(fin?.total_revenue_cents || 0), icon: DollarSign },
    { label: 'Receita do Mês', value: BRL(fin?.monthly_revenue_cents || 0), icon: TrendingUp },
    { label: 'MRR', value: BRL(fin?.mrr_cents || 0), icon: Wallet },
    { label: 'ARR', value: BRL(fin?.arr_cents || 0), icon: TrendingUp },
    { label: 'Ticket Médio', value: BRL(fin?.avg_ticket_cents || 0), icon: CreditCard },
    { label: 'Assinaturas Ativas', value: fin?.active_subscriptions ?? 0, icon: CheckCircle2 },
    { label: 'Pagamentos Aprovados', value: fin?.approved_payments ?? 0, icon: CheckCircle2 },
    { label: 'Pagamentos Recusados', value: fin?.failed_payments ?? 0, icon: XCircle },
    { label: 'Pagamentos Pendentes', value: fin?.pending_payments ?? 0, icon: CreditCard },
    { label: 'Chargebacks', value: fin?.chargebacks ?? 0, icon: XCircle },
    { label: 'Churn', value: `${fin?.churn_rate ?? 0}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Financeiro</h2>
        <p className="text-sm text-muted-foreground mt-1">Receita, assinaturas e pagamentos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="font-serif text-2xl md:text-3xl truncate">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Receita diária (R$)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Receita acumulada</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Bar dataKey="revenue" fill="#C6A74E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h3 className="font-serif text-lg">Últimos pagamentos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">Data</th>
                <th className="p-4 font-medium text-muted-foreground">ID Mercado Pago</th>
                <th className="p-4 font-medium text-muted-foreground">Método</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4 text-muted-foreground">{new Date(p.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-4 font-mono text-xs">{p.provider_payment_id || '—'}</td>
                  <td className="p-4">{p.payment_method || '—'}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.status === 'approved' || p.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400'
                      : p.status === 'rejected' || p.status === 'failed' ? 'bg-destructive/20 text-destructive'
                      : 'bg-muted text-muted-foreground'
                    }`}>{p.status}</span>
                  </td>
                  <td className="p-4 text-right font-medium">{BRL(p.amount_cents)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum pagamento registrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
