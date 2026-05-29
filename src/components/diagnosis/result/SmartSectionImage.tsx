import { useState } from 'react';
import { useSectionImagesContext } from '@/contexts/SectionImagesContext';
import { getSectionPrompt, buildPollinationsUrl, type SectionId } from '@/lib/imageService';
import { DiagnosticImage } from '@/components/DiagnosticImage';
import { useSectionInternetImage } from '@/hooks/useSectionInternetImage';

interface SmartSectionImageProps {
  section: SectionId;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  variant?: 'primary' | 'secondary';
}

/**
 * Renders the editorial image for a diagnosis section.
 * Priority:
 *   1. Real internet image (Pexels/Unsplash) tailored to the user's diagnosis.
 *   2. Server-stored URL (legacy fallback).
 *   3. AI generation (Pollinations) via <DiagnosticImage>.
 */
export function SmartSectionImage({
  section, alt, className, width, height, variant = 'primary',
}: SmartSectionImageProps) {
  const { imagesMap, diagnostic } = useSectionImagesContext();
  const { url: internetUrl, loading: internetLoading } = useSectionInternetImage(section, variant, diagnostic ?? null);
  const [imgFailed, setImgFailed] = useState(false);

  // 1. Internet image wins
  if (internetUrl && !imgFailed) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <img
          src={internetUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>
    );
  }

  // 2. Still searching the internet → skeleton
  if (internetLoading && diagnostic) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/20 to-card animate-pulse" aria-hidden />
        <p className="absolute inset-0 flex items-center justify-center text-[10px] font-sans uppercase tracking-widest text-muted-foreground/70 px-3 text-center">
          Buscando inspirações personalizadas…
        </p>
      </div>
    );
  }

  // 3. Fallback path (no diagnostic, or internet returned nothing)
  if (!diagnostic) {
    const stored = imagesMap?.[section];
    if (stored) {
      return (
        <div className={`relative overflow-hidden ${className ?? ''}`}>
          <img src={stored} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        </div>
      );
    }
    return <div className={`bg-muted/20 animate-pulse ${className ?? ''}`} aria-hidden />;
  }

  const spec = getSectionPrompt(section, variant, diagnostic);
  const w = width ?? spec.w;
  const h = height ?? spec.h;
  const storedVariant = imagesMap?.[`${section}_${variant}`] || imagesMap?.[`${section}:${variant}`];
  const storedLegacy = variant === 'primary' ? imagesMap?.[section] : undefined;
  const initialSrc = storedVariant || storedLegacy || buildPollinationsUrl(spec.prompt, w, h, spec.seed);

  return (
    <DiagnosticImage
      prompt={spec.prompt}
      seed={spec.seed}
      width={w}
      height={h}
      alt={alt}
      className={className}
      initialSrc={initialSrc}
      staticKey={`${diagnostic.userId}:${section}:${variant}`}
    />
  );
}
