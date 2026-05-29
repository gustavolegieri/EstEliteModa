import { Ban } from 'lucide-react';
import { SmartSectionImage } from '@/components/diagnosis/result/SmartSectionImage';
import { motion } from 'framer-motion';

interface ModelingData {
  decotes_ideais?: string[];
  decotes_evitar?: string[];
  mangas_ideais?: string[];
  comprimentos_ideais?: { saias?: string; vestidos?: string; calcas?: string; [key: string]: string | undefined };
  cintura_ideal?: string;
  modelagens_superiores?: string[];
  modelagens_inferiores?: string[];
  tecidos_recomendados?: string[];
  tecidos_evitar?: string[];
  estampas_ideais?: string[];
  dicas_modelagem?: string[];
  [key: string]: unknown;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export function ModelingSection({ data, photoUrl }: { data: Record<string, unknown>; photoUrl?: string | null }) {
  const d = data as ModelingData;

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <p className="text-[10px] uppercase tracking-[0.4em] font-sans font-semibold text-primary mb-1.5">Guia Prático</p>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Modelagens Recomendadas</h2>
      </motion.div>

      {/* ── Block 1: Image + Upper/Lower ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
        >
          <SmartSectionImage section="modelagens" alt="Modelagens" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="flex flex-col justify-center space-y-5">
          {d.modelagens_superiores && d.modelagens_superiores.length > 0 && (
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground mb-2">Parte Superior</h3>
              <ul className="space-y-1.5">
                {d.modelagens_superiores.slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.modelagens_inferiores && d.modelagens_inferiores.length > 0 && (
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground mb-2">Parte Inferior</h3>
              <ul className="space-y-1.5">
                {d.modelagens_inferiores.slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Block 2: Details + Photo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col justify-center space-y-5">
          {(d.comprimentos_ideais || d.cintura_ideal) && (
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground mb-2">Comprimentos e Ajustes</h3>
              <div className="space-y-1">
                {d.cintura_ideal && (
                  <p className="text-sm font-sans text-muted-foreground">
                    <span className="text-primary font-semibold">Cintura:</span> {d.cintura_ideal}
                  </p>
                )}
                {d.comprimentos_ideais && Object.entries(d.comprimentos_ideais).map(([key, value]) => value && (
                  <p key={key} className="text-sm font-sans text-muted-foreground capitalize">
                    <span className="text-primary font-semibold">{key}:</span> {value}
                  </p>
                ))}
              </div>
            </div>
          )}

          {d.decotes_ideais && d.decotes_ideais.length > 0 && (
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground mb-1.5">Decotes Ideais</h3>
              <p className="text-sm font-sans text-muted-foreground">{d.decotes_ideais.join(' · ')}</p>
              {d.decotes_evitar && d.decotes_evitar.length > 0 && (
                <p className="text-xs font-sans text-destructive/60 mt-1 flex items-center gap-1.5">
                  <Ban className="w-3 h-3" /> Evitar: {d.decotes_evitar.join(', ')}
                </p>
              )}
            </div>
          )}

          {d.mangas_ideais && d.mangas_ideais.length > 0 && (
            <div>
              <h3 className="text-sm font-serif font-bold text-foreground mb-1.5">Mangas</h3>
              <p className="text-sm font-sans text-muted-foreground">{d.mangas_ideais.join(' · ')}</p>
            </div>
          )}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="Silhueta" className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
          ) : (
            <SmartSectionImage section="corpo" alt="Silhueta" className="absolute inset-0 w-full h-full object-cover object-top" />
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
        </motion.div>
      </div>

      {/* ── Block 3: Fabrics + Tips ── */}
      {((d.tecidos_recomendados?.length) || (d.estampas_ideais?.length) || (d.dicas_modelagem?.length)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}
            className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
          >
            <SmartSectionImage section="modelagens" variant="secondary" alt="Tecidos" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-background/5 to-transparent" />
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="flex flex-col justify-center space-y-5">
            {d.tecidos_recomendados && d.tecidos_recomendados.length > 0 && (
              <div>
                <h3 className="text-sm font-serif font-bold text-foreground mb-1.5">Tecidos Recomendados</h3>
                <p className="text-sm font-sans text-muted-foreground">{d.tecidos_recomendados.join(' · ')}</p>
                {d.tecidos_evitar && d.tecidos_evitar.length > 0 && (
                  <p className="text-xs font-sans text-destructive/60 mt-1 flex items-center gap-1.5">
                    <Ban className="w-3 h-3" /> Evitar: {d.tecidos_evitar.join(', ')}
                  </p>
                )}
              </div>
            )}

            {d.estampas_ideais && d.estampas_ideais.length > 0 && (
              <div>
                <h3 className="text-sm font-serif font-bold text-foreground mb-1.5">Estampas Ideais</h3>
                <p className="text-sm font-sans text-muted-foreground">{d.estampas_ideais.join(' · ')}</p>
              </div>
            )}

            {d.dicas_modelagem && d.dicas_modelagem.length > 0 && (
              <div>
                <h3 className="text-sm font-serif font-bold text-foreground mb-2">Recomendações</h3>
                <div className="space-y-2">
                  {d.dicas_modelagem.slice(0, 3).map((dica, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="text-sm font-sans font-bold text-primary shrink-0">{i + 1}.</span>
                      <span className="text-sm leading-relaxed font-sans text-muted-foreground">{dica}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
