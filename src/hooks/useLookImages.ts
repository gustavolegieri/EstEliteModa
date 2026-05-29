import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LookImagesMap = Record<string, string>;

/**
 * Loads all look_images for a diagnosis in a single query.
 * Returns a map of look_name → image_url.
 */
export function useLookImages(diagnosisId: string | undefined, refreshKey?: unknown): { lookImagesMap: LookImagesMap; isLoading: boolean } {
  const [lookImagesMap, setLookImagesMap] = useState<LookImagesMap>({});
  const [isLoading, setIsLoading] = useState(Boolean(diagnosisId));
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const fetchKey = diagnosisId ? `${diagnosisId}:${String(refreshKey ?? 'initial')}` : null;
    if (!diagnosisId || !fetchKey || lastFetchedId.current === fetchKey) return;
    lastFetchedId.current = fetchKey;

    setIsLoading(true);

    supabase
      .from('look_images')
      .select('look_name, image_url')
      .eq('diagnosis_id', diagnosisId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading look images:', error);
          setIsLoading(false);
          return;
        }

        const map: LookImagesMap = {};
        for (const row of data || []) {
          map[row.look_name] = row.image_url;
        }
        setLookImagesMap(map);
        setIsLoading(false);
      });
  }, [diagnosisId, refreshKey]);

  return { lookImagesMap, isLoading };
}
