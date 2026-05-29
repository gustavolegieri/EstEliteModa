import { Check, X } from 'lucide-react';
import { SmartSectionImage } from '@/components/diagnosis/result/SmartSectionImage';
import { motion } from 'framer-motion';

interface StyleData {
  estilo_predominante?: string;
  estilos_secundarios?: string[];
  descricao_estilo?: string;
  palavras_chave?: string[];
  referencias_visuais?: string;
  elementos_essenciais?: string[];
  elementos_evitar?: string[];
  dicas_estilo?: string[];
  [key: string]: unknown;
}

interface StyleSectionProps {
  data: Record<string, unknown>;
  colorSeason?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export function StyleSection({ data }: StyleSectionProps) {
  const d = data as StyleData;

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <p className="text-[10px] uppercase tracking-[0.4em] font-sans font-semibold text-primary mb-1.5">Identidade Visual</p>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Estilo Predominante</h2>
      </motion.div>

      {/* ── Hero: Style Name + Photo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex flex-col justify-center space-y-4">
          <h3 className="font-serif text-3xl md:text-4xl font-bold text-primary italic">
            {d.estilo_predominante || 'Analisando...'}
          </h3>

          {d.estilos_secundarios && d.estilos_secundarios.length > 0 && (
            <p className="text-sm font-sans text-muted-foreground">
              Secundários: <span className="text-foreground/80">{d.estilos_secundarios.join(', ')}</span>
            </p>
          )}

          {d.descricao_estilo && (
            <p className="text-sm font-sans leading-relaxed text-muted-foreground line-clamp-4">
              {d.descricao_estilo}
            </p>
          )}

          {d.palavras_chave && d.palavras_chave.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.palavras_chave.map((kw, i) => (
                <span key={i} className="text-[10px] font-sans px-3 py-1 rounded-full border border-primary/15 text-muted-foreground bg-card/60">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {d.referencias_visuais && (
            <div className="border-l-2 border-primary/30 pl-3">
              <p className="text-sm font-serif italic text-muted-foreground leading-relaxed line-clamp-2">
                {d.referencias_visuais}
              </p>
            </div>
          )}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
        >
          <SmartSectionImage section="estilo" alt={d.estilo_predominante || 'Estilo'} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
        </motion.div>
      </div>

      {/* ── Do / Don't ── */}
      {(d.elementos_essenciais?.length || d.elementos_evitar?.length) ? (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {d.elementos_essenciais && d.elementos_essenciais.length > 0 && (
            <div className="rounded-xl p-5 border border-primary/15 bg-card/40">
              <h4 className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 text-primary flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> Como Aplicar
              </h4>
              <ul className="space-y-2">
                {d.elementos_essenciais.slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.elementos_evitar && d.elementos_evitar.length > 0 && (
            <div className="rounded-xl p-5 border border-border/30 bg-card/40">
              <h4 className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 text-muted-foreground flex items-center gap-2">
                <X className="w-3.5 h-3.5 text-destructive/50" /> Evitar
              </h4>
              <ul className="space-y-2">
                {d.elementos_evitar.slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground/70 leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      ) : null}

      {/* ── Tips ── */}
      {d.dicas_estilo && d.dicas_estilo.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
          >
            <SmartSectionImage section="estilo" variant="secondary" alt="Dicas de estilo" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-background/5 to-transparent" />
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="flex flex-col justify-center space-y-3">
            <h4 className="text-sm font-serif font-bold text-foreground mb-1">Dicas de Estilo</h4>
            <div className="space-y-3">
              {d.dicas_estilo.slice(0, 4).map((dica, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-sm font-sans font-bold text-primary shrink-0">{i + 1}.</span>
                  <span className="text-sm leading-relaxed font-sans text-muted-foreground">{dica}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
