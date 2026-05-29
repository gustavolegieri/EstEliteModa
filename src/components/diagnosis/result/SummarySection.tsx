import { CheckCircle2, Ruler, Palette, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { SmartSectionImage } from '@/components/diagnosis/result/SmartSectionImage';

interface FinalDiagnosis {
  summary?: string;
  perfil_cliente?: string;
  principais_descobertas?: string[];
  transformacao_proposta?: string;
  proximos_passos?: string[];
  mensagem_final?: string;
  estrategia_imagem?: string[];
  [key: string]: unknown;
}

interface SummarySectionProps {
  data: FinalDiagnosis | null;
  photoUrl?: string | null;
  bodyType?: string;
  colorSeason?: string;
  stylePrimary?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export function SummarySection({ data, photoUrl, bodyType, colorSeason, stylePrimary }: SummarySectionProps) {
  const d = data || {};

  const strategyBullets = d.estrategia_imagem?.slice(0, 3) || d.principais_descobertas?.slice(0, 3);

  const profileItems = [
    bodyType && { icon: Ruler, label: 'Biotipo', value: bodyType },
    colorSeason && { icon: Palette, label: 'Estação', value: colorSeason },
    stylePrimary && { icon: Sparkles, label: 'Estilo', value: stylePrimary },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Diagnóstico de Imagem</h2>
        <p className="text-xs font-sans text-muted-foreground mt-1.5">Est Elite · Seu perfil completo</p>
      </motion.div>

      {/* ── Hero: Photo + Profile ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
        >
          <SmartSectionImage section="resumo" alt="Resumo" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
          {photoUrl && (
            <div className="absolute bottom-3 left-3">
              <div className="w-14 h-[72px] rounded-lg overflow-hidden border border-primary/30 shadow-lg">
                <img src={photoUrl} alt="Sua foto" className="w-full h-full object-cover object-top" loading="lazy" />
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="flex flex-col justify-center space-y-5">
          {profileItems.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {profileItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl px-3 py-2 border border-primary/20 bg-card/60 backdrop-blur-sm">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-sans text-muted-foreground uppercase tracking-wider">{label}</span>
                  <span className="text-xs font-serif font-bold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}

          {d.perfil_cliente && (
            <p className="text-sm font-sans leading-relaxed text-muted-foreground line-clamp-4">
              {typeof d.perfil_cliente === 'string'
                ? d.perfil_cliente
                : Object.values(d.perfil_cliente as Record<string, unknown>)
                    .filter(v => typeof v === 'string')
                    .join(' · ')}
            </p>
          )}

          {d.transformacao_proposta && typeof d.transformacao_proposta === 'string' && (
            <div className="border-l-2 border-primary/25 pl-4">
              <p className="text-sm font-serif italic leading-relaxed text-muted-foreground line-clamp-3">
                "{d.transformacao_proposta}"
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Strategy + Inspiration ── */}
      {(strategyBullets?.length || d.mensagem_final) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col justify-center space-y-4">
            {strategyBullets && strategyBullets.length > 0 && (
              <div>
                <h3 className="text-sm font-serif font-bold text-foreground mb-3">Direcionamento Estratégico</h3>
                <ul className="space-y-2.5">
                  {strategyBullets.map((item, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-sans text-muted-foreground line-clamp-2">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {d.mensagem_final && (
              <div className="rounded-xl p-4 border border-primary/10 bg-card/40">
                <Sparkles className="w-4 h-4 text-primary/40 mb-2" />
                <p className="text-sm font-serif italic leading-relaxed text-muted-foreground line-clamp-3">
                  "{d.mensagem_final}"
                </p>
              </div>
            )}
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3]"
          >
            <SmartSectionImage section="resumo" variant="secondary" alt="Inspiração" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
