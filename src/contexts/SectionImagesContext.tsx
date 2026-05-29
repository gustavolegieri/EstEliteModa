import { createContext, useContext, ReactNode } from 'react';
import type { DiagnosticData } from '@/types/diagnostic';

export interface SectionImagesContextValue {
  /** Pre-generated server-stored URLs keyed by section id (legacy/fallback). */
  imagesMap?: Record<string, string> | null;
  /** Full diagnostic data used to build varied prompts. */
  diagnostic?: DiagnosticData | null;
}

const SectionImagesContext = createContext<SectionImagesContextValue>({});

export function SectionImagesProvider({
  value,
  children,
}: {
  value: SectionImagesContextValue;
  children: ReactNode;
}) {
  return <SectionImagesContext.Provider value={value || {}}>{children}</SectionImagesContext.Provider>;
}

export function useSectionImagesContext(): SectionImagesContextValue {
  return useContext(SectionImagesContext);
}

/** Legacy compat: just the imagesMap as a flat record. */
export function useSectionImagesMap(): Record<string, string> | null | undefined {
  return useContext(SectionImagesContext).imagesMap;
}
