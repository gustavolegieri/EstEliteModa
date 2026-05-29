import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Download, Share2, ArrowLeft, MessageCircle, User, Palette, Shirt, Scissors, ShoppingBag, LayoutGrid, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { PageTransition } from '@/components/layout/PageTransition';
import { SummarySection } from '@/components/diagnosis/result/SummarySection';
import { CapsuleSection } from '@/components/diagnosis/result/CapsuleSection';
import { ColorSection } from '@/components/diagnosis/result/ColorSection';
import { BodySection } from '@/components/diagnosis/result/BodySection';
import { EssentialsSection } from '@/components/diagnosis/result/EssentialsSection';
import { StyleSection } from '@/components/diagnosis/result/StyleSection';
import { ModelingSection } from '@/components/diagnosis/result/ModelingSection';
import { AnalysisSection } from '@/components/diagnosis/result/AnalysisSection';
import { getFastDiagnosticImageCandidateUrls, getStaticDiagnosticImage, preloadDiagnosticImageGroupsStrict, setStaticDiagnosticImage, warmupDiagnosticImages } from '@/lib/diagnosticImageLoader';

import { useDiagnosisImages } from '@/hooks/useDiagnosisImages';
import { useLookImages } from '@/hooks/useLookImages';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { Lock } from 'lucide-react';

import { SectionImagesProvider } from '@/contexts/SectionImagesContext';
import {
  normalizeOcasiao, normalizeClima, normalizeTipoCorporal, normalizeCaimento,
  normalizeFormalidade, normalizeTomDePele, normalizeEstilo,
  buildAllPrompts,
} from '@/lib/imageService';
import type { DiagnosticData } from '@/types/diagnostic';

import { motion } from 'framer-motion';



interface DiagnosisData {
  id: string;
  status: string;
  created_at: string;
  body_analysis: Record<string, unknown> | null;
  color_analysis: Record<string, unknown> | null;
  style_analysis: Record<string, unknown> | null;
  modeling_analysis: Record<string, unknown> | null;
  wardrobe_essentials: Record<string, unknown> | null;
  capsule_wardrobe: Record<string, unknown> | null;
  final_diagnosis: Record<string, unknown> | null;
  generated_images: Record<string, unknown> | null;
  share_token: string | null;
  updated_at?: string | null;
  photo_front_url: string | null;
  photo_side_url: string | null;
  photo_back_url: string | null;
  photo_face_url: string | null;
  questionnaire: Record<string, unknown> | null;
  height_cm: number | null;
  weight_kg: number | null;
  top_size: string | null;
  bottom_size: string | null;
  shoe_size: string | null;
  body_notes: string | null;
  hair_color: string | null;
  eye_color: string | null;
  skin_tone: string | null;
  fit_preference: string | null;
  formality_level: string | null;
  style_intensity_score: Record<string, number> | null;
  body_balance_score: Record<string, number> | null;
}

type SectionId = 'resumo' | 'corpo' | 'cores' | 'estilo' | 'modelagens' | 'essenciais' | 'capsula';

function normalizeImageToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function collectDiagnosisPieces(diagnosis: DiagnosisData): string[] {
  const names = new Set<string>();
  const add = (value: unknown) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) names.add(text);
  };
  const essentials = (diagnosis.wardrobe_essentials || {}) as Record<string, unknown>;
  Object.values(essentials).forEach((value) => {
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (typeof item === 'string') add(item);
      else if (item && typeof item === 'object') add((item as Record<string, unknown>).peca || (item as Record<string, unknown>).descricao);
    });
  });
  const capsule = (diagnosis.capsule_wardrobe || {}) as Record<string, unknown>;
  const pieces = (capsule.pecas_capsula || {}) as Record<string, unknown>;
  Object.values(pieces).forEach((value) => Array.isArray(value) && value.forEach(add));
  ['looks_trabalho', 'looks_casual', 'looks_eventos'].forEach((key) => {
    const looks = capsule[key];
    if (!Array.isArray(looks)) return;
    looks.forEach((look) => {
      const lookPieces = (look as Record<string, unknown>)?.pecas;
      if (Array.isArray(lookPieces)) lookPieces.forEach((piece) => String(piece).split(/\s*\+\s*/).forEach(add));
    });
  });
  return Array.from(names);
}

function hasPieceImage(imagesMap: Map<string, string>, pieceName: string, diagnosisId?: string): boolean {
  const key = normalizeImageToken(pieceName);
  if (!key) return true;
  if (diagnosisId && getStaticDiagnosticImage(`${diagnosisId}:piece:${key}`)) return true;
  if (imagesMap.has(key)) return true;
  return Array.from(imagesMap.keys()).some((storedKey) => storedKey.includes(key) || key.includes(storedKey));
}

function getPieceImage(imagesMap: Map<string, string>, pieceName: string, diagnosisId?: string): string | null {
  const key = normalizeImageToken(pieceName);
  if (!key) return null;
  const staticUrl = diagnosisId ? getStaticDiagnosticImage(`${diagnosisId}:piece:${key}`) : null;
  if (staticUrl) return staticUrl;
  const exact = imagesMap.get(key);
  if (exact) return exact;
  for (const [storedKey, url] of imagesMap.entries()) {
    if (storedKey.includes(key) || key.includes(storedKey)) return url;
  }
  return null;
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
}

export default function DiagnosisResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { access: planAccess } = usePlanAccess();
  const canPdf = planAccess?.is_admin || planAccess?.can_download_pdf || false;
  const canShare = planAccess?.is_admin || planAccess?.can_share || false;

  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('resumo');
  const [imagesReady, setImagesReady] = useState(false);
  const [imagesProgress, setImagesProgress] = useState({ loaded: 0, total: 0 });
  const [pieceAssetsReady, setPieceAssetsReady] = useState(false);
  const [lookAssetsReady, setLookAssetsReady] = useState(false);
  const [pieceRefresh, setPieceRefresh] = useState(0);
  const generatingPiecesRef = useRef<string>('');
  const imageRefreshKey = `${diagnosis?.updated_at || ''}:${pieceRefresh}`;
  const { imagesMap, isLoading: imagesLoading } = useDiagnosisImages(diagnosis?.id, undefined, imageRefreshKey);
  const { lookImagesMap, isLoading: lookImagesLoading } = useLookImages(diagnosis?.id, imageRefreshKey);
  const requiredPieceNames = useMemo(() => diagnosis ? collectDiagnosisPieces(diagnosis) : [], [diagnosis]);
  const pieceImagesReady = !imagesLoading && requiredPieceNames.every((name) => hasPieceImage(imagesMap, name, diagnosis?.id));
  // Sem gate de imagens: o diagnóstico renderiza imediatamente e cada
  // imagem carrega de forma independente (skeleton + retry/fallback locais).
  void imagesReady; void pieceImagesReady; void pieceAssetsReady; void lookAssetsReady;


  useEffect(() => {
    // NÃO limpar mais o cache aqui — reutilizar URLs garante carregamento rápido
    // (Pollinations cacheia por URL no CDN). A variação é estável por diagnóstico.
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (id && user) fetchDiagnosis();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status === 'failed') return;
    const images = diagnosis.generated_images;
    const hasPersonalizedImages = images && Object.keys(images).length >= 7;
    if (diagnosis.status === 'completed' && hasPersonalizedImages) return;

    const timer = window.setTimeout(() => {
      fetchDiagnosis();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [diagnosis?.id, diagnosis?.status, diagnosis?.generated_images]);

  useEffect(() => {
    setImagesReady(false);
    setPieceAssetsReady(false);
    setLookAssetsReady(false);
    setImagesProgress({ loaded: 0, total: 0 });
    generatingPiecesRef.current = '';
  }, [diagnosis?.id]);

  // ── Warm-up: dispara em paralelo todas as URLs das seções para que o CDN
  // do Pollinations já tenha a imagem pronta quando o usuário trocar de aba.
  // Não muda prompt nem geração — só pré-carrega as mesmas URLs.
  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed' || !user?.id) return;
    try {
      const q = (diagnosis.questionnaire || {}) as Record<string, unknown>;
      const occ = Array.isArray((q as { occasions?: unknown }).occasions)
        ? ((q as { occasions: string[] }).occasions[0] ?? '')
        : (((q as { occasion?: string }).occasion) ?? '');
      const bodyType = (diagnosis.body_analysis as Record<string, unknown> | null)?.tipo_corporal as string | undefined;
      const estiloPredominante = (diagnosis.style_analysis as Record<string, unknown> | null)?.estilo_predominante as string | undefined;
      const d: DiagnosticData = {
        userId: diagnosis.id,
        estiloDeVida: ((q as { lifestyle?: string }).lifestyle) || '',
        profissao: ((q as { profession?: string }).profession) || '',
        ocasiao: normalizeOcasiao(occ),
        orcamento: 'R$ 500 - R$ 1.500',
        clima: normalizeClima((q as { climate?: string }).climate),
        altura: diagnosis.height_cm || 165,
        peso: diagnosis.weight_kg || 60,
        tamanhoSuperior: diagnosis.top_size || 'M',
        tamanhoInferior: diagnosis.bottom_size || '38',
        tipoCorporal: normalizeTipoCorporal(bodyType),
        caimento: normalizeCaimento(diagnosis.fit_preference),
        formalidade: normalizeFormalidade(diagnosis.formality_level),
        observacoesCorpo: diagnosis.body_notes || undefined,
        corCabelo: (diagnosis.hair_color || '').replace(/_/g, ' '),
        corOlhos: (diagnosis.eye_color || '').replace(/_/g, ' '),
        tomDePele: normalizeTomDePele(diagnosis.skin_tone),
        estiloPersonalidade: normalizeEstilo(estiloPredominante),
        objetivos: '',
      };
      const all = buildAllPrompts(d);
      const storedSectionImages = (diagnosis.generated_images || {}) as Record<string, string>;
      const buildGroup = (spec: { prompt: string; w: number; h: number; seed: number }, section: string, variant: string) => ({
        key: `${diagnosis.id}:${section}:${variant}`,
        urls: getFastDiagnosticImageCandidateUrls({
          prompt: spec.prompt,
          width: spec.w,
          height: spec.h,
          seed: spec.seed,
          initialSrc: storedSectionImages[`${section}_${variant}`] || storedSectionImages[`${section}:${variant}`] || (variant === 'primary' ? storedSectionImages[section] : undefined),
        }),
      });
      // 🔒 Gating MÍNIMO: apenas as imagens imediatamente visíveis na aba
      // inicial (Resumo). Outras secondary/extras seguem em warmup paralelo
      // e ficam prontas no cache até o usuário trocar de aba.
      const gatingGroups = [
        ...all.resumo.slice(0, 1).map((spec) => buildGroup(spec, 'resumo', 'primary')),
        ...all.corporal.slice(0, 1).map((spec) => buildGroup(spec, 'corpo', 'primary')),
        ...all.coloracao.slice(0, 1).map((spec) => buildGroup(spec, 'cores', 'primary')),
        ...all.estilo.slice(0, 1).map((spec) => buildGroup(spec, 'estilo', 'primary')),
        ...all.modelagens.slice(0, 1).map((spec) => buildGroup(spec, 'modelagens', 'primary')),
        ...all.essenciais.slice(0, 1).map((spec) => buildGroup(spec, 'essenciais', 'primary')),
        ...all.resumo.slice(1).map((spec) => buildGroup(spec, 'resumo', 'secondary')),
      ];
      // Não-bloqueante: demais abas (corpo/cores/estilo/modelagens/essenciais secondary + extras)
      const warmupGroups = [
        ...all.corporal.slice(1).map((spec, i) => buildGroup(spec, 'corpo', i === 0 ? 'secondary' : `extra-${i}`)),
        ...all.coloracao.slice(1).map((spec, i) => buildGroup(spec, 'cores', i === 0 ? 'secondary' : `extra-${i}`)),
        ...all.estilo.slice(1).map((spec) => buildGroup(spec, 'estilo', 'secondary')),
        ...all.modelagens.slice(1).map((spec) => buildGroup(spec, 'modelagens', 'secondary')),
        ...all.essenciais.slice(1).map((spec) => buildGroup(spec, 'essenciais', 'secondary')),
      ];
      setImagesProgress({ loaded: 0, total: gatingGroups.length });
      setImagesReady(false);
      // 🔥 Warm-up agressivo: gating + não-bloqueantes em paralelo
      warmupDiagnosticImages([...gatingGroups, ...warmupGroups].flatMap((g) => g.urls));
      let cancelled = false;
      preloadDiagnosticImageGroupsStrict(gatingGroups, (loaded, total) => {
        if (cancelled) return;
        setImagesProgress({ loaded, total });
      }).then(() => {
        if (!cancelled) setImagesReady(true);
      });
      return () => { cancelled = true; };


    } catch (err) {
      // silencioso — se falhar aqui, os outros bloqueios ainda seguram a tela de processamento
      console.warn('[warmup] failed', err);
    }
  }, [diagnosis?.id, diagnosis?.status, user?.id]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed') return;
    if (lookImagesLoading) {
      setLookAssetsReady(false);
      return;
    }
    setLookAssetsReady(false);
    let cancelled = false;
    const entries = Object.entries(lookImagesMap).filter(([, url]) => Boolean(url));
    preloadDiagnosticImageGroupsStrict(entries.map(([name, url]) => ({
      key: `${diagnosis.id}:look:${normalizeImageToken(name)}`,
      urls: [url],
    })), undefined).then(() => {
      if (!cancelled) setLookAssetsReady(true);
    });
    return () => { cancelled = true; };
  }, [diagnosis?.id, diagnosis?.status, lookImagesLoading, lookImagesMap]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed' || !imagesReady || imagesLoading) return;
    const missing = requiredPieceNames.filter((name) => !hasPieceImage(imagesMap, name, diagnosis.id));
    const readyUrls = requiredPieceNames
      .map((name) => ({ name, url: getPieceImage(imagesMap, name, diagnosis.id) }))
      .filter((item): item is { name: string; url: string } => Boolean(item.url));
    setPieceAssetsReady(false);
    if (missing.length === 0) {
      let cancelled = false;
      preloadDiagnosticImageGroupsStrict(readyUrls.map(({ name, url }) => ({
        key: `${diagnosis.id}:piece:${normalizeImageToken(name)}`,
        urls: [url],
      })), undefined).then(() => {
        if (!cancelled) setPieceAssetsReady(true);
      });
      return () => { cancelled = true; };
    }
    const batchKey = `${diagnosis.id}:${missing.map(normalizeImageToken).join('|')}`;
    if (generatingPiecesRef.current === batchKey) return;
    generatingPiecesRef.current = batchKey;
    let cancelled = false;
    (async () => {
      const generatedUrls: { name: string; url: string }[] = [];
      await Promise.all(missing.map(async (piece) => {
        try {
          const { data } = await supabase.functions.invoke('generate-look-image', {
            body: { pieces: [piece], singlePiece: true, diagnosisId: diagnosis.id },
          });
          if (cancelled) return;
          const imageUrl = (data as { imageUrl?: string } | null)?.imageUrl;
          if (imageUrl) {
            setStaticDiagnosticImage(`${diagnosis.id}:piece:${normalizeImageToken(piece)}`, imageUrl);
            generatedUrls.push({ name: piece, url: imageUrl });
          }
        } catch (error) {
          console.warn('piece image warmup failed', piece, error);
        }
      }));
      await preloadDiagnosticImageGroupsStrict(generatedUrls.map(({ name, url }) => ({
        key: `${diagnosis.id}:piece:${normalizeImageToken(name)}`,
        urls: [url],
      })), undefined);
      if (!cancelled) {
        setPieceRefresh((value) => value + 1);
        const allStatic = requiredPieceNames.every((name) => getPieceImage(imagesMap, name, diagnosis.id) || generatedUrls.some((item) => normalizeImageToken(item.name) === normalizeImageToken(name)));
        if (!allStatic) generatingPiecesRef.current = '';
        setPieceAssetsReady(allStatic);
      }
    })();
    return () => { cancelled = true; };
  }, [diagnosis?.id, diagnosis?.status, imagesReady, imagesLoading, requiredPieceNames, imagesMap]);


  const fetchDiagnosis = async () => {
    try {
      const { data, error } = await supabase.from('diagnoses').select('*').eq('id', id).single();
      if (error) throw error;
      setDiagnosis(data as unknown as DiagnosisData);
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      toast.error('Erro ao carregar diagnóstico');
      navigate('/account');
    } finally {
      setLoading(false);
    }
  };

  const generateShareToken = async (): Promise<string | null> => {
    if (!diagnosis) return null;
    if (diagnosis.share_token) return diagnosis.share_token;
    setSharing(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase.from('diagnoses').update({ share_token: token } as Record<string, unknown>).eq('id', diagnosis.id);
      if (error) throw error;
      setDiagnosis({ ...diagnosis, share_token: token });
      return token;
    } catch (err) {
      console.error('Error generating share token:', err);
      toast.error('Erro ao gerar link de compartilhamento');
      return null;
    } finally {
      setSharing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs font-sans text-muted-foreground uppercase tracking-widest animate-pulse">Carregando diagnóstico</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!diagnosis) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <p className="text-muted-foreground font-sans">Diagnóstico não encontrado</p>
          <Button variant="premium" onClick={() => navigate('/account')}>Voltar</Button>
        </div>
      </Layout>
    );
  }

  if (diagnosis.status !== 'completed') {
    const failed = diagnosis.status === 'failed';
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-5 text-center max-w-md w-full">
            {failed ? (
              <div className="w-16 h-16 rounded-full border border-destructive/30 bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive font-serif text-2xl">!</span>
              </div>
            ) : (
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="font-serif text-2xl text-foreground">
                {failed ? 'Diagnóstico não concluído' : 'Preparando seu diagnóstico'}
              </h1>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                {failed
                  ? 'Não foi possível finalizar este diagnóstico. Volte e tente gerar novamente.'
                  : 'Seu diagnóstico está sendo finalizado. As imagens serão carregadas individualmente assim que o resultado abrir.'}
              </p>
            </div>
            {failed && (
              <Button variant="premium" onClick={() => navigate('/account')}>
                Voltar
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const getShareUrl = (token: string) => `${window.location.origin}/diagnosis/share/${token}`;

  const handleShare = async () => {
    const token = await generateShareToken();
    if (!token) return;
    const url = getShareUrl(token);
    if (navigator.share) { try { await navigator.share({ title: 'Meu Diagnóstico EST ELITE', url }); } catch { return; } }
    else { await navigator.clipboard.writeText(url); toast.success('Link copiado!'); }
  };

  const handleShareWhatsApp = async () => {
    const token = await generateShareToken();
    if (!token) return;
    const url = getShareUrl(token);
    const text = encodeURIComponent(`✨ Confira meu diagnóstico de estilo pessoal na EST ELITE!\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    toast.info('Gerando PDF Premium...');
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;
      const ensureSpace = (needed: number) => { if (y + needed > pageHeight - margin) { pdf.addPage(); pdf.setFillColor(26, 26, 26); pdf.rect(0, 0, pageWidth, pageHeight, 'F'); y = margin; } };
      const addText = (text: string, size: number, color: [number, number, number] = [220, 220, 220], bold = false) => {
        pdf.setFontSize(size); pdf.setTextColor(...color); pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, contentWidth);
        for (const line of lines) { ensureSpace(size * 0.5); pdf.text(line, margin, y); y += size * 0.45; }
      };
      pdf.setFillColor(26, 26, 26); pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 40;
      addText('EST ELITE', 28, [212, 175, 55], true); y += 4;
      addText('Diagnóstico de Estilo Pessoal', 14, [180, 180, 180]); y += 8;
      addText(`Criado em ${new Date(diagnosis.created_at).toLocaleDateString('pt-BR')}`, 10, [150, 150, 150]); y += 12;
      if (diagnosis.height_cm || diagnosis.weight_kg) {
        ensureSpace(20);
        addText('Características Corporais', 14, [212, 175, 55], true); y += 2;
        pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(0.3); pdf.line(margin, y, pageWidth - margin, y); y += 5;
        if (diagnosis.height_cm) addText(`Altura: ${diagnosis.height_cm}cm`, 10);
        if (diagnosis.weight_kg) addText(`Peso: ${diagnosis.weight_kg}kg`, 10);
        if (diagnosis.top_size) addText(`Tamanho Superior: ${diagnosis.top_size}`, 10);
        if (diagnosis.bottom_size) addText(`Tamanho Inferior: ${diagnosis.bottom_size}`, 10);
        if (diagnosis.shoe_size) addText(`Calçado: ${diagnosis.shoe_size}`, 10);
        if (diagnosis.hair_color) addText(`Cabelo: ${diagnosis.hair_color}`, 10);
        if (diagnosis.eye_color) addText(`Olhos: ${diagnosis.eye_color}`, 10);
        if (diagnosis.skin_tone) addText(`Pele: ${diagnosis.skin_tone}`, 10);
        y += 6;
      }
      const renderValue = (value: unknown, indent = 0) => {
        if (value === null || value === undefined) return;
        const prefix = '  '.repeat(indent);
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') { addText(`${prefix}${String(value)}`, 10); return; }
        if (Array.isArray(value)) { value.forEach((item) => { if (typeof item === 'object' && item !== null) { Object.entries(item as Record<string, unknown>).forEach(([k, v]) => { addText(`${prefix}• ${formatKey(k)}:`, 10, [212, 175, 55], true); renderValue(v, indent + 1); }); y += 2; } else { addText(`${prefix}• ${String(item)}`, 10); } }); return; }
        if (typeof value === 'object') { Object.entries(value as Record<string, unknown>).forEach(([k, v]) => { addText(`${prefix}${formatKey(k)}:`, 10, [212, 175, 55], true); renderValue(v, indent + 1); }); }
      };
      const sections = [
        { label: 'Resumo Final', data: diagnosis.final_diagnosis },
        { label: 'Análise Corporal', data: diagnosis.body_analysis },
        { label: 'Análise de Cores', data: diagnosis.color_analysis },
        { label: 'Análise de Estilo', data: diagnosis.style_analysis },
        { label: 'Guia de Modelagens', data: diagnosis.modeling_analysis },
        { label: 'Peças Essenciais', data: diagnosis.wardrobe_essentials },
        { label: 'Guarda-Roupa Cápsula', data: diagnosis.capsule_wardrobe },
      ];
      for (const section of sections) {
        if (!section.data || (section.data as Record<string, unknown>).error) continue;
        ensureSpace(20); addText(section.label, 14, [212, 175, 55], true); y += 2;
        pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(0.3); pdf.line(margin, y, pageWidth - margin, y); y += 5;
        renderValue(section.data); y += 6;
      }
      y = pageHeight - 15;
      addText('EST ELITE — Diagnóstico de Estilo com IA', 8, [120, 120, 120]);
      pdf.save(`diagnostico-est-elite-${diagnosis.id.slice(0, 8)}.pdf`);
      toast.success('PDF Premium baixado!');
    } catch (err) { console.error('PDF error:', err); toast.error('Erro ao gerar PDF'); }
  };

  const isValid = (data: Record<string, unknown> | null) => data && !(data as Record<string, unknown>).error;

  const bodyType = (diagnosis.body_analysis as Record<string, unknown> | null)?.tipo_corporal as string | undefined;
  const colorSeason = (diagnosis.color_analysis as Record<string, unknown> | null)?.estacao_cor as string | undefined;
  const estacaoCor = (diagnosis.color_analysis as Record<string, unknown> | null)?.estacao as string | undefined;
  const estiloPredominante = (diagnosis.style_analysis as Record<string, unknown> | null)?.estilo_predominante as string | undefined;

  const capsuleData = diagnosis.capsule_wardrobe as Record<string, unknown> | null;
  const pecas = (capsuleData?.pecas_capsula || {}) as Record<string, unknown>;
  const topsCount = Array.isArray(pecas.tops) ? pecas.tops.length : 0;
  const bottomsCount = Array.isArray(pecas.bottoms) ? pecas.bottoms.length : 0;
  const tercasCount = Array.isArray(pecas.tercas_pecas) ? pecas.tercas_pecas.length : 0;
  const calculatedCombinations = topsCount * Math.max(bottomsCount, 1) * Math.max(tercasCount, 1);

  const sectionButtons: Array<{ id: SectionId; label: string; shortLabel: string; icon: React.ElementType; enabled: boolean }> = [
    { id: 'resumo', label: 'Resumo', shortLabel: 'Resumo', icon: Sparkles, enabled: isValid(diagnosis.final_diagnosis) as boolean },
    { id: 'corpo', label: 'Corporal', shortLabel: 'Corpo', icon: User, enabled: isValid(diagnosis.body_analysis) as boolean },
    { id: 'cores', label: 'Coloração', shortLabel: 'Cores', icon: Palette, enabled: isValid(diagnosis.color_analysis) as boolean },
    { id: 'estilo', label: 'Estilo', shortLabel: 'Estilo', icon: Shirt, enabled: isValid(diagnosis.style_analysis) as boolean },
    { id: 'modelagens', label: 'Modelagens', shortLabel: 'Molde', icon: Scissors, enabled: isValid(diagnosis.modeling_analysis) as boolean },
    { id: 'essenciais', label: 'Essenciais', shortLabel: 'Peças', icon: ShoppingBag, enabled: isValid(diagnosis.wardrobe_essentials) as boolean },
    { id: 'capsula', label: 'Guarda-Roupa', shortLabel: 'Cápsula', icon: LayoutGrid, enabled: isValid(diagnosis.capsule_wardrobe) as boolean },
  ];

  const availableSections = sectionButtons.filter(section => section.enabled);
  const currentSection = availableSections.some(section => section.id === activeSection)
    ? activeSection
    : (availableSections[0]?.id ?? 'resumo');

  const renderSection = (sectionId: SectionId) => {
    switch (sectionId) {
      case 'resumo':
        return isValid(diagnosis.final_diagnosis)
          ? <SummarySection data={diagnosis.final_diagnosis as Record<string, unknown> & { summary?: string; principais_descobertas?: string[]; mensagem_final?: string }} bodyType={bodyType} colorSeason={estacaoCor} stylePrimary={estiloPredominante} />
          : <AnalysisSection data={diagnosis.final_diagnosis} label="Resumo" />;
      case 'corpo':
        return isValid(diagnosis.body_analysis)
          ? <BodySection data={diagnosis.body_analysis!} heightCm={diagnosis.height_cm} weightKg={diagnosis.weight_kg} topSize={diagnosis.top_size} bottomSize={diagnosis.bottom_size} shoeSize={diagnosis.shoe_size} hairColor={diagnosis.hair_color} eyeColor={diagnosis.eye_color} skinTone={diagnosis.skin_tone} bodyNotes={diagnosis.body_notes} />
          : <AnalysisSection data={diagnosis.body_analysis} label="Análise Corporal" />;
      case 'cores':
        return isValid(diagnosis.color_analysis)
          ? <ColorSection data={diagnosis.color_analysis!} />
          : <AnalysisSection data={diagnosis.color_analysis} label="Coloração" />;
      case 'estilo':
        return isValid(diagnosis.style_analysis)
          ? <StyleSection data={diagnosis.style_analysis!} colorSeason={colorSeason} />
          : <AnalysisSection data={diagnosis.style_analysis} label="Estilo" />;
      case 'modelagens':
        return isValid(diagnosis.modeling_analysis)
          ? <ModelingSection data={diagnosis.modeling_analysis!} />
          : <AnalysisSection data={diagnosis.modeling_analysis} label="Modelagens" />;
      case 'essenciais':
        return isValid(diagnosis.wardrobe_essentials)
          ? <EssentialsSection data={diagnosis.wardrobe_essentials!} diagnosisId={diagnosis.id} imagesMap={imagesMap} imagesLoading={imagesLoading} />
          : <AnalysisSection data={diagnosis.wardrobe_essentials} label="Essenciais" />;
      case 'capsula':
        return isValid(diagnosis.capsule_wardrobe)
          ? <CapsuleSection data={diagnosis.capsule_wardrobe!} combinations={calculatedCombinations} diagnosisId={diagnosis.id} imagesMap={imagesMap} imagesLoading={imagesLoading} lookImagesMap={lookImagesMap} lookImagesLoading={lookImagesLoading} />
          : <AnalysisSection data={diagnosis.capsule_wardrobe} label="Cápsula" />;
      default:
        return null;
    }
  };

  const sectionImagesMap = diagnosis.generated_images
    ? { ...(diagnosis.generated_images as Record<string, string>) }
    : null;

  // Build DiagnosticData for the new image prompt builders
  const q = (diagnosis.questionnaire || {}) as Record<string, unknown>;
  const occ = Array.isArray((q as { occasions?: unknown }).occasions)
    ? ((q as { occasions: string[] }).occasions[0] ?? '')
    : (((q as { occasion?: string }).occasion) ?? '');
  const diagnostic: DiagnosticData = {
    userId: diagnosis.id,
    estiloDeVida: ((q as { lifestyle?: string }).lifestyle) || '',
    profissao: ((q as { profession?: string }).profession) || '',
    ocasiao: normalizeOcasiao(occ),
    orcamento: 'R$ 500 - R$ 1.500',
    clima: normalizeClima((q as { climate?: string }).climate),
    altura: diagnosis.height_cm || 165,
    peso: diagnosis.weight_kg || 60,
    tamanhoSuperior: diagnosis.top_size || 'M',
    tamanhoInferior: diagnosis.bottom_size || '38',
    tipoCorporal: normalizeTipoCorporal(bodyType),
    caimento: normalizeCaimento(diagnosis.fit_preference),
    formalidade: normalizeFormalidade(diagnosis.formality_level),
    observacoesCorpo: diagnosis.body_notes || undefined,
    corCabelo: (diagnosis.hair_color || '').replace(/_/g, ' '),
    corOlhos: (diagnosis.eye_color || '').replace(/_/g, ' '),
    tomDePele: normalizeTomDePele(diagnosis.skin_tone),
    estiloPersonalidade: normalizeEstilo(estiloPredominante),
    objetivos: '',
  };

  return (
    <SectionImagesProvider value={{ imagesMap: sectionImagesMap, diagnostic }}>

    <PageTransition>
      <Layout showFooter={false}>
        <div className="min-h-screen bg-background text-foreground">
          {/* ── Sticky Header ── */}
          <div className="sticky top-16 z-30 border-b border-border/30 backdrop-blur-xl bg-background/80">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <button onClick={() => navigate('/account')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-sans text-xs tracking-wide">Voltar</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <span className="hidden md:inline font-sans">
                  {new Date(diagnosis.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="flex gap-1.5">
                {canShare ? (
                  <>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary h-8" onClick={handleShareWhatsApp} disabled={sharing}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">WhatsApp</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary h-8" onClick={handleShare} disabled={sharing}>
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Compartilhar</span>
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground/60 hover:text-primary h-8" onClick={() => { toast.info('Compartilhamento disponível no plano Elite.', { action: { label: 'Ver planos', onClick: () => navigate('/pricing') } }); }}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Compartilhar</span>
                  </Button>
                )}
                {canPdf ? (
                  <Button size="sm" variant="premium" className="gap-1.5 text-xs h-8" onClick={handleDownloadPDF}>
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">PDF</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="premium" className="gap-1.5 text-xs h-8 opacity-80" onClick={() => { toast.info('Download em PDF disponível nos planos Premium e Elite.', { action: { label: 'Fazer upgrade', onClick: () => navigate('/pricing') } }); }}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">PDF</span>
                  </Button>
                )}
              </div>

            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
            {/* ── Tab Navigation ── */}
            <div className="mb-8 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              <nav className="flex gap-1 min-w-max p-1 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm" role="tablist">
                {availableSections.map(({ id, label, shortLabel, icon: Icon }) => {
                  const isActive = currentSection === id;
                  return (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveSection(id)}
                      className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-sans font-medium transition-all duration-300 whitespace-nowrap ${
                        isActive
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBg"
                          className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/25"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{shortLabel}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ── Content ── */}
            <div className="relative">
              {availableSections.map((section) => {
                const isActive = currentSection === section.id;
                return (
                  <motion.section
                    key={section.id}
                    role="tabpanel"
                    aria-hidden={!isActive}
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 8 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`${isActive ? 'relative z-10' : 'absolute inset-x-0 top-0 z-0 pointer-events-none'} rounded-2xl border border-border/10 p-4 sm:p-6 md:p-8`}
                    style={{ background: 'linear-gradient(180deg, hsl(var(--card) / 0.3) 0%, hsl(var(--background)) 100%)' }}
                  >
                    {renderSection(section.id)}
                  </motion.section>
                );
              })}
            </div>

            {/* ── Footer branding ── */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center mt-12 pt-8 border-t border-border/10"
            >
              <p className="text-primary/40 font-serif text-sm tracking-widest">EST ELITE</p>
              <p className="text-muted-foreground/30 text-xs mt-1">Diagnóstico de estilo com inteligência artificial</p>
            </motion.div>
          </div>
        </div>
      </Layout>
    </PageTransition>
    </SectionImagesProvider>
  );
}
