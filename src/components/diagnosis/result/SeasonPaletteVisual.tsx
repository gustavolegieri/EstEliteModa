import { motion } from 'framer-motion';

const colorMap: Record<string, string> = {
  'azul royal': '#4169E1', 'azul marinho': '#000080', 'azul': '#2563EB', 'azul claro': '#87CEEB',
  'azul petróleo': '#006D6F', 'azul noite': '#191970', 'azul gelo': '#D6F0FF', 'azul turquesa': '#40E0D0',
  'vermelho': '#DC2626', 'vermelho escuro': '#8B0000', 'vermelho queimado': '#CC3333',
  'borgonha': '#800020', 'vinho': '#722F37', 'marsala': '#964B00', 'bordô': '#800020',
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
  'lavanda': '#E6E6FA', 'menta': '#98FF98', 'marinho': '#000080', 'areia': '#C2B280',
};

// Curated fallback palettes by season, used only when AI did not provide colors.
const SEASON_PALETTES: Record<string, string[]> = {
  'primavera clara':     ['#FFF1D6','#FFD6A5','#FFB58B','#FF8FA3','#A8E6CF','#7EC8E3','#F7C59F','#FFEAA7'],
  'primavera quente':    ['#F6C28B','#E8A87C','#E27D60','#C38D9E','#85DCB0','#41B3A3','#FFD166','#EF8354'],
  'primavera brilhante': ['#FFB400','#FF5E5B','#00CECB','#FFED66','#D7F75B','#FF8C42','#7DCFB6','#F25F5C'],
  'verão suave':         ['#D9D2C5','#C3B5A4','#B0AFA2','#9CAFB7','#A7B4C2','#CBA9B4','#E1D7D8','#8DA1B9'],
  'verão frio':          ['#A8C7E0','#7FA9C9','#5C7AA8','#B7AFC9','#9189B6','#D6B7C2','#F3E6E8','#5B6FA0'],
  'verão claro':         ['#E8F1F2','#C7D9DD','#B5C9C9','#A7C5BD','#D0BDF4','#F2C0D2','#FBE7C6','#A7BED3'],
  'outono quente':       ['#F2D7A1','#E2B07A','#C97B4A','#B7410E','#7B3F00','#6B7A3C','#A68A3F','#3E2723'],
  'outono suave':        ['#D6C7A1','#B7A57A','#8B7355','#A47551','#9CA577','#6F7D5B','#C9AE7E','#7A6A53'],
  'outono profundo':     ['#7B2D26','#6B3F19','#3E2723','#5E4B3B','#8A5A2B','#B7410E','#4B5320','#2E2A1F'],
  'inverno profundo':    ['#0A0A0A','#FAFAFA','#7A0F2B','#1B2A4E','#0F4C5C','#3D0E61','#C00021','#1F3A93'],
  'inverno frio':        ['#0A0A0A','#FAFAFA','#1F3A93','#C0C0C0','#8E0D2E','#2C3E50','#5D3FD3','#D6F0FF'],
  'inverno brilhante':   ['#0A0A0A','#FAFAFA','#E60026','#0033A0','#00A86B','#FF1493','#FFD700','#5D3FD3'],
};

function normSeason(s?: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function findHex(name: string): string {
  const lower = name.toLowerCase().trim();
  if (colorMap[lower]) return colorMap[lower];
  for (const [k, hex] of Object.entries(colorMap)) if (lower.includes(k)) return hex;
  let h = 0;
  for (let i = 0; i < lower.length; i++) h = lower.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 45%, 50%)`;
}

function paletteForSeason(season?: string, subtipo?: string): string[] {
  const full = normSeason(`${season || ''} ${subtipo || ''}`);
  for (const key of Object.keys(SEASON_PALETTES)) {
    const nk = normSeason(key);
    if (full.includes(nk)) return SEASON_PALETTES[key];
  }
  const s = normSeason(season);
  for (const key of Object.keys(SEASON_PALETTES)) {
    if (normSeason(key).startsWith(s)) return SEASON_PALETTES[key];
  }
  return ['#F5F5DC','#C2B280','#8B4513','#D4AF37','#E2725B','#0A0A0A','#FAFAFA','#722F37'];
}

interface Props {
  estacao?: string;
  subtipo?: string;
  colors?: string[]; // named colors from diagnosis, optional
}

/**
 * Deterministic, diagnosis-driven palette hero. Renders a generative SVG that
 * always reflects the user's identified season and palette colors — no AI
 * generation, no internet image required.
 */
export function SeasonPaletteVisual({ estacao, subtipo, colors }: Props) {
  const named = (colors || []).filter(Boolean);
  const fromNames = named.length >= 5 ? named.slice(0, 9).map(findHex) : null;
  const palette = fromNames ?? paletteForSeason(estacao, subtipo);
  const seasonLabel = [estacao, subtipo].filter(Boolean).join(' ');

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background to-muted/40 overflow-hidden">
      <svg viewBox="0 0 600 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-label={`Paleta ${seasonLabel}`}>
        {/* Soft backdrop circles */}
        <defs>
          {palette.slice(0, 4).map((c, i) => (
            <radialGradient key={i} id={`g-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.55" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        <circle cx="120" cy="100" r="180" fill="url(#g-0)" />
        <circle cx="480" cy="120" r="160" fill="url(#g-1)" />
        <circle cx="500" cy="380" r="200" fill="url(#g-2)" />
        <circle cx="100" cy="380" r="170" fill="url(#g-3)" />

        {/* Palette circles arranged in two arcs */}
        {palette.map((c, i) => {
          const cols = Math.min(palette.length, 8);
          const row = i < cols ? 0 : 1;
          const idx = i % cols;
          const spacing = 540 / Math.max(cols - 1, 1);
          const cx = 30 + idx * spacing;
          const cy = row === 0 ? 230 : 320;
          const r = row === 0 ? 38 : 28;
          return (
            <g key={`${c}-${i}`}>
              <circle cx={cx} cy={cy} r={r + 3} fill="rgba(255,255,255,0.15)" />
              <circle cx={cx} cy={cy} r={r} fill={c} stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
            </g>
          );
        })}
      </svg>

      {seasonLabel && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none"
        >
          <div className="bg-background/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-border/30">
            <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-muted-foreground">Sua cartela</p>
            <p className="font-serif text-sm md:text-base text-foreground capitalize leading-tight">{seasonLabel}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
