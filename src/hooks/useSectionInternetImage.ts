import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStaticDiagnosticImage, setStaticDiagnosticImage } from '@/lib/diagnosticImageLoader';
import type { DiagnosticData } from '@/types/diagnostic';
import type { SectionId } from '@/lib/imageService';
import {
  BODY_TYPE_EN, FIT_EN, STYLE_EN, OCCASION_EN,
} from '@/lib/imageTranslations';

const SEASON_FOR_TONE: Record<string, string> = {
  'Muito Claro': 'soft summer',
  'Claro': 'light spring',
  'Médio': 'warm autumn',
  'Escuro': 'deep autumn',
  'Muito Escuro': 'deep winter',
};

const FORMALITY_EN: Record<string, string> = {
  'Casual': 'casual',
  'Smart Casual': 'smart casual',
  'Business Casual': 'business casual',
  'Formal': 'formal',
  'Black Tie': 'black tie',
};

const inflight = new Map<string, Promise<string | null>>();
const TIMEOUT_MS = 12000;

/** Stable 32-bit hash so the same diagnosis always picks the same image,
 *  but two different diagnoses get different picks. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function diagnosisFingerprint(d: DiagnosticData): string {
  return [
    d.userId,
    d.tipoCorporal,
    d.tomDePele,
    d.corCabelo,
    d.corOlhos,
    d.estiloPersonalidade,
    d.caimento,
    d.formalidade,
    d.ocasiao,
    d.clima,
    d.profissao,
    d.orcamento,
    d.altura,
    d.peso,
  ].map((v) => String(v ?? '')).join('|');
}

interface SectionQuery { primary: string; fallbacks: string[]; }

function buildSectionQuery(section: SectionId, variant: 'primary' | 'secondary', d: DiagnosticData): SectionQuery {
  const style = STYLE_EN[d.estiloPersonalidade] || 'modern minimalist';
  const body = BODY_TYPE_EN[d.tipoCorporal] || 'rectangle';
  const occasion = OCCASION_EN[d.ocasiao] || 'casual everyday';
  const fit = FIT_EN[d.caimento] || 'straight';
  const season = SEASON_FOR_TONE[d.tomDePele] || 'neutral';
  const formality = FORMALITY_EN[d.formalidade] || '';

  switch (section) {
    case 'resumo':
      return variant === 'primary'
        ? { primary: `${style} ${formality} women fashion editorial full body ${season} palette ${occasion}`,
            fallbacks: [`${style} women outfit editorial photography`, `${style} women fashion lookbook`] }
        : { primary: `${style} ${season} women lifestyle ${occasion} fashion`,
            fallbacks: [`${style} women fashion inspiration`, `women minimalist fashion lifestyle`] };
    case 'corpo':
      return { primary: `fashion outfit specifically for ${body} body type women ${style} ${fit} fit`,
        fallbacks: [`${body} body shape styling women fashion`, `women full body outfit ${style}`, `women fashion ${body} silhouette`] };
    case 'cores':
      return { primary: `${season} color palette fashion women clothing swatches`,
        fallbacks: [`${season} season palette outfit women`, `${season} fashion color combination women`, `women clothing ${season} tones`] };
    case 'estilo':
      return variant === 'primary'
        ? { primary: `${style} fashion inspiration women complete outfit ${season}`,
            fallbacks: [`${style} clean fashion women lookbook`, `${style} women aesthetic outfit`] }
        : { primary: `${style} fashion mood women aesthetic ${formality}`,
            fallbacks: [`${style} women editorial fashion`, `${style} fashion inspiration women`] };
    case 'modelagens':
      return variant === 'primary'
        ? { primary: `${fit} fit women trousers product flat lay fashion`,
            fallbacks: [`${fit} silhouette women pants product`, `${fit} cut women garment isolated`, `women ${fit} trousers flat lay`] }
        : { primary: `structured women skirt or wide leg pants ${style} fabric texture detail editorial`,
            fallbacks: [`women tailored skirt ${style} fashion detail`, `women flowy dress ${style} fabric drape`, `women blazer structured ${style} fashion close up`, `women ${style} garment fabric texture macro`] };
    case 'essenciais':
      return { primary: `${style} wardrobe essentials women capsule basics product flat lay`,
        fallbacks: [`${style} essential pieces women minimal wardrobe`, `women wardrobe basics ${style}`, `essential women clothing flat lay`] };
    case 'capsula':
      return { primary: `${style} capsule wardrobe outfit women ${occasion} ${season}`,
        fallbacks: [`${style} curated outfit women ${occasion}`, `${style} women complete look ${formality}`] };
    default:
      return { primary: `${style} women fashion ${occasion}`, fallbacks: [`${style} women outfit fashion`] };
  }
}

async function fetchEditorialImage(
  section: SectionId,
  q: SectionQuery,
  diagnosisId: string,
  seed: number,
): Promise<string | null> {
  const key = `editorial:${section}:${seed}:${q.primary}`;
  if (inflight.has(key)) return inflight.get(key)!;
  const promise = (async () => {
    const startedAt = Date.now();
    try {
      const result = await Promise.race<{ data: any; error: unknown } | { __timeout: true }>([
        supabase.functions.invoke('search-clothing-image', {
          body: { query: q.primary, fallbackQueries: q.fallbacks, section, mode: 'editorial', count: 1, diagnosisId, seed },
        }) as Promise<{ data: any; error: unknown }>,
        new Promise<{ __timeout: true }>((resolve) =>
          setTimeout(() => resolve({ __timeout: true }), TIMEOUT_MS),
        ),
      ]);
      if ('__timeout' in result) {
        console.warn(`[useSectionInternetImage] timeout [${section}] "${q.primary}"`);
        return null;
      }
      const url = result.data?.results?.[0]?.url || null;
      const score = result.data?.results?.[0]?.score;
      console.log(`[useSectionInternetImage] [${section}] "${q.primary}" seed=${seed} score=${score ?? 'n/a'} → ${url ? 'OK' : 'EMPTY'} in ${Date.now() - startedAt}ms`);
      return url;
    } catch (e) {
      console.warn(`[useSectionInternetImage] error [${section}]`, e);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

/**
 * Resolves a dynamic editorial image for a diagnosis section. Each section
 * uses a specialized AI validator (>=80) on the edge function side.
 */
export function useSectionInternetImage(
  section: SectionId,
  variant: 'primary' | 'secondary',
  diagnostic: DiagnosticData | null | undefined,
) {
  const fingerprint = useMemo(() => (diagnostic ? diagnosisFingerprint(diagnostic) : ''), [diagnostic]);
  const diagHash = useMemo(() => (fingerprint ? hashString(fingerprint) : 0), [fingerprint]);
  const seed = useMemo(
    () => (diagHash ? (diagHash ^ hashString(`${section}:${variant}`)) >>> 0 : 0),
    [diagHash, section, variant],
  );
  const cacheKey = diagnostic
    ? `${diagnostic.userId}:section_internet:${section}:${variant}:${diagHash}`
    : null;
  const initial = useMemo(() => (cacheKey ? getStaticDiagnosticImage(cacheKey) : null), [cacheKey]);
  const [url, setUrl] = useState<string | null>(initial);
  const [loading, setLoading] = useState(!initial && !!diagnostic);

  useEffect(() => {
    if (!diagnostic || !cacheKey) return;
    const cached = getStaticDiagnosticImage(cacheKey);
    if (cached) { setUrl(cached); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const q = buildSectionQuery(section, variant, diagnostic);
    void fetchEditorialImage(section, q, diagnostic.userId, seed).then((found) => {
      if (cancelled) return;
      if (found) {
        setStaticDiagnosticImage(cacheKey, found);
        setUrl(found);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cacheKey, section, variant, diagnostic, seed]);

  return { url, loading };
}

