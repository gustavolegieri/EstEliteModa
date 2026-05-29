import { Ban } from 'lucide-react';
import { SmartSectionImage } from '@/components/diagnosis/result/SmartSectionImage';
import { SeasonPaletteVisual } from '@/components/diagnosis/result/SeasonPaletteVisual';
import { motion } from 'framer-motion';

const colorMap: Record<string, string> = {
  'azul royal': '#4169E1', 'azul marinho': '#000080', 'azul': '#2563EB', 'azul claro': '#87CEEB',
  'azul petróleo': '#006D6F', 'azul noite': '#191970', 'azul gelo': '#D6F0FF', 'azul turquesa': '#40E0D0',
  'vermelho': '#DC2626', 'vermelho escuro': '#8B0000', 'vermelho queimado': '#CC3333',
  'borgonha': '#800020', 'vinho': '#722F37', 'marsala': '#964B00',
  'preto': '#0A0A0A', 'branco': '#FAFAFA', 'off-white': '#FAF9F6',
  'creme': '#FFFDD0', 'bege': '#F5F5DC', 'bege areia': '#C2B280', 'nude': '#E3BC9A',
  'rosa': '#FF69B4', 'rosa chá': '#F4C2C2', 'rosa queimado': '#C97D7D', 'rosa pink': '#FF1493',
  'fúcsia': '#FF00FF', 'magenta': '#FF0090', 'rosa claro': '#FFB6C1', 'rosa antigo': '#BC8F8F',
  'roxo': '#800080', 'lilás': '#C8A2C8', 'violeta': '#8B00FF', 'ameixa': '#8E4585',
  'verde': '#22C55E', 'verde escuro': '#006400', 'verde esmeralda': '#50C878',
  'verde musgo': '#8A9A5B', 'verde oliva': '#808000', 'verde militar': '#4B5320', 'verde menta': '#98FF98',
  'amarelo': '#FACC15', 'dourado': '#D4AF37', 'ouro': '#FFD700', 'amarelo pastel': '#FDFD96',
  'laranja': '#FF8C00', 'laranja queimado': '#CC5500',
  'coral': '#FF7F50', 'salmão': '#FA8072',
  'terracota': '#E2725B', 'marrom': '#8B4513', 'marrom chocolate': '#3E2723',
  'chocolate': '#D2691E', 'caramelo': '#FFD59A', 'marrom café': '#6F4E37',
  'cinza': '#808080', 'cinza escuro': '#404040', 'cinza claro': '#C0C0C0',
  'cinza médio': '#6E6E6E', 'cinza chumbo': '#36454F', 'cinza azulado': '#6D8196',
  'prata': '#C0C0C0', 'turquesa': '#40E0D0', 'ciano': '#00BCD4', 'petróleo': '#006D6F',
  'mostarda': '#FFDB58', 'ferrugem': '#B7410E', 'pêssego': '#FFCBA4',
  'lavanda': '#E6E6FA', 'menta': '#98FF98',
  'marinho': '#000080', 'areia': '#C2B280',
  'neon verde': '#39FF14', 'neon rosa': '#FF6EC7', 'neon laranja': '#FF5F1F', 'neon amarelo': '#DFFF00',
  'lilás quente': '#D8A0D8',
  'rosa suave': '#F4C2C2', 'tons neutros': '#C8B89A', 'cores neon': '#39FF14', 'amarelo vibrante': '#FFD700',
  'bordô': '#800020',
};

function findColor(name: string): string {
  const lower = name.toLowerCase().trim();
  if (colorMap[lower]) return colorMap[lower];
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lower.includes(key)) return hex;
  }
  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 50%)`;
}

function ColorCircle({ name, avoid = false, size = 48 }: { name: string; avoid?: boolean; size?: number }) {
  const hex = findColor(name);
  const isLight = ['#FAFAFA', '#FAF9F6', '#FFFDD0', '#FFFFFF', '#F5F5DC', '#FDFD96'].includes(hex);
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="relative">
        <div className={`rounded-full shadow-md transition-transform duration-300 group-hover:scale-110 ${avoid ? 'opacity-60' : ''}`}
          style={{ width: size, height: size, backgroundColor: hex, border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.06)' }} />
        {avoid && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[2px] bg-destructive/60 rotate-45 rounded-full" style={{ width: size * 0.7 }} />
          </div>
        )}
      </div>
      <span className={`text-[9px] font-sans text-center leading-tight max-w-[64px] ${avoid ? 'text-destructive/50 line-through' : 'text-muted-foreground'}`}>{name}</span>
    </div>
  );
}

interface ColorData {
  estacao?: string; subtipo?: string; subtom_pele?: string; descricao_coloracao?: string;
  paleta_cores_ideais?: { neutros?: string[]; cores_base?: string[]; cores_destaque?: string[]; cores_maquiagem?: string[] };
  cores_evitar?: string[]; metais_ideais?: string; contraste_ideal?: string; dicas_coloracao?: string[]; cores_ideais?: string[];
  [key: string]: unknown;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

const paletteConfig = [
  { key: 'neutros', label: 'Neutros' },
  { key: 'cores_base', label: 'Cores Principais' },
  { key: 'cores_destaque', label: 'Acentos' },
  { key: 'cores_maquiagem', label: 'Maquiagem' },
];

export function ColorSection({ data }: { data: Record<string, unknown> }) {
  const d = data as ColorData;
  const paleta = d.paleta_cores_ideais;
  const hasPaleta = paleta && (paleta.neutros?.length || paleta.cores_base?.length || paleta.cores_destaque?.length || paleta.cores_maquiagem?.length);

  // Flatten all named colors from the AI palette for the deterministic visual.
  const flatColors: string[] = [
    ...(paleta?.neutros || []),
    ...(paleta?.cores_base || []),
    ...(paleta?.cores_destaque || []),
    ...(d.cores_ideais || []),
  ];

  const infoItems = [
    d.estacao && { label: 'Estação', value: `${d.estacao}${d.subtipo ? ` ${d.subtipo}` : ''}` },
    d.subtom_pele && { label: 'Subtom', value: d.subtom_pele },
    d.contraste_ideal && { label: 'Contraste', value: d.contraste_ideal },
    d.metais_ideais && { label: 'Metais', value: d.metais_ideais },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Seu universo de cores</h2>
        <p className="text-xs font-sans text-muted-foreground mt-1.5">Essas cores harmonizam com suas características naturais</p>
      </motion.div>

      {/* ── Block 1: Diagnosis-driven palette hero + Info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3] max-h-[280px] md:max-h-none w-full"
        >
          <SeasonPaletteVisual estacao={d.estacao} subtipo={d.subtipo} colors={flatColors} />
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="flex flex-col justify-center space-y-4">
          {infoItems.length > 0 && (
            <div className="border-l-2 border-primary/40 pl-4 space-y-2">
              {infoItems.map(({ label, value }) => (
                <p key={label} className="text-sm font-sans">
                  <span className="text-primary font-semibold">{label}</span>
                  <span className="text-muted-foreground"> — {value}</span>
                </p>
              ))}
            </div>
          )}

          {d.descricao_coloracao && (
            <p className="text-sm font-sans leading-relaxed text-muted-foreground line-clamp-4">{d.descricao_coloracao}</p>
          )}

          {d.dicas_coloracao && d.dicas_coloracao.length > 0 && (
            <div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-wider text-primary mb-2">Orientações</h4>
              <ul className="space-y-1.5">
                {d.dicas_coloracao.slice(0, 3).map((dica, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-primary" />
                    <span className="leading-relaxed font-sans text-muted-foreground line-clamp-2">{dica}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Block 2: Palettes + Season image ── */}
      {hasPaleta && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col justify-center space-y-6">
            {paletteConfig.map(({ key, label }) => {
              const items = (paleta as Record<string, string[]>)[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key}>
                  <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3 text-primary">{label}</h4>
                  <div className="flex flex-wrap gap-3">
                    {items.map((cor, i) => <ColorCircle key={i} name={cor} size={key === 'neutros' ? 48 : 44} />)}
                  </div>
                </div>
              );
            })}
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="relative rounded-2xl overflow-hidden border border-border/20 aspect-[4/3] max-h-[260px] md:max-h-none w-full"
          >
            <SmartSectionImage section="cores" alt={`Inspiração ${d.estacao || ''}`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/40 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-white/90 drop-shadow">Combinações recomendadas</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fallback flat list */}
      {!hasPaleta && d.cores_ideais && d.cores_ideais.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3 text-primary">Cores Recomendadas</h4>
          <div className="flex flex-wrap gap-3">
            {d.cores_ideais.map((cor, i) => <ColorCircle key={i} name={cor} />)}
          </div>
        </motion.div>
      )}

      {/* ── Colors to Avoid ── */}
      {d.cores_evitar && d.cores_evitar.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <h4 className="text-xs uppercase tracking-wider font-sans font-semibold mb-3 text-foreground flex items-center gap-2">
            <Ban className="w-3.5 h-3.5 text-destructive/40" /> Cores a Evitar
          </h4>
          <div className="flex flex-wrap gap-3">
            {d.cores_evitar.map((cor, i) => <ColorCircle key={i} name={cor} avoid />)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
