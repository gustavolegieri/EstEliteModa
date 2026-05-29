import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, FileText, TrendingUp, DollarSign, Activity, Percent, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface FinancialStats {
  mrr_cents: number;
  arr_cents: number;
  total_revenue_cents: number;
  monthly_revenue_cents: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  total_users: number;
  new_users_month: number;
  approved_payments: number;
  failed_payments: number;
  avg_ticket_cents: number;
  conversion_rate: number;
  churn_rate?: number;
  pending_payments?: number;
  chargebacks?: number;
  pending_subscriptions?: number;
  subs_by_plan: { plan: string; count: number }[];
}

interface SeriesPoint { date: string; users: number; revenue: number; }

const BRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

const COLORS = ['#C6A74E', '#8B6F2E', '#E8C97A', '#6B7280'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, diagnoses: 0, subscriptions: 0 });
  const [fin, setFin] = useState<FinancialStats | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, f, g] = await Promise.all([
      supabase.rpc('admin_get_stats'),
      supabase.rpc('admin_financial_stats'),
      supabase.rpc('admin_growth_series'),
    ]);
    if (s.data) {
      const d = s.data as { users: number; diagnoses: number; active_subscriptions: number };
      setStats({ users: d.users ?? 0, diagnoses: d.diagnoses ?? 0, subscriptions: d.active_subscriptions ?? 0 });
    }
    if (f.data) setFin(f.data as unknown as FinancialStats);
    if (g.data) setSeries(g.data as unknown as SeriesPoint[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const kpis = [
    { label: 'Receita Total', value: BRL(fin?.total_revenue_cents || 0), icon: DollarSign, accent: 'text-emerald-400' },
    { label: 'MRR', value: BRL(fin?.mrr_cents || 0), icon: TrendingUp, accent: 'text-primary' },
    { label: 'ARR', value: BRL(fin?.arr_cents || 0), icon: TrendingUp, accent: 'text-primary' },
    { label: 'Receita do Mês', value: BRL(fin?.monthly_revenue_cents || 0), icon: Activity, accent: 'text-emerald-400' },
    { label: 'Usuários Totais', value: fin?.total_users ?? stats.users, icon: Users, accent: 'text-foreground' },
    { label: 'Novos (Mês)', value: fin?.new_users_month ?? 0, icon: Users, accent: 'text-foreground' },
    { label: 'Assinaturas Ativas', value: fin?.active_subscriptions ?? stats.subscriptions, icon: CreditCard, accent: 'text-primary' },
    { label: 'Cancelamentos', value: fin?.canceled_subscriptions ?? 0, icon: CreditCard, accent: 'text-destructive' },
    { label: 'Diagnósticos', value: stats.diagnoses, icon: FileText, accent: 'text-foreground' },
    { label: 'Ticket Médio', value: BRL(fin?.avg_ticket_cents || 0), icon: DollarSign, accent: 'text-emerald-400' },
    { label: 'Conversão', value: `${fin?.conversion_rate ?? 0}%`, icon: Percent, accent: 'text-primary' },
    { label: 'Pagamentos OK', value: fin?.approved_payments ?? 0, icon: Activity, accent: 'text-emerald-400' },
    { label: 'Churn', value: `${fin?.churn_rate ?? 0}%`, icon: Percent, accent: 'text-destructive' },
    { label: 'Pendentes', value: fin?.pending_payments ?? 0, icon: Activity, accent: 'text-muted-foreground' },
    { label: 'Chargebacks', value: fin?.chargebacks ?? 0, icon: CreditCard, accent: 'text-destructive' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Visão Geral</h2>
          <p className="text-sm text-muted-foreground mt-1">KPIs executivos em tempo real</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card rounded-2xl p-4 md:p-5 hover:border-primary/30 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.accent}`} />
            </div>
            <div className="font-serif text-2xl md:text-3xl text-foreground truncate">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Novos usuários (30 dias)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6A74E" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#C6A74E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Area type="monotone" dataKey="users" stroke="#C6A74E" fill="url(#gUsers)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Receita diária (R$)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Assinantes por plano</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fin?.subs_by_plan || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="plan" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Bar dataKey="count" fill="#C6A74E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Distribuição de assinantes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={fin?.subs_by_plan || []} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={90} label>
                {(fin?.subs_by_plan || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
