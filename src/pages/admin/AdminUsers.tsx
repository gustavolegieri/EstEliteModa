import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  diagnoses_count: number;
  total_spent_cents: number;
}

const BRL = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_list_users_full');
      if (data) setRows(data as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(t) ||
      (r.email || '').toLowerCase().includes(t) ||
      (r.plan_name || '').toLowerCase().includes(t),
    );
  }, [rows, q]);

  const exportCsv = () => {
    const head = ['Nome', 'Email', 'Plano', 'Status', 'Cadastro', 'Último acesso', 'Diagnósticos', 'Total gasto'];
    const lines = filtered.map(r => [
      r.full_name || '', r.email || '', r.plan_name || '-', r.subscription_status || '-',
      r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-',
      r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString('pt-BR') : '-',
      r.diagnoses_count, (r.total_spent_cents / 100).toFixed(2),
    ].join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="animate-pulse text-primary">Carregando usuários...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-3xl text-gradient-gold">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} usuário(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, email, plano…" className="pl-9" />
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> CSV</Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-4 font-medium text-muted-foreground">Nome</th>
                <th className="p-4 font-medium text-muted-foreground">Email</th>
                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Cadastro</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Diag.</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4">{r.full_name || '—'}</td>
                  <td className="p-4 text-muted-foreground">{r.email || '—'}</td>
                  <td className="p-4">{r.plan_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4">
                    {r.subscription_status ? (
                      <Badge variant={r.subscription_status === 'active' ? 'default' : 'outline'}>{r.subscription_status}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-4 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="p-4 text-right">{r.diagnoses_count}</td>
                  <td className="p-4 text-right font-medium">{BRL(r.total_spent_cents)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
