import { useState, useCallback } from 'react';
import { useAutoImage } from '@/hooks/useAutoImage';
import type { ImagesMap } from '@/hooks/useDiagnosisImages';
import type { LookImagesMap } from '@/hooks/useLookImages';
import { motion } from 'framer-motion';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Look {
  nome?: string;
  pecas?: string[];
  ocasiao?: string;
  dicas_styling?: string[];
  [key: string]: unknown;
}

interface CapsuleData {
  conceito_capsula?: string;
  pecas_capsula?: {
    quantidade_total?: string | number;
    tops?: string[]; bottoms?: string[]; vestidos?: string[]; tercas_pecas?: string[]; calcados?: string[]; bolsas?: string[];
    [key: string]: unknown;
  };
  looks_trabalho?: Look[]; looks_casual?: Look[]; looks_eventos?: Look[];
  combinacoes_possiveis?: string | number;
  [key: string]: unknown;
}

const occasionTags: Record<string, string> = {
  looks_trabalho: 'Trabalho',
  looks_casual: 'Casual',
  looks_eventos: 'Eventos',
};

const capsuleCategoryLabels: Record<string, string> = {
  tops: 'Tops & Blusas',
  bottoms: 'Calças & Saias',
  vestidos: 'Vestidos',
  tercas_pecas: 'Terceiras Peças',
  calcados: 'Calçados',
  bolsas: 'Acessórios',
};

const capsuleCategoryIcons: Record<string, string> = {
  tops: '👕',
  bottoms: '👖',
  vestidos: '👗',
  tercas_pecas: '🧥',
  calcados: '👟',
  bolsas: '👜',
};

// Maps wardrobe category keys → product category hint used to lock the AI prompt
const catKeyToCategory: Record<string, string> = {
  tops: 'top',
  bottoms: 'pants',
  vestidos: 'dress',
  tercas_pecas: 'outerwear',
  calcados: 'footwear',
  bolsas: 'bag',
};

function splitPieces(pecas: string[]): string[] {
  const result: string[] = [];
  for (const p of pecas) {
    if (p.includes('+')) {
      result.push(...p.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean));
    } else {
      result.push(p.trim());
    }
  }
  return result;
}

interface CapsuleSectionProps {
  data: Record<string, unknown>;
  combinations?: number;
  diagnosisId?: string;
  imagesMap?: ImagesMap;
  imagesLoading?: boolean;
  lookImagesMap?: LookImagesMap;
  lookImagesLoading?: boolean;
}

export function CapsuleSection({ data, combinations = 0, diagnosisId, imagesMap, imagesLoading, lookImagesMap, lookImagesLoading }: CapsuleSectionProps) {
  const d = data as CapsuleData;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedLook, setExpandedLook] = useState<Look | null>(null);
  const [expandedPiece, setExpandedPiece] = useState<{ url: string; name: string } | null>(null);

  const pieces = d.pecas_capsula || {};
  const pieceCategories = Object.entries(pieces)
    .filter(([k, v]) => Array.isArray(v) && (v as string[]).length > 0 && k !== 'quantidade_total') as [string, string[]][];
  const totalPieces = Number(pieces.quantidade_total) || pieceCategories.reduce((s, [, v]) => s + v.length, 0);
  const combos = Number(d.combinacoes_possiveis) || combinations;

  const allLooks: { look: Look; tag: string }[] = [];
  (['looks_trabalho', 'looks_casual', 'looks_eventos'] as const).forEach(key => {
    const looks = d[key];
    if (looks && Array.isArray(looks)) {
      (looks as Look[]).forEach(look => allLooks.push({ look, tag: occasionTags[key] }));
    }
  });

  const handleExpandPiece = useCallback((url: string, name: string) => {
    setExpandedPiece({ url, name });
  }, []);

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Guarda-Roupa</h2>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {totalPieces > 0 && (
          <span className="text-xs font-sans text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/20">
            {totalPieces} peças
          </span>
        )}
        {combos > 1 && (
          <span className="text-xs font-sans text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/15">
            {combos} combinações
          </span>
        )}
        {allLooks.length > 0 && (
          <span className="text-xs font-sans text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/20">
            {allLooks.length} looks
          </span>
        )}
      </div>

      </div>

      {/* ── Category Cards ── */}
      {pieceCategories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pieceCategories.map(([catKey, items]) => (
            <CategoryCard diagnosisId={diagnosisId}
              key={catKey}
              catKey={catKey}
              items={items}
              imagesMap={imagesMap}
              category={catKeyToCategory[catKey]}
              onClick={() => setExpandedCategory(catKey)}
            />
          ))}
        </div>
      )}

      {/* ── Looks Cards ── */}
      {allLooks.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-sans font-semibold text-foreground">Looks Sugeridos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allLooks.map(({ look, tag }, i) => (
              <LookCard diagnosisId={diagnosisId}
                key={i}
                look={look}
                tag={tag}
                index={i}
                imagesMap={imagesMap}
                lookImagesMap={lookImagesMap}
                lookImagesLoading={lookImagesLoading}
                onClick={() => setExpandedLook(look)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Empty State ── */}
      {pieceCategories.length === 0 && allLooks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
            <LayoutGrid className="w-6 h-6 text-primary/30" />
          </div>
          <p className="text-sm font-sans text-muted-foreground">Nenhuma peça disponível</p>
        </div>
      )}

      {/* ── Category Detail Modal ── */}
      <Dialog open={!!expandedCategory} onOpenChange={() => setExpandedCategory(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0 border-border/30">
          {expandedCategory && (() => {
            const items = (pieces as Record<string, string[]>)[expandedCategory] || [];
            return (
              <div>
                <div className="p-5 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{capsuleCategoryIcons[expandedCategory] || '📦'}</span>
                    <h3 className="text-base font-sans font-bold text-foreground">
                      {capsuleCategoryLabels[expandedCategory] || expandedCategory}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full ml-auto">{items.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4">
                  {items.map((item, i) => (
                    <PieceCard key={i} name={item} imagesMap={imagesMap} diagnosisId={diagnosisId} category={catKeyToCategory[expandedCategory!]} onExpand={handleExpandPiece} />
                  ))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Look Detail Modal ── */}
      <Dialog open={!!expandedLook} onOpenChange={() => setExpandedLook(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0 border-border/30">
          {expandedLook && (() => {
            const lookPieces = splitPieces(expandedLook.pecas || []);
            return (
              <div>
                <div className="p-5 border-b border-border/20">
                  <h3 className="text-base font-sans font-bold text-foreground">{expandedLook.nome || 'Look'}</h3>
                  {expandedLook.ocasiao && (
                    <span className="inline-block text-[10px] font-sans font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mt-2">
                      {expandedLook.ocasiao}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 p-4">
                  {lookPieces.map((peca, i) => (
                    <PieceCard key={i} name={peca} imagesMap={imagesMap} diagnosisId={diagnosisId} onExpand={handleExpandPiece} />
                  ))}
                </div>
                {expandedLook.dicas_styling && expandedLook.dicas_styling.length > 0 && (
                  <div className="px-5 pb-5 space-y-2 border-t border-border/20 pt-4">
                    <h4 className="text-xs font-sans font-semibold text-primary uppercase tracking-wider">Dicas</h4>
                    {expandedLook.dicas_styling.map((dica, i) => (
                      <p key={i} className="text-xs font-sans text-muted-foreground leading-relaxed flex items-start gap-2">
                        <Sparkles className="w-3 h-3 text-primary/40 mt-0.5 shrink-0" />
                        {dica}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Piece Expanded Image ── */}
      <Dialog open={!!expandedPiece} onOpenChange={() => setExpandedPiece(null)}>
        <DialogContent className="max-w-sm p-0 border-border/30 overflow-hidden">
          {expandedPiece && (
            <div>
              <img src={expandedPiece.url} alt={expandedPiece.name} className="w-full max-h-[60vh] object-contain" />
              <div className="p-4">
                <p className="text-sm font-sans font-medium text-foreground">{expandedPiece.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Category Card with cover image from first piece ── */
function CategoryCard({ catKey, items, imagesMap, diagnosisId, category, onClick }: {
  catKey: string; items: string[]; imagesMap?: ImagesMap; diagnosisId?: string; category?: string; onClick: () => void;
}) {
  const firstPiece = items[0] || '';
  const { imageUrl, isLoading, hasFailed, retry } = useAutoImage(firstPiece, imagesMap, diagnosisId, category);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-xl border border-border/30 bg-card/50 overflow-hidden text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/5 to-muted/10 flex items-center justify-center">
        {isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 px-2 text-center">Gerando recomendação visual...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={firstPiece} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : hasFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-muted/30">
            <span className="text-[10px] text-muted-foreground/80">Não foi possível gerar</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); retry(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); retry(); } }}
              className="px-2.5 py-1 rounded-full border border-primary/40 text-primary text-[9px] uppercase tracking-widest hover:bg-primary/10 transition cursor-pointer"
            >
              Tentar novamente
            </span>
          </div>
        ) : (
          <div className="w-full h-full bg-muted/40" aria-label="Imagem indisponível" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <h4 className="text-sm font-sans font-semibold text-white">
            {capsuleCategoryLabels[catKey] || catKey}
          </h4>
          <p className="text-[10px] text-white/70">{items.length} peças</p>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Look Card using existing piece images as mosaic ── */
function LookCard({ look, tag, index, imagesMap, diagnosisId, lookImagesMap, lookImagesLoading, onClick }: {
  look: Look; tag: string; index: number; imagesMap?: ImagesMap; diagnosisId?: string; lookImagesMap?: LookImagesMap; lookImagesLoading?: boolean; onClick: () => void;
}) {
  const lookName = look.nome || `Look ${index + 1}`;
  const lookPieces = splitPieces(look.pecas || []);
  const lookImage = lookImagesMap?.[lookName];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-xl border border-border/30 bg-card/50 overflow-hidden text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/5 to-muted/10">
        {lookImagesLoading ? (
          <div className="w-full h-full bg-muted animate-pulse" />
        ) : lookImage ? (
          <img src={lookImage} alt={lookName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
            {lookPieces.slice(0, 4).map((peca, j) => (
              <PieceMiniThumb key={j} name={peca} imagesMap={imagesMap} diagnosisId={diagnosisId} />
            ))}
          </div>
        )}
        <span className="absolute top-2 left-2 text-[9px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 backdrop-blur-sm">
          {tag}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="text-xs font-sans font-semibold text-white line-clamp-1">{lookName}</h4>
          <p className="text-[10px] text-white/70 line-clamp-1">{lookPieces.join(' · ')}</p>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Mini thumbnail for look mosaic ── */
function PieceMiniThumb({ name, imagesMap, diagnosisId }: { name: string; imagesMap?: ImagesMap; diagnosisId?: string }) {
  const { imageUrl, isLoading } = useAutoImage(name, imagesMap, diagnosisId);

  return (
    <div className="relative overflow-hidden bg-muted/20 flex items-center justify-center">
      {isLoading ? (
        <div className="w-full h-full bg-muted animate-pulse" />
      ) : imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-muted/40" aria-label="Imagem indisponível" />
      )}
    </div>
  );
}

/* ── Piece Card for modals ── */
function PieceCard({ name, imagesMap, diagnosisId, category, onExpand }: { name: string; imagesMap?: ImagesMap; diagnosisId?: string; category?: string; onExpand: (url: string, name: string) => void }) {
  const { imageUrl, isLoading, hasFailed, retry } = useAutoImage(name, imagesMap, diagnosisId, category);

  return (
    <div
      className="rounded-lg border border-border/30 overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-200 group"
      onClick={() => imageUrl && onExpand(imageUrl, name)}
    >
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/5 to-muted/10 flex items-center justify-center">
        {isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 px-2 text-center">Gerando...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : hasFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 text-center bg-muted/30">
            <span className="text-[9px] text-muted-foreground/80">Falhou</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); retry(); }}
              className="px-2 py-0.5 rounded-full border border-primary/40 text-primary text-[8px] uppercase tracking-widest hover:bg-primary/10 transition"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="w-full h-full bg-muted/40" aria-label="Imagem indisponível" />
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-sans text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{name}</p>
      </div>
    </div>
  );
}
