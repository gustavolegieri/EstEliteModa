import { motion } from 'framer-motion';

interface BodySilhouetteProps {
  bodyType?: string;
  className?: string;
}

function getSilhouetteAsset(bodyType: string): { src: string; label: string } {
  const t = bodyType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('invertido')) return { src: '/assets/body/triangulo_invertido.svg', label: 'Triângulo Invertido' };
  if (t.includes('pera') || (t.includes('triangulo') && !t.includes('invertido'))) return { src: '/assets/body/pera.svg', label: 'Pêra' };
  if (t.includes('ampulheta') || t.includes('violao')) return { src: '/assets/body/ampulheta.svg', label: 'Ampulheta' };
  if (t.includes('oval') || t.includes('maca')) return { src: '/assets/body/oval.svg', label: 'Oval' };
  if (t.includes('retang')) return { src: '/assets/body/retangulo.svg', label: 'Retângulo' };
  return { src: '/assets/body/retangulo.svg', label: bodyType || 'Biotipo' };
}

export function BodySilhouette({ bodyType = '', className = '' }: BodySilhouetteProps) {
  const { src, label } = getSilhouetteAsset(bodyType);

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center w-full h-full min-h-[260px] ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Editorial backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-6 top-6 bottom-6 rounded-full bg-primary/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, hsl(var(--primary)) 0 1px, transparent 1px 48px)',
          }}
        />
      </div>

      <div className="relative flex items-center justify-center h-[260px] sm:h-[300px]">
        <img
          src={src}
          alt={`Silhueta ${label}`}
          className="h-full w-auto object-contain drop-shadow-[0_8px_24px_rgba(198,167,78,0.25)]"
        />
      </div>

      <p className="relative text-primary text-[10px] uppercase tracking-[0.3em] font-sans mt-2">
        {label}
      </p>
    </motion.div>
  );
}
