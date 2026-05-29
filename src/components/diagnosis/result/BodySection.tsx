import { BodySilhouette } from '@/components/diagnosis/result/BodySilhouette';
import { Ruler, Weight, Shirt, Sparkles, CheckCircle, Footprints } from 'lucide-react';
import { motion } from 'framer-motion';

interface BodyData {
  tipo_corporal?: string;
  descricao_tipo?: string;
  proporcoes?: Record<string, string>;
  pontos_fortes?: string[];
  pontos_de_atencao?: string[];
  silhueta_ideal?: string;
  dicas_gerais?: string[];
  caracteristicas_fisicas?: Record<string, string>;
  equilibrio_visual?: string;
  recomendacoes_modelagem?: string[];
  [key: string]: unknown;
}

interface BodySectionProps {
  data: Record<string, unknown>;
  photoUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  topSize?: string | null;
  bottomSize?: string | null;
  shoeSize?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  skinTone?: string | null;
  bodyNotes?: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

function formatHeight(cm: number): string {
  const m = Math.floor(cm / 100);
  const rest = Math.round(cm % 100);
  return `${m},${rest.toString().padStart(2, '0')}m`;
}

const bodyTypeEducation: Record<string, { description: string; characteristics: string[]; bestStyles: string[]; avoid: string[] }> = {
  'retângulo': {
    description: 'Ombros, cintura e quadris com medidas semelhantes, criando uma silhueta linear e equilibrada.',
    characteristics: ['Ombros e quadris na mesma largura', 'Cintura pouco definida', 'Silhueta reta e proporcional'],
    bestStyles: ['Cintos que marquem a cintura', 'Vestidos com corte em A', 'Saias com volume'],
    avoid: ['Roupas muito retas', 'Tecidos rígidos', 'Looks monocromáticos sem ponto focal'],
  },
  'ampulheta': {
    description: 'Biotipo mais proporcional, com ombros e quadris alinhados e cintura bem definida.',
    characteristics: ['Ombros e quadris proporcionais', 'Cintura bem marcada', 'Curvas naturais'],
    bestStyles: ['Roupas que acompanham as curvas', 'Vestidos envelope', 'Calças de cintura alta'],
    avoid: ['Roupas muito largas', 'Peças oversized sem cintura'],
  },
  'pera': {
    description: 'Quadris mais largos que os ombros, com cintura bem definida.',
    characteristics: ['Quadris mais largos', 'Cintura definida', 'Parte superior mais estreita'],
    bestStyles: ['Detalhes nos ombros', 'Calças retas ou bootcut', 'Cores claras em cima'],
    avoid: ['Saias justas no quadril', 'Calças skinny claras'],
  },
  'triângulo invertido': {
    description: 'Ombros mais largos que os quadris, com tronco em V.',
    characteristics: ['Ombros mais largos', 'Tronco em V', 'Pernas mais finas'],
    bestStyles: ['Calças e saias com volume', 'Decotes em V', 'Estampas na parte inferior'],
    avoid: ['Ombreiras', 'Gola alta justa'],
  },
  'oval': {
    description: 'Volume concentrado na região central do corpo.',
    characteristics: ['Volume na região abdominal', 'Ombros e quadris proporcionais', 'Pernas e braços mais finos'],
    bestStyles: ['Vestidos retos com caimento suave', 'Decotes em V', 'Linhas verticais'],
    avoid: ['Cintos apertados na cintura', 'Estampas horizontais'],
  },
};

function getBodyTypeInfo(tipo: string | undefined) {
  if (!tipo) return null;
  return bodyTypeEducation[tipo.toLowerCase().trim()] || null;
}

function toText(item: unknown): string {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object') {
    const values = Object.values(item as Record<string, unknown>).filter(v => typeof v === 'string' || typeof v === 'number');
    if (values.length) return values.map(String).join(' — ');
    try { return JSON.stringify(item); } catch { return ''; }
  }
  return String(item);
}

export function BodySection({ data, photoUrl, heightCm, weightKg, topSize, bottomSize, shoeSize, hairColor, eyeColor, skinTone, bodyNotes }: BodySectionProps) {
  const d = data as BodyData;
  const typeInfo = getBodyTypeInfo(d.tipo_corporal);

  const metrics = [
    heightCm && { icon: Ruler, label: 'Altura', value: formatHeight(heightCm) },
    weightKg && { icon: Weight, label: 'Peso', value: `${weightKg} kg` },
    topSize && { icon: Shirt, label: 'Tam. Superior', value: topSize },
    bottomSize && { icon: Shirt, label: 'Tam. Inferior', value: bottomSize },
    shoeSize && { icon: Footprints, label: 'Calçado', value: shoeSize },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  const coloringItems = [
    hairColor && { label: 'Cabelo', value: hairColor },
    eyeColor && { label: 'Olhos', value: eyeColor },
    skinTone && { label: 'Pele', value: skinTone },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Biotipo Corporal</h2>
        <p className="text-xs font-sans text-muted-foreground mt-1.5">Análise detalhada do seu tipo corporal</p>
      </motion.div>

      {/* ── Block 1: Body type + Photo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex flex-col justify-center space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-sans text-muted-foreground mb-1.5">Seu Biotipo</p>
            <h3 className="font-serif text-3xl font-bold text-primary italic">{d.tipo_corporal || 'Analisando...'}</h3>
          </div>

          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border/40 p-2.5 flex items-center gap-2 bg-card/40">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-sans text-muted-foreground">{label}</p>
                    <p className="text-xs font-serif font-bold text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(d.descricao_tipo || typeInfo?.description) && (
            <p className="text-sm font-sans leading-relaxed text-muted-foreground line-clamp-3">
              {d.descricao_tipo || typeInfo?.description}
            </p>
          )}

          {coloringItems.length > 0 && (
            <div className="flex gap-4">
              {coloringItems.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary/40" />
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-sans">{label}</p>
                    <p className="text-foreground font-medium text-xs">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3] bg-gradient-to-br from-card/60 via-background/40 to-card/20 flex items-center justify-center"
        >
          {/* Modelagem 2D — silhueta editorial */}
          <BodySilhouette bodyType={d.tipo_corporal || ''} className="py-4" />

          {/* Guias de proporção sutis */}
          <div className="absolute inset-y-8 left-2 hidden sm:flex flex-col justify-between text-[8px] uppercase tracking-[0.25em] font-sans text-primary/50">
            <span>Ombros</span>
            <span>Cintura</span>
            <span>Quadris</span>
          </div>

          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-3 right-3">
            <span className="inline-block px-2 py-0.5 rounded-md text-[8px] font-sans font-semibold uppercase tracking-widest bg-black/60 backdrop-blur-sm border border-primary/20 text-primary/80">
              Modelagem 2D
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
            <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-sans font-semibold uppercase tracking-widest bg-black/60 backdrop-blur-sm border border-primary/20 text-primary">
              {d.tipo_corporal || 'Biotipo'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Block 2: Strengths + Attention ── */}
      {((d.pontos_fortes?.length || typeInfo?.bestStyles?.length) || (d.pontos_de_atencao?.length || typeInfo?.avoid?.length)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(d.pontos_fortes?.length || typeInfo?.bestStyles?.length) ? (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="rounded-xl p-5 border border-primary/15 bg-card/40">
              <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> {d.pontos_fortes?.length ? 'Valorizar' : 'Estilos que Favorecem'}
              </h3>
              <ul className="space-y-2">
                {(d.pontos_fortes || typeInfo?.bestStyles || []).slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {toText(item)}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}

          {(d.pontos_de_atencao?.length || typeInfo?.avoid?.length) ? (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
              className="rounded-xl p-5 border border-border/30 bg-card/40">
              <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {d.pontos_de_atencao?.length ? 'Equilíbrio' : 'Evitar'}
              </h3>
              <ul className="space-y-2">
                {(d.pontos_de_atencao || typeInfo?.avoid || []).slice(0, 4).map((item, i) => (
                  <li key={i} className="text-sm font-sans text-muted-foreground/80 leading-relaxed flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                    {toText(item)}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </div>
      )}

      {/* ── Block 3: Proportions + Tips ── */}
      {(d.proporcoes && Object.keys(d.proporcoes).length > 0) || (d.dicas_gerais && d.dicas_gerais.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {d.proporcoes && Object.keys(d.proporcoes).length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="flex flex-col justify-center space-y-3">
              <h3 className="text-sm font-serif font-bold text-foreground">Proporções</h3>
              <div className="space-y-1.5">
                {Object.entries(d.proporcoes).map(([key, value]) => (
                  <p key={key} className="text-sm font-sans text-muted-foreground capitalize">
                    <span className="text-primary font-semibold">{key.replace(/_/g, ' ')}:</span> {toText(value)}
                  </p>
                ))}
              </div>
            </motion.div>
          )}

          {d.dicas_gerais && d.dicas_gerais.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="flex flex-col justify-center space-y-3">
              <h3 className="text-sm font-serif font-bold text-foreground">Recomendações</h3>
              <ul className="space-y-2">
                {d.dicas_gerais.slice(0, 4).map((dica, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm">
                    <span className="font-sans font-bold text-primary shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed font-sans text-muted-foreground">{toText(dica)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      ) : null}

      {/* ── Quote ── */}
      {(d.silhueta_ideal || d.equilibrio_visual) && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}
          className="rounded-xl px-5 py-3 border border-primary/10 bg-card/40 inline-flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-primary/40 shrink-0" />
          <span className="text-sm font-serif italic text-muted-foreground line-clamp-2">
            "{(d.silhueta_ideal || d.equilibrio_visual || '').toString()}"
          </span>
        </motion.div>
      )}

      {bodyNotes && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}
          className="border-l-2 border-primary/25 pl-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-wider mb-1 text-primary">Observações</p>
          <p className="text-sm leading-relaxed font-sans text-muted-foreground">{bodyNotes}</p>
        </motion.div>
      )}
    </div>
  );
}
