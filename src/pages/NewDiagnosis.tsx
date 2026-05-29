import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PhotoUploadStep } from '@/components/diagnosis/PhotoUploadStep';
import { QuestionnaireStep } from '@/components/diagnosis/QuestionnaireStep';
import { ProcessingStep } from '@/components/diagnosis/ProcessingStep';
import type { Json } from '@/integrations/supabase/types';

export type DiagnosisPhotos = {
  front: File | null;
  side: File | null;
  back: File | null;
  face: File | null;
};

export type QuestionnaireData = {
  lifestyle: string;
  profession: string;
  occasions: string[];
  preferences: string[];
  budget: string;
  climate: string;
  goals: string;
  bodyType: string;
  height: string;
  challenges: string;
  heightCm: string;
  weightKg: string;
  topSize: string;
  bottomSize: string;
  shoeSize: string;
  bodyNotes: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  fitPreference: string;
  formalityLevel: string;
};

const steps = [
  { id: 1, name: 'Fotos', description: 'Upload das suas fotos' },
  { id: 2, name: 'Questionário', description: 'Conte-nos sobre você' },
  { id: 3, name: 'Processamento', description: 'Análise com IA' },
];

export default function NewDiagnosis() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const [photos, setPhotos] = useState<DiagnosisPhotos>(() => {
    // Try restoring from sessionStorage first
    const saved = sessionStorage.getItem('diagnosis_photos_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, { dataUrl: string; name: string; type: string }>;
        const restored: DiagnosisPhotos = { front: null, side: null, back: null, face: null };
        let hasAny = false;
        for (const key of ['front', 'side', 'back', 'face'] as const) {
          if (parsed[key]) {
            const { dataUrl, name, type } = parsed[key];
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            restored[key] = new File([ab], name, { type });
            hasAny = true;
          }
        }
        if (hasAny) return restored;
      } catch { /* ignore */ }
    }
    return { front: null, side: null, back: null, face: null };
  });


  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Você precisa estar logada para iniciar um diagnóstico.');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadProfileData();
  }, [user]);

  useEffect(() => {
    const savePhotos = async () => {
      const cache: Record<string, { dataUrl: string; name: string; type: string }> = {};
      for (const key of ['front', 'side', 'back', 'face'] as const) {
        const file = photos[key];
        if (file) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          cache[key] = { dataUrl, name: file.name, type: file.type };
        }
      }
      if (Object.keys(cache).length > 0) {
        try { sessionStorage.setItem('diagnosis_photos_cache', JSON.stringify(cache)); } catch { /* quota */ }
      } else {
        sessionStorage.removeItem('diagnosis_photos_cache');
      }
    };
    savePhotos();
  }, [photos]);

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
    lifestyle: '',
    profession: '',
    occasions: [],
    preferences: [],
    budget: '',
    climate: '',
    goals: '',
    bodyType: '',
    height: '',
    challenges: '',
    heightCm: '',
    weightKg: '',
    topSize: '',
    bottomSize: '',
    shoeSize: '',
    bodyNotes: '',
    hairColor: '',
    eyeColor: '',
    skinTone: '',
    fitPreference: '',
    formalityLevel: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);

  const loadProfileData = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (data) {
        const p = data as any;
        setQuestionnaire(prev => ({
          ...prev,
          heightCm: p.height_cm ? String(p.height_cm) : prev.heightCm,
          weightKg: p.weight_kg ? String(p.weight_kg) : prev.weightKg,
          topSize: p.top_size || prev.topSize,
          bottomSize: p.bottom_size || prev.bottomSize,
          shoeSize: p.shoe_size || prev.shoeSize,
          bodyType: p.body_type || prev.bodyType,
          bodyNotes: p.body_notes || prev.bodyNotes,
          hairColor: p.hair_color || prev.hairColor,
          eyeColor: p.eye_color || prev.eyeColor,
          skinTone: p.skin_tone || prev.skinTone,
          fitPreference: p.fit_preference || prev.fitPreference,
          formalityLevel: p.formality_level || prev.formalityLevel,
        }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const progress = (currentStep / steps.length) * 100;
  const canProceedStep1 = !!(photos.front && photos.side && photos.back && photos.face);
  const canProceedStep2 = questionnaire.lifestyle && questionnaire.profession && 
                          questionnaire.budget && questionnaire.climate && questionnaire.goals;

  const uploadPhoto = async (file: File, type: string, diagId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${diagId}/${type}.${fileExt}`;
    const { error } = await supabase.storage.from('diagnosis-photos').upload(fileName, file, { upsert: true });
    if (error) { console.error(`Error uploading ${type}:`, error); toast.error(`Erro ao enviar foto: ${type}`); return null; }
    const { data } = supabase.storage.from('diagnosis-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const calculateStyleScore = () => {
    const styleMap: Record<string, string> = {
      classic: 'Clássico', romantic: 'Romântico', modern: 'Moderno',
      bold: 'Ousado', bohemian: 'Boho', elegant: 'Elegante',
    };
    const scores: Record<string, number> = {};
    Object.keys(styleMap).forEach(key => {
      scores[styleMap[key]] = questionnaire.preferences.includes(key) ? 85 : 20;
    });
    return scores;
  };

  const handleStartProcessing = async () => {
    if (!user) { toast.error('Você precisa estar logado'); navigate('/auth'); return; }
    setIsProcessing(true);
    setCurrentStep(3);

    try {
      const styleScore = calculateStyleScore();
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        questionnaire: questionnaire as unknown as Json,
        status: 'processing',
        height_cm: questionnaire.heightCm ? parseInt(questionnaire.heightCm) : null,
        weight_kg: questionnaire.weightKg ? parseInt(questionnaire.weightKg) : null,
        top_size: questionnaire.topSize || null,
        bottom_size: questionnaire.bottomSize || null,
        shoe_size: questionnaire.shoeSize || null,
        body_notes: questionnaire.bodyNotes || null,
        hair_color: questionnaire.hairColor || null,
        eye_color: questionnaire.eyeColor || null,
        skin_tone: questionnaire.skinTone || null,
        fit_preference: questionnaire.fitPreference || null,
        formality_level: questionnaire.formalityLevel || null,
        style_intensity_score: styleScore as unknown as Json,
      };

      const { data: diagnosis, error: diagError } = await supabase
        .from('diagnoses').insert([insertData] as any).select().single();
      if (diagError) throw diagError;
      setDiagnosisId(diagnosis.id);

      const [frontUrl, sideUrl, backUrl, faceUrl] = await Promise.all([
        photos.front ? uploadPhoto(photos.front, 'front', diagnosis.id) : null,
        photos.side ? uploadPhoto(photos.side, 'side', diagnosis.id) : null,
        photos.back ? uploadPhoto(photos.back, 'back', diagnosis.id) : null,
        photos.face ? uploadPhoto(photos.face, 'face', diagnosis.id) : null,
      ]);

      await supabase.from('diagnoses').update({
        photo_front_url: frontUrl, photo_side_url: sideUrl,
        photo_back_url: backUrl, photo_face_url: faceUrl,
      }).eq('id', diagnosis.id);

      // Fire-and-forget: let ProcessingStep handle progress & navigation, but persist immediate failures
      const handleInvokeFailure = async (err: { message?: string; context?: { status?: number }; code?: string } | null) => {
        console.error('Background processing error:', err);
        const status = err?.context?.status;
        let code = err?.code || 'generic';
        let message = err?.message || 'Falha ao iniciar processamento';
        if (status === 403) {
          code = 'no_subscription';
          message = 'Conta sem assinatura';
        } else if (status === 401) {
          code = 'unauthorized';
          message = 'Sessão expirada';
        }
        await supabase.from('diagnoses').update({
          status: 'failed',
          processing_step: 'error',
          final_diagnosis: { error: message, code },
        } as Record<string, unknown>).eq('id', diagnosis.id);
        if (code === 'plan_limit_reached') {
          toast.error(message, {
            action: { label: 'Ver planos', onClick: () => navigate('/pricing') },
            duration: 8000,
          });
          setCurrentStep(2);
          setIsProcessing(false);
        }
      };
      supabase.functions.invoke('process-diagnosis', {
        body: { diagnosisId: diagnosis.id, photos: { frontUrl, sideUrl, backUrl, faceUrl }, questionnaire },
      }).then(({ data, error }) => {
        if (error) return handleInvokeFailure(error as never);
        const code = (data as { code?: string } | null)?.code;
        if (code === 'no_subscription' || code === 'unauthorized') {
          return handleInvokeFailure({
            message: (data as { error?: string }).error || 'Erro',
            context: { status: code === 'no_subscription' ? 403 : 401 },
          });
        }
        if (code === 'plan_limit_reached') {
          return handleInvokeFailure({
            message: (data as { error?: string }).error || 'Limite do plano atingido',
            code,
          });
        }
      }).catch(handleInvokeFailure);


    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Erro ao processar diagnóstico. Tente novamente.');
      setCurrentStep(2);
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) setCurrentStep(2);
    else if (currentStep === 2 && canProceedStep2) handleStartProcessing();
  };

  const handleBack = () => {
    if (currentStep > 1 && !isProcessing) setCurrentStep(currentStep - 1);
  };

  return (
    <Layout>
      <div className="min-h-screen py-6 sm:py-8">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="font-serif font-bold text-gradient-gold mb-2">Novo Diagnóstico</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Complete as etapas para receber seu look personalizado</p>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between mb-4 gap-2">
              {steps.map((step) => (
                <div key={step.id} className={`flex flex-col items-center flex-1 min-w-0 ${step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-all text-sm sm:text-base ${
                    step.id < currentStep ? 'bg-primary border-primary text-primary-foreground'
                    : step.id === currentStep ? 'border-primary text-primary' : 'border-muted-foreground'
                  }`}>{step.id}</div>
                  <span className="text-xs sm:text-sm font-medium truncate max-w-full">{step.name}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2 bg-muted" />
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 md:p-8 shadow-xl">
            {currentStep === 1 && (
              <div>
                <PhotoUploadStep photos={photos} setPhotos={setPhotos} />
              </div>
            )}
            {currentStep === 2 && (
              <div>
                <QuestionnaireStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} />
              </div>
            )}
            {currentStep === 3 && (
              <ProcessingStep
                diagnosisId={diagnosisId}
                onComplete={(id) => {
                  toast.success('Diagnóstico concluído!');
                  navigate(`/diagnosis/${id}`);
                }}
              />
            )}
          </div>

          {!isProcessing && (
            <div className="flex justify-between gap-3 mt-6 sm:mt-8">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2 flex-1 sm:flex-none">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button variant="premium" onClick={handleNext} disabled={(currentStep === 1 && !canProceedStep1) || (currentStep === 2 && !canProceedStep2)} className="gap-2 flex-1 sm:flex-none">
                <span className="truncate">{currentStep === 2 ? 'Iniciar Análise' : 'Próximo'}</span> <ChevronRight className="w-4 h-4 shrink-0" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
