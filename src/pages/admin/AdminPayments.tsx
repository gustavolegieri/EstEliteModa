import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

const BRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

interface Payment {
  id: string;
  user_id: string;
  status: string;
  amount_cents: number;
  payment_method: string | null;
  provider_payment_id: string | null;
  approved_at: string | null;
  created_at: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter === 'approved') q = q.in('status', ['approved', 'paid']);
    if (filter === 'pending') q = q.in('status', ['pending', 'in_process']);
    if (filter === 'failed') q = q.in('status', ['rejected', 'failed', 'cancelled']);
    if (filter === 'chargeback') q = q.in('status', ['charged_back', 'refunded']);
    const { data } = await q;
    setPayments((data as Payment[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const statusClass = (s: string) => {
    if (s === 'approved' || s === 'paid') return 'bg-emerald-500/20 text-emerald-400';
    if (['rejected', 'failed', 'cancelled'].includes(s)) return 'bg-destructive/20 text-destructive';
    if (['charged_back', 'refunded'].includes(s)) return 'bg-orange-500/20 text-orange-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Pagamentos</h2>
          <p className="text-sm text-muted-foreground mt-1">Transações reais do Mercado Pago</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'approved', label: 'Aprovados' },
          { id: 'pending', label: 'Pendentes' },
          { id: 'failed', label: 'Recusados' },
          { id: 'chargeback', label: 'Chargebacks' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              filter === f.id ? 'bg-primary/20 border-primary text-primary' : 'border-border hover:bg-muted/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">Data</th>
                <th className="p-4 font-medium text-muted-foreground">ID MP</th>
                <th className="p-4 font-medium text-muted-foreground">Usuário</th>
                <th className="p-4 font-medium text-muted-foreground">Método</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(p.approved_at || p.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-mono text-xs max-w-[120px] truncate">{p.provider_payment_id || '—'}</td>
                  <td className="p-4 font-mono text-xs">{p.user_id.slice(0, 8)}…</td>
                  <td className="p-4">{p.payment_method || '—'}</td>
                  <td className="p-4">
                    <Badge variant="outline" className={statusClass(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="p-4 text-right font-medium">{BRL(p.amount_cents)}</td>
                </tr>
              ))}
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
