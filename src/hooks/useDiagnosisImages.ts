import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ImagesMap = Map<string, string>;

function normalizeToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Loads clothing_images for THIS diagnosis only.
 * Images are no longer shared globally — each diagnosis gets its own set.
 */
export function useDiagnosisImages(diagnosisId: string | undefined, _pieceNames?: string[], refreshKey?: unknown): { imagesMap: ImagesMap; isLoading: boolean } {
  const [imagesMap, setImagesMap] = useState<ImagesMap>(new Map());
  const [isLoading, setIsLoading] = useState(Boolean(diagnosisId));
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const fetchKey = diagnosisId ? `${diagnosisId}:${String(refreshKey ?? 'initial')}` : null;
    if (!diagnosisId || !fetchKey || lastFetchedId.current === fetchKey) return;
    lastFetchedId.current = fetchKey;

    setIsLoading(true);

    supabase
      .from('clothing_images')
      .select('piece_key, normalized_key, image_url, prompt_used, category, color, fabric, style')
      .eq('diagnosis_id', diagnosisId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading diagnosis images:', error);
          setIsLoading(false);
          return;
        }

        const map = new Map<string, string>();
        for (const row of data || []) {
          if (!row.image_url) continue;
          [row.normalized_key, row.piece_key].forEach((value) => {
            const normalizedKey = normalizeToken(value);
            if (normalizedKey) map.set(normalizedKey, row.image_url);
          });
          const pieceKeyPrefix = String(row.piece_key || '').split('__')[0];
          const prefixKey = normalizeToken(pieceKeyPrefix);
          if (prefixKey) map.set(prefixKey, row.image_url);
        }
        setImagesMap(map);
        setIsLoading(false);
      });
  }, [diagnosisId, refreshKey]);

  return { imagesMap, isLoading };
}
