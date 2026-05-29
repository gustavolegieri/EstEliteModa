import { Loader2, AlertTriangle } from 'lucide-react';

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function RenderValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground italic">—</span>;
  if (typeof value === 'string') return <span className="text-foreground/80">{value}</span>;
  if (typeof value === 'number' || typeof value === 'boolean') return <span className="text-foreground/80">{String(value)}</span>;

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      return (
        <div className="space-y-3 mt-2">
          {value.map((item, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50">
              {typeof item === 'object' && item !== null ? (
                <div className="grid gap-2">
                  {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-primary font-medium text-sm min-w-[120px] capitalize">{formatKey(k)}:</span>
                      <RenderValue value={v} depth={depth + 1} />
                    </div>
                  ))}
                </div>
              ) : (
                <RenderValue value={item} depth={depth + 1} />
              )}
            </div>
          ))}
        </div>
      );
    }
    return (
      <ul className="list-disc list-inside space-y-1 mt-1">
        {value.map((item, i) => (
          <li key={i} className="text-foreground/80">{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className={`space-y-3 ${depth > 0 ? 'ml-2 pl-3 border-l-2 border-primary/20 mt-2' : ''}`}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <h5 className="text-primary font-medium capitalize text-sm mb-1">{formatKey(k)}</h5>
            <RenderValue value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-foreground/80">{String(value)}</span>;
}

export function AnalysisSection({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground">Esta análise está sendo processada...</p>
      </div>
    );
  }

  if (data.error && typeof data.error === 'string') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-destructive font-medium mb-2">Análise incompleta</p>
        <p className="text-muted-foreground text-sm">
          As fotos necessárias para esta análise não estavam disponíveis.
        </p>
      </div>
    );
  }

  if (data.raw_response) {
    return (
      <div className="prose prose-invert max-w-none">
        <p className="text-foreground/80 whitespace-pre-wrap">{String(data.raw_response)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="border-b border-border/50 pb-4 last:border-0">
          <h4 className="text-primary font-semibold capitalize mb-2 text-base">{formatKey(key)}</h4>
          <RenderValue value={value} />
        </div>
      ))}
    </div>
  );
}
