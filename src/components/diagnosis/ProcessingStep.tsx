import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Brain, Palette, Shirt, Scissors, ShoppingBag, LayoutGrid, FileText, ImageIcon, Camera, Check, AlertTriangle } from 'lucide-react';

interface ProcessingStepProps {
  diagnosisId: string | null;
  onComplete?: (diagnosisId: string) => void;
}

const aiSteps = [
  { id: 'body', name: 'Análise Corporal', description: 'Analisando proporções e silhueta', icon: Brain },
  { id: 'color', name: 'Coloração Pessoal', description: 'Identificando sua paleta de cores', icon: Palette },
  { id: 'style', name: 'Identidade de Estilo', description: 'Descobrindo seu estilo pessoal', icon: Shirt },
  { id: 'modeling', name: 'Modelagens Ideais', description: 'Selecionando cortes e tecidos', icon: Scissors },
  { id: 'essentials', name: 'Peças Essenciais', description: 'Curando peças-chave', icon: ShoppingBag },
  { id: 'capsule', name: 'Armário Cápsula', description: 'Montando seu guarda-roupa', icon: LayoutGrid },
  { id: 'final', name: 'Diagnóstico Final', description: 'Consolidando seu resultado', icon: FileText },
  { id: 'images', name: 'Imagens das Peças', description: 'Buscando referências visuais', icon: ImageIcon },
  { id: 'look_images', name: 'Ilustrações de Looks', description: 'Gerando visuais dos looks', icon: Camera },
];

export function ProcessingStep({ diagnosisId, onComplete }: ProcessingStepProps) {
  const [visualIndex, setVisualIndex] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [backendCompleted, setBackendCompleted] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatedRef = useRef(false);

  // Keep refs in sync
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const diagnosisIdRef = useRef(diagnosisId);
  diagnosisIdRef.current = diagnosisId;

  // Single tick-based animation loop
  useEffect(() => {
    if (visualIndex < 0) return;

    const limit = backendCompleted ? aiSteps.length - 1 : targetIndex;
    if (visualIndex >= limit) {
      if (backendCompleted && visualIndex >= aiSteps.length - 1 && !navigatedRef.current) {
        navigatedRef.current = true;
        setIsCompleted(true);
        const id = diagnosisIdRef.current;
        const cb = onCompleteRef.current;
        if (id && cb) {
          setTimeout(() => cb(id), 1500);
        }
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setVisualIndex((prev) => prev + 1);
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visualIndex, targetIndex, backendCompleted]);

  // Poll + realtime for backend progress
  useEffect(() => {
    if (!diagnosisId) return;
    let mounted = true;

    const handleUpdate = (step: string | null, status: string | null, finalDiagnosis?: Record<string, unknown> | null) => {
      if (!mounted) return;

      if (status === 'failed') {
        const code = (finalDiagnosis?.code as string) || null;
        const message = (finalDiagnosis?.error as string) || null;
        setFailureCode(code);
        setFailureMessage(message);
        setHasFailed(true);
        setTargetIndex((prev) => Math.max(prev, 0));
        setVisualIndex((prev) => (prev < 0 ? 0 : prev));
        return;
      }

      if (status === 'completed') {
        setBackendCompleted(true);
        setTargetIndex(aiSteps.length - 1);
        setVisualIndex((prev) => (prev < 0 ? 0 : prev));
        return;
      }

      if (step) {
        const idx = aiSteps.findIndex((s) => s.id === step);
        if (idx >= 0) {
          setTargetIndex((prev) => Math.max(prev, idx));
          setVisualIndex((prev) => (prev < 0 ? 0 : prev));
        }
      }
    };

    const syncProgress = async () => {
      const { data } = await supabase
        .from('diagnoses')
        .select('processing_step, status, final_diagnosis')
        .eq('id', diagnosisId)
        .single();
      if (!mounted || !data) return;
      handleUpdate(data.processing_step || null, data.status || null, (data.final_diagnosis as Record<string, unknown>) || null);
    };

    syncProgress();
    const poll = setInterval(syncProgress, 2000);

    const channel = supabase
      .channel(`diagnosis-${diagnosisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'diagnoses',
          filter: `id=eq.${diagnosisId}`,
        },
        (payload) => {
          const record = payload.new as { processing_step?: string; status?: string; final_diagnosis?: Record<string, unknown> | null };
          handleUpdate(record.processing_step || null, record.status || null, record.final_diagnosis || null);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [diagnosisId]);

  // Dynamic time estimate: ~20s per remaining step
  const SECONDS_PER_STEP = 20;
  const completedCount = Math.max(0, visualIndex);
  const remainingSteps = isCompleted ? 0 : Math.max(0, aiSteps.length - completedCount);
  const remainingSeconds = remainingSteps * SECONDS_PER_STEP;
  const formatEstimate = (sec: number) => {
    if (sec <= 0) return 'Concluindo...';
    if (sec < 60) return `~${sec}s restantes`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `~${m} min restantes` : `~${m} min ${s}s restantes`;
  };

  return (
    <div className="space-y-8 py-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-600 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-gold-400 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
          Processando seu <span className="text-gold-400">Diagnóstico</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Nossas 9 IAs especializadas estão analisando seus dados para criar
          um diagnóstico personalizado e exclusivo para você.
        </p>

        {!hasFailed && (
          <div className="mt-5 inline-flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/30 bg-gold-500/10">
              <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
              <span className="text-sm font-medium text-gold-400 tabular-nums transition-all">
                {formatEstimate(remainingSeconds)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Não feche esta página durante o processamento
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {aiSteps.map((step, index) => {
          const Icon = step.icon;
          const stepCompleted = index < visualIndex || (isCompleted && index <= visualIndex);
          const isCurrent = index === visualIndex && !isCompleted;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-700 ${
                stepCompleted
                  ? 'border-gold-500 bg-gold-500/10'
                  : isCurrent
                  ? 'border-gold-400/50 bg-gold-400/5'
                  : 'border-border bg-card/50 opacity-40'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                  stepCompleted
                    ? 'bg-gold-500 text-background'
                    : isCurrent
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepCompleted ? (
                  <Check className="w-6 h-6" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${stepCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.name}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {isCurrent && (
                <div className="text-gold-400 text-sm font-medium animate-pulse">
                  Em análise...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasFailed && (
        <div className="text-center pt-4 space-y-3">
          <div className="inline-flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {failureCode === 'no_subscription'
              ? 'Conta sem assinatura'
              : failureCode === 'unauthorized'
              ? 'Sessão expirada. Faça login novamente.'
              : failureMessage || 'Não foi possível concluir este diagnóstico. Tente iniciar uma nova análise.'}
          </div>
          {failureCode === 'no_subscription' && (
            <p className="text-xs text-muted-foreground">
              Ative um plano para gerar seu diagnóstico personalizado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
