import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Play, Pause, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';

type Stats = {
  total: number;
  done: number;
  pending: number;
  failed: number;
  byCategory: Record<string, { total: number; done: number }>;
};

type BatchResult = { processed: number; ok: number; failed: number; error?: string };

export default function AdminLibrary() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastBatch, setLastBatch] = useState<BatchResult | null>(null);
  const [batchSize, setBatchSize] = useState(15);
  const [includeFailed, setIncludeFailed] = useState(false);
  const stopRef = useRef(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    const { data, error } = await supabase.functions.invoke('library-stats', { body: {} });
    setLoadingStats(false);
    if (error) {
      toast.error('Erro ao carregar estatísticas');
      return;
    }
    setStats(data as Stats);
  };

  useEffect(() => {
    void fetchStats();
    const t = window.setInterval(() => void fetchStats(), 5000);
    return () => window.clearInterval(t);
  }, []);

  const seed = async () => {
    setSeeding(true);
    const { data, error } = await supabase.functions.invoke('library-seed', { body: {} });
    setSeeding(false);
    if (error) {
      toast.error('Erro ao popular combinações');
      return;
    }
    const d = data as { total_combinations: number; inserted_now: number };
    toast.success(`${d.inserted_now} novas combinações criadas (total ${d.total_combinations})`);
    void fetchStats();
  };

  const startGeneration = async () => {
    if (running) return;
    setRunning(true);
    stopRef.current = false;
    toast.info('Geração iniciada — pode levar várias horas. Pode fechar a página.');

    while (!stopRef.current) {
      const { data, error } = await supabase.functions.invoke('library-generate-batch', {
        body: { batchSize, includeFailed },
      });
      if (error) {
        toast.error(`Erro no lote: ${error.message || 'desconhecido'}`);
        setRunning(false);
        return;
      }
      const result = data as BatchResult;
      setLastBatch(result);
      void fetchStats();
      if (result.processed === 0) {
        toast.success('Biblioteca completa — nenhuma imagem pendente!');
        setRunning(false);
        return;
      }
      // Tiny breather between batches to avoid hammering
      await new Promise((r) => setTimeout(r, 800));
    }
    setRunning(false);
    toast.info('Geração pausada');
  };

  const stop = () => {
    stopRef.current = true;
  };

  const resetFailed = async () => {
    const { error } = await supabase
      .from('library_assets')
      .update({ status: 'pending', attempts: 0, last_error: null })
      .eq('status', 'failed');
    if (error) {
      toast.error('Erro ao resetar falhas');
      return;
    }
    toast.success('Falhas resetadas — incluídas na próxima execução');
    void fetchStats();
  };

  const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="font-serif text-3xl text-gradient-gold">Biblioteca de Referências</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Geração em lote de imagens de moda para todas as combinações de categoria × estilo × corpo × coloração.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-serif text-2xl">
              {stats ? `${stats.done.toLocaleString('pt-BR')} / ${stats.total.toLocaleString('pt-BR')}` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">imagens geradas</div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">Pendentes: {stats?.pending ?? 0}</Badge>
            <Badge variant="destructive">Falhas: {stats?.failed ?? 0}</Badge>
          </div>
        </div>
        <Progress value={pct} className="h-3" />
        <div className="text-xs text-right text-muted-foreground">{pct}%</div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-serif text-xl">Controles</h3>

        <div className="grid sm:grid-cols-3 gap-3">
          <Button onClick={seed} disabled={seeding} variant="outline">
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            1. Popular combinações
          </Button>

          {!running ? (
            <Button onClick={startGeneration} disabled={!stats || stats.pending === 0}>
              <Play className="mr-2 h-4 w-4" />
              2. Iniciar geração
            </Button>
          ) : (
            <Button onClick={stop} variant="destructive">
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </Button>
          )}

          <Button onClick={resetFailed} disabled={!stats || stats.failed === 0} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Resetar falhas
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm pt-2 border-t border-border">
          <label className="flex items-center gap-2">
            Lote:
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={running}
              className="bg-background border border-border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" checked={includeFailed} onChange={(e) => setIncludeFailed(e.target.checked)} disabled={running} />
            Re-tentar falhas
          </label>
          {running && (
            <span className="ml-auto text-primary flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </span>
          )}
        </div>

        {lastBatch && (
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            Último lote: {lastBatch.processed} processadas · {lastBatch.ok} ok · {lastBatch.failed} falha(s)
          </div>
        )}
      </Card>

      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <Card className="p-6">
          <h3 className="font-serif text-xl mb-4">Progresso por categoria</h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).map(([cat, v]) => {
              const p = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{cat}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {v.done}/{v.total} ({p}%)
                    </span>
                  </div>
                  <Progress value={p} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4 bg-muted/30 text-sm text-muted-foreground flex gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Dica:</strong> Cada imagem usa créditos do gateway Lovable AI (gpt-image-2 low ≈ $0.01).
          Gerar 10.000+ imagens consumirá ~$100+ em créditos e levará várias horas. Você pode pausar e retomar a
          qualquer momento — o progresso é persistente.
          {loadingStats && <span className="ml-2 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> atualizando…</span>}
        </div>
      </Card>
    </div>
  );
}
