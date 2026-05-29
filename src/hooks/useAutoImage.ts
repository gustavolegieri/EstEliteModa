import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ImagesMap } from './useDiagnosisImages';
import { getStaticDiagnosticImage, setStaticDiagnosticImage } from '@/lib/diagnosticImageLoader';

const fetchInFlight = new Map<string, Promise<string | null>>();
const FETCH_TIMEOUT_MS = 15000;

function normalizeToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildPollinationsFallbackUrl(pieceName: string, category?: string, seed?: number): string {
  const cat = category ? `${category} ` : "";
  const prompt = `Single ${cat}fashion product, luxury flat-lay on pure white background, women's wear, photorealistic catalog: ${pieceName}`.slice(0, 400);
  const s = seed ?? Math.floor(Math.random() * 1_000_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${s}&model=turbo&nologo=true&enhance=false&private=true&safe=true`;
}

async function searchInternetImage(
  pieceName: string,
  diagnosisId: string,
  category?: string,
): Promise<string | null> {
  const startedAt = Date.now();
  try {
    const query = category ? `${pieceName} ${category}` : pieceName;
    const result = await Promise.race<{ data: any; error: unknown } | { __timeout: true }>([
      supabase.functions.invoke('search-clothing-image', {
        body: { query, count: 1, diagnosisId },
      }) as Promise<{ data: any; error: unknown }>,
      new Promise<{ __timeout: true }>((resolve) =>
        setTimeout(() => resolve({ __timeout: true }), 10000),
      ),
    ]);
    if ('__timeout' in result) {
      console.warn(`[useAutoImage] search timeout piece="${pieceName}"`);
      return null;
    }
    const url = result.data?.results?.[0]?.url || null;
    if (url) {
      console.log(`[useAutoImage] internet piece="${pieceName}" src=${result.data?.results?.[0]?.source} in ${Date.now() - startedAt}ms`);
      return url;
    }
    console.warn(`[useAutoImage] search empty piece="${pieceName}" in ${Date.now() - startedAt}ms`);
    return null;
  } catch (err) {
    console.warn(`[useAutoImage] search error piece="${pieceName}"`, err);
    return null;
  }
}

async function fetchClothingImage(
  pieceName: string,
  diagnosisId: string,
  category?: string,
  nonce?: number,
): Promise<string | null> {
  const key = `${diagnosisId}:${normalizeToken(pieceName)}:${normalizeToken(category)}:${nonce ?? 0}`;
  if (fetchInFlight.has(key)) return fetchInFlight.get(key)!;

  const promise = (async () => {
    // PRIMARY: real internet image search (Pexels → Unsplash), category-aware filter
    const internetUrl = await searchInternetImage(pieceName, diagnosisId, category);
    if (internetUrl) {
      fetchInFlight.delete(key);
      return internetUrl;
    }

    // FALLBACK: AI generation cascade
    const startedAt = Date.now();
    try {
      const result = await Promise.race<{ data: { imageUrl?: string } | null; error: unknown } | { __timeout: true }>([
        supabase.functions.invoke('generate-look-image', {
          body: {
            pieces: [pieceName],
            singlePiece: true,
            diagnosisId,
            ...(category ? { metadata: { category } } : {}),
            ...(nonce ? { nonce } : {}),
          },
        }) as Promise<{ data: { imageUrl?: string } | null; error: unknown }>,
        new Promise<{ __timeout: true }>((resolve) =>
          setTimeout(() => resolve({ __timeout: true }), FETCH_TIMEOUT_MS),
        ),
      ]);

      if ('__timeout' in result) {
        console.warn(`[useAutoImage] gen timeout piece="${pieceName}"`);
        return null;
      }
      if (result.error || !result.data?.imageUrl) {
        console.warn(`[useAutoImage] gen failed piece="${pieceName}" in ${Date.now() - startedAt}ms`, result.error);
        return null;
      }
      console.log(`[useAutoImage] gen ok piece="${pieceName}" in ${Date.now() - startedAt}ms`);
      return result.data.imageUrl as string;
    } catch (err) {
      console.warn(`[useAutoImage] gen error piece="${pieceName}"`, err);
      return null;
    } finally {
      fetchInFlight.delete(key);
    }
  })();

  fetchInFlight.set(key, promise);
  return promise;
}

/**
 * Resolves a clothing image for a piece scoped to a diagnosis.
 * - 15s hard timeout per request (no infinite loading).
 * - Exposes `retry()` so the UI can let the user retry manually.
 */
export function useAutoImage(pieceName: string | undefined, imagesMap?: ImagesMap, diagnosisId?: string, category?: string) {
  const normalizedName = useMemo(() => normalizeToken(pieceName), [pieceName]);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fetchedRef = useRef<string | null>(null);

  const staticUrl = useMemo(() => {
    if (!diagnosisId || !normalizedName) return null;
    return getStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`);
  }, [diagnosisId, normalizedName]);

  const cachedUrl = useMemo(() => {
    if (staticUrl) return staticUrl;
    if (!normalizedName || !imagesMap || imagesMap.size === 0) return null;
    const exact = imagesMap.get(normalizedName);
    if (exact) return exact;
    for (const [key, url] of imagesMap.entries()) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) return url;
    }
    return null;
  }, [staticUrl, normalizedName, imagesMap]);

  useEffect(() => {
    if (!diagnosisId || !normalizedName || !cachedUrl) return;
    setStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`, cachedUrl);
  }, [diagnosisId, normalizedName, cachedUrl]);

  useEffect(() => {
    setFallbackUrl(null);
    setHasFailed(false);
    fetchedRef.current = null;
  }, [normalizedName, diagnosisId]);

  useEffect(() => {
    if (!normalizedName || !pieceName || !diagnosisId || cachedUrl) return;
    const key = `${diagnosisId}:${normalizedName}:${normalizeToken(category)}:${attempt}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    setIsFetching(true);
    setHasFailed(false);
    // Pass attempt as nonce so retries bypass server cache
    fetchClothingImage(pieceName, diagnosisId, category, attempt > 0 ? attempt : undefined).then((url) => {
      // Final fallback: a direct Pollinations free URL so the slot is never empty
      const finalUrl = url || buildPollinationsFallbackUrl(pieceName, category, Date.now() + attempt);
      const isRealGen = !!url;
      if (isRealGen) setStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`, finalUrl);
      setFallbackUrl(finalUrl);
      setHasFailed(!isRealGen);
      setIsFetching(false);
    });
  }, [pieceName, normalizedName, cachedUrl, diagnosisId, category, attempt]);

  const retry = useCallback(() => {
    fetchedRef.current = null;
    setFallbackUrl(null);
    setHasFailed(false);
    setAttempt((v) => v + 1);
  }, []);

  return {
    imageUrl: cachedUrl || fallbackUrl,
    isLoading: isFetching,
    hasFailed,
    retry,
  };
}
