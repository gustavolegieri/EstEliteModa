import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';

export function ImageSearchTester() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ url: string; source: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setAiQuery('');
    try {
      const { data, error } = await supabase.functions.invoke('search-clothing-image', {
        body: { query: query.trim(), count: 6 },
      });
      if (data?.results) setResults(data.results);
      if (data?.aiQuery) setAiQuery(data.aiQuery);
      if (error) console.error('Search error:', error);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:scale-105 transition-transform"
        title="Testar busca de imagens"
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">🔍 Teste de Busca de Roupas</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: blazer preto feminino, saia midi, tênis branco..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {aiQuery && (
          <p className="text-xs text-muted-foreground">
            Query IA: <span className="text-foreground font-mono">{aiQuery}</span>
          </p>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border bg-card">
                <img src={r.url} alt={`Result ${i}`} className="w-full aspect-[3/4] object-cover" />
                <p className="text-[10px] text-muted-foreground p-1.5 truncate">{r.source}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado. Tente outra busca.</p>
        )}
      </div>
    </div>
  );
}
