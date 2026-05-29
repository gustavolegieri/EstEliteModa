import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, HelpCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DiagnosisPhotos } from '@/pages/NewDiagnosis';

interface PhotoUploadStepProps {
  photos: DiagnosisPhotos;
  setPhotos: React.Dispatch<React.SetStateAction<DiagnosisPhotos>>;
}

type PhotoType = keyof DiagnosisPhotos;
type SlotState = 'idle' | 'loading' | 'error';

const photoConfig: { type: PhotoType; label: string }[] = [
  { type: 'front', label: 'Frente' },
  { type: 'side', label: 'Lateral' },
  { type: 'back', label: 'Costas' },
  { type: 'face', label: 'Rosto' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const TOOLTIP_TEXT =
  'Essa análise inicial utiliza suas respostas e imagens para identificar proporções, formato corporal e recomendações preliminares. Use iluminação natural, roupas justas e postura natural.';

export function PhotoUploadStep({ photos, setPhotos }: PhotoUploadStepProps) {
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const [dragOver, setDragOver] = useState<PhotoType | null>(null);
  const [slotState, setSlotState] = useState<Record<PhotoType, SlotState>>({
    front: 'idle', side: 'idle', back: 'idle', face: 'idle',
  });

  const photoUrls = useMemo(() => {
    const urls: Partial<Record<PhotoType, string>> = {};
    for (const type of ['front', 'side', 'back', 'face'] as PhotoType[]) {
      const file = photos[type];
      const oldUrl = objectUrlsRef.current.get(type);
      if (file) {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        const newUrl = URL.createObjectURL(file);
        objectUrlsRef.current.set(type, newUrl);
        urls[type] = newUrl;
      } else if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        objectUrlsRef.current.delete(type);
      }
    }
    return urls;
  }, [photos]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const handleFileChange = useCallback((type: PhotoType, file: File | null) => {
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
        setSlotState(s => ({ ...s, [type]: 'error' }));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. O tamanho máximo é 5MB.');
        setSlotState(s => ({ ...s, [type]: 'error' }));
        return;
      }
      setSlotState(s => ({ ...s, [type]: 'loading' }));
      setTimeout(() => setSlotState(s => ({ ...s, [type]: 'idle' })), 300);
    } else {
      setSlotState(s => ({ ...s, [type]: 'idle' }));
    }
    setPhotos(prev => ({ ...prev, [type]: file }));
  }, [setPhotos]);

  const handleDrop = useCallback((type: PhotoType, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(type, file);
  }, [handleFileChange]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-serif font-bold text-foreground">
              Pré-<span className="text-gold-400">diagnóstico</span>
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Sobre o pré-diagnóstico"
                  className="text-muted-foreground hover:text-gold-400 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs bg-background/95 backdrop-blur border-border text-foreground text-xs leading-relaxed animate-fade-in"
              >
                {TOOLTIP_TEXT}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photoConfig.map(({ type, label }) => {
            const file = photos[type];
            const url = photoUrls[type];
            const state = slotState[type];
            const isDrag = dragOver === type;

            return (
              <div
                key={type}
                className={`relative aspect-[3/4] rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group overflow-hidden ${
                  isDrag
                    ? 'border-gold-400 bg-gold-500/10 scale-[1.02]'
                    : file
                    ? 'border-gold-500/60 bg-card'
                    : 'border-border hover:border-gold-400/60 hover:bg-gold-500/5 hover:scale-[1.02]'
                }`}
                onDrop={(e) => handleDrop(type, e)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(type); }}
                onDragLeave={() => setDragOver(null)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
                />

                {file && url ? (
                  <>
                    <img
                      src={url}
                      alt={label}
                      className="w-full h-full object-cover animate-fade-in"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleFileChange(type, null);
                      }}
                      className="absolute top-2 right-2 z-20 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80 active:scale-95 transition-all shadow-lg"
                      aria-label={`Remover foto ${label}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                      <span className="text-white text-sm font-medium">{label}</span>
                    </div>
                  </>
                ) : state === 'loading' ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
                    <div className="w-3/4 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-1/3 bg-gold-400 animate-[slide-in-right_1s_ease-in-out_infinite]" />
                    </div>
                    <span className="text-xs text-muted-foreground">Carregando…</span>
                    <span className="text-sm font-medium text-foreground mt-auto">{label}</span>
                  </div>
                ) : state === 'error' ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2">
                    <AlertCircle className="w-7 h-7 text-destructive" />
                    <span className="text-xs text-destructive">Falha ao carregar</span>
                    <span className="text-sm font-medium text-foreground mt-auto">{label}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Upload className="w-7 h-7 text-muted-foreground group-hover:text-gold-400 transition-colors mb-2" />
                    <span className="text-xs text-muted-foreground leading-snug">
                      Clique ou arraste<br />a foto
                    </span>
                    <span className="text-sm font-medium text-foreground mt-auto pt-3">{label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
