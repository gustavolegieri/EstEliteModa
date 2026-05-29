import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

interface SubRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan_name: string | null;
  status: string;
  mp_subscription_id: string | null;
  recurring_amount: number | null;
  next_billing_date: string | null;
  last_payment_date: string | null;
  created_at: string;
}

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [logs, setLogs] = useState<{ id: string; event_type: string | null; status: string | null; created_at: string; error: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [subs, wh] = await Promise.all([
      supabase.rpc('admin_list_subscriptions'),
      supabase.from('webhook_logs').select('id, event_type, status, created_at, error').order('created_at', { ascending: false }).limit(30),
    ]);
    if (subs.data) setRows(subs.data as SubRow[]);
    if (wh.data) setLogs(wh.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusVariant = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'pending') return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Assinaturas</h2>
          <p className="text-sm text-muted-foreground mt-1">Recorrência Mercado Pago</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h3 className="font-serif text-lg">Todas as assinaturas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">ID MP</th>
                <th className="p-4 font-medium text-muted-foreground">Próx. cobrança</th>
                <th className="p-4 font-medium text-muted-foreground">Último pag.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4">
                    <div className="font-medium">{r.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.email}</div>
                  </td>
                  <td className="p-4">{r.plan_name || '—'}</td>
                  <td className="p-4">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="p-4 font-mono text-xs max-w-[100px] truncate">{r.mp_subscription_id || '—'}</td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {r.next_billing_date ? new Date(r.next_billing_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma assinatura.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h3 className="font-serif text-lg">Logs de Webhook</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/30 text-left sticky top-0">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">Data</th>
                <th className="p-4 font-medium text-muted-foreground">Evento</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-mono text-xs">{l.event_type || '—'}</td>
                  <td className="p-4">{l.status}</td>
                  <td className="p-4 text-xs text-destructive max-w-[200px] truncate">{l.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
