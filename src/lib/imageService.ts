// EST ELITE — Image service: deterministic-but-varied prompt builders.
//
// Strategy: positive-only prompts (Flux/diffusion invert negations), each tab
// has 3–5 radically different templates picked via hash(userId, ...keys) so
// the same user always sees the same images on refresh, but two different
// users always get different compositions.

import {
  BODY_TYPE_EN, FIT_EN, FORMALITY_EN, CLIMATE_FABRIC_EN,
  SKIN_TONE_EN, STYLE_EN, OCCASION_EN, STYLE_PALETTE,
  STYLE_PROPS, BODY_MODELAGEM, OCCASION_OUTFIT, SEASON_PALETTE,
} from "./imageTranslations";
import type {
  DiagnosticData, OcasiaoType, ClimaType, TipoCorporalType,
  CaimentoType, FormalidadeType, TomDePeleType, EstiloType,
} from "@/types/diagnostic";

// ─── Back-compat re-exports used by legacy hooks ───────────────────────────
export type SectionId = 'resumo' | 'corpo' | 'cores' | 'estilo' | 'modelagens' | 'essenciais' | 'capsula';

// ─── Utilitários ────────────────────────────────────────────────────────────

function hashSelect<T>(arr: T[], ...keys: string[]): T {
  const str = keys.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash * 31) + str.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}

function makeSeed(userId: string, tab: string, slot: number): number {
  const str = `${userId}-${tab}-${slot}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0;
  return h % 9999999;
}

export function buildPollinationsUrl(prompt: string, width: number, height: number, seed: number): string {
  const clean = (prompt || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  const encoded = encodeURIComponent(clean);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&enhance=true`;
}

// Legacy alias kept for any leftover import
export const buildImageUrl = buildPollinationsUrl;

// ─── Translation helpers for legacy piece lists ─────────────────────────────
const PT_TO_EN_PIECES: Record<string, string> = {
  'vestido': 'dress', 'blazer': 'blazer', 'casaco': 'coat', 'jaqueta': 'jacket',
  'camisa': 'shirt', 'blusa': 'blouse', 'top': 'top', 'cropped': 'cropped top',
  'camiseta': 't-shirt', 'regata': 'tank top', 'calça': 'trousers', 'jeans': 'jeans',
  'saia': 'skirt', 'short': 'shorts', 'macacão': 'jumpsuit', 'sapato': 'shoes',
  'tênis': 'sneakers', 'sandália': 'sandals', 'bota': 'boots', 'bolsa': 'handbag',
  'cinto': 'belt', 'lenço': 'silk scarf',
};
function translatePiece(name: string): string {
  const lower = (name || '').toLowerCase().trim();
  if (PT_TO_EN_PIECES[lower]) return PT_TO_EN_PIECES[lower];
  let result = lower;
  for (const k of Object.keys(PT_TO_EN_PIECES).sort((a, b) => b.length - a.length)) {
    if (result.includes(k)) result = result.replace(k, PT_TO_EN_PIECES[k]);
  }
  return result;
}
export function translatePieces(names: string[]): string {
  return (names || []).slice(0, 8).map(translatePiece).join(', ');
}

// ─── Normalizers (DB strings → typed enums) ────────────────────────────────

export function normalizeOcasiao(raw?: string | null): OcasiaoType {
  const k = (raw || '').toLowerCase();
  if (k.includes('trabalho') || k.includes('escrit') || k.includes('office') || k.includes('work')) return 'Trabalho/Escritório';
  if (k.includes('formal') || k.includes('gala')) return 'Ocasiões formais';
  if (k.includes('evento') || k.includes('social') || k.includes('cocktail')) return 'Eventos sociais';
  if (k.includes('esporte') || k.includes('academ') || k.includes('gym') || k.includes('sport')) return 'Esportes/Academia';
  if (k.includes('viag') || k.includes('travel')) return 'Viagens';
  return 'Casual/Dia a dia';
}

export function normalizeClima(raw?: string | null): ClimaType {
  const k = (raw || '').toLowerCase();
  if (k.includes('tropic')) return 'Tropical (quente o ano todo)';
  if (k.includes('frio') || k.includes('cold')) return 'Frio (invernos rigorosos)';
  if (k.includes('temper') || k.includes('estaç') || k.includes('4 esta')) return 'Temperado (4 estações)';
  return 'Subtropical (verões quentes, invernos amenos)';
}

export function normalizeTipoCorporal(raw?: string | null): TipoCorporalType {
  const k = (raw || '').toLowerCase();
  if (k.includes('ampul') || k.includes('hourglass')) return 'Ampulheta';
  if (k.includes('invert') || k.includes('triangulo invert')) return 'Triângulo Invertido';
  if (k.includes('triang') || k.includes('pera') || k.includes('pear')) return 'Triângulo';
  if (k.includes('oval') || k.includes('redond') || k.includes('maçã') || k.includes('apple')) return 'Oval';
  return 'Retângulo';
}

export function normalizeCaimento(raw?: string | null): CaimentoType {
  const k = (raw || '').toLowerCase();
  if (k.includes('over')) return 'Oversized';
  if (k.includes('folg') || k.includes('relaxed') || k.includes('largo')) return 'Folgado';
  if (k.includes('reto') || k.includes('straight') || k.includes('regular')) return 'Reto';
  if (k.includes('bem ajust') || k.includes('justo') || k.includes('fitted')) return 'Bem ajustado';
  return 'Levemente ajustado';
}

export function normalizeFormalidade(raw?: string | null): FormalidadeType {
  const k = (raw || '').toLowerCase();
  if (k.includes('black tie')) return 'Black Tie';
  if (k.includes('formal')) return 'Formal';
  if (k.includes('business')) return 'Business Casual';
  if (k.includes('smart')) return 'Smart Casual';
  return 'Casual';
}

export function normalizeTomDePele(raw?: string | null): TomDePeleType {
  const k = (raw || '').toLowerCase();
  if (k.includes('muito_escuro') || k.includes('muito escuro') || k.includes('very dark')) return 'Muito Escuro';
  if (k.includes('escuro') || k.includes('dark') || k.includes('moren')) return 'Escuro';
  if (k.includes('med') || k.includes('méd')) return 'Médio';
  if (k.includes('muito_claro') || k.includes('muito claro') || k.includes('very fair')) return 'Muito Claro';
  return 'Claro';
}

export function normalizeEstilo(raw?: string | null): EstiloType {
  const k = (raw || '').toLowerCase();
  if (k.includes('clás') || k.includes('clas') || k.includes('atempor') || k.includes('classic')) return 'Clássico e atemporal';
  if (k.includes('român') || k.includes('roman') || k.includes('delicad')) return 'Romântico e delicado';
  if (k.includes('minim') || k.includes('modern')) return 'Moderno e minimalista';
  if (k.includes('ousad') || k.includes('marcant') || k.includes('bold')) return 'Ousado e marcante';
  if (k.includes('boho') || k.includes('despoj') || k.includes('bohemian')) return 'Boho e despojado';
  return 'Elegante e sofisticado';
}

// ─── Constantes editoriais ──────────────────────────────────────────────────
const PHOTO_QUALITY =
  "professional fashion editorial photography, shot on Hasselblad medium format, natural diffused light, ultra-sharp, 8k resolution, Vogue aesthetic";

const NO_FACE_RULE = "NO face visible, model turned away OR cropped at jawline OR back view";

// ─── ABA: RESUMO ────────────────────────────────────────────────────────────

const RESUMO_MOODBOARD_TEMPLATES = [
  (d: DiagnosticData) =>
    `Luxury fashion mood board flat lay, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]} fabric swatches, ${STYLE_PROPS[d.estiloPersonalidade]}, fresh botanicals, marble surface, overhead view, editorial, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Curated lifestyle objects arrangement: ${STYLE_PROPS[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]} textures, ${STYLE_PALETTE[d.estiloPersonalidade]} color palette, gold-trimmed stationary, on aged linen, soft morning light, top-down view, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `High-fashion editorial spread: ${STYLE_EN[d.estiloPersonalidade]} aesthetic, ${STYLE_PALETTE[d.estiloPersonalidade]} tones, ${OCCASION_EN[d.ocasiao]} lifestyle, ${CLIMATE_FABRIC_EN[d.clima]} textile samples, minimalist surface, oblique light, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Pinterest-style vision board: ${STYLE_EN[d.estiloPersonalidade]} fashion elements, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${OCCASION_EN[d.ocasiao]} wardrobe objects, ${CLIMATE_FABRIC_EN[d.clima]} swatches, dried flowers, white background, ${PHOTO_QUALITY}`,
];

const RESUMO_LIFESTYLE_TEMPLATES = [
  (d: DiagnosticData) =>
    `${STYLE_EN[d.estiloPersonalidade]} lifestyle flat lay: ${OCCASION_OUTFIT[d.ocasiao]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]}, neatly arranged on hardwood floor, editorial, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Outfit of the day flat lay for ${OCCASION_EN[d.ocasiao]}: ${BODY_MODELAGEM[d.tipoCorporal]}, ${STYLE_PALETTE[d.estiloPersonalidade]} palette, ${CLIMATE_FABRIC_EN[d.clima]}, arranged on white bed linen, morning light, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Capsule wardrobe selection: ${STYLE_EN[d.estiloPersonalidade]} pieces for ${OCCASION_EN[d.ocasiao]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]} fabrics, on cement surface, overhead shot, ${PHOTO_QUALITY}`,
];

export function buildResumoPrompts(d: DiagnosticData) {
  const t1 = hashSelect(RESUMO_MOODBOARD_TEMPLATES, d.userId, d.estiloPersonalidade, d.clima);
  const t2 = hashSelect(RESUMO_LIFESTYLE_TEMPLATES, d.userId, d.ocasiao, d.tipoCorporal);
  return [
    { prompt: t1(d), w: 800, h: 600, seed: makeSeed(d.userId, "resumo", 1) },
    { prompt: t2(d), w: 600, h: 400, seed: makeSeed(d.userId, "resumo", 2) },
  ];
}

// ─── ABA: CORPORAL ──────────────────────────────────────────────────────────

const CORPORAL_FLATLAY_TEMPLATES = [
  (d: DiagnosticData) =>
    `Clothing flat lay showcasing ideal cuts for ${BODY_TYPE_EN[d.tipoCorporal]} body type: ${BODY_MODELAGEM[d.tipoCorporal]}, ${FIT_EN[d.caimento]} fit, ${CLIMATE_FABRIC_EN[d.clima]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, on neutral surface, overhead, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Fashion editorial flat lay: ${BODY_MODELAGEM[d.tipoCorporal]}, ${FIT_EN[d.caimento]} silhouette for ${BODY_TYPE_EN[d.tipoCorporal]} figure, ${STYLE_PALETTE[d.estiloPersonalidade]} palette, ${CLIMATE_FABRIC_EN[d.clima]}, arranged on white surface, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Wardrobe pieces for ${BODY_TYPE_EN[d.tipoCorporal]}: ${BODY_MODELAGEM[d.tipoCorporal]}, neatly folded and arranged, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]} textures, marble background, ${PHOTO_QUALITY}`,
];

const CORPORAL_MODEL_TEMPLATES = [
  (d: DiagnosticData) =>
    `${STYLE_EN[d.estiloPersonalidade]} fashion editorial, female model wearing ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${FIT_EN[d.caimento]} fit, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${NO_FACE_RULE}, torso crop from neck to hip, studio white background, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Fashion editorial torso shot: model from collarbone to thigh wearing ${BODY_MODELAGEM[d.tipoCorporal].split(",")[1] || BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${FIT_EN[d.caimento]} silhouette, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${NO_FACE_RULE}, natural light, linen background, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Model back view wearing ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${FIT_EN[d.caimento]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, outdoors urban setting, full length, ${NO_FACE_RULE}, ${PHOTO_QUALITY}`,
];

export function buildCorporalPrompts(d: DiagnosticData) {
  const t1 = hashSelect(CORPORAL_FLATLAY_TEMPLATES, d.userId, d.tipoCorporal, d.caimento);
  const t2 = hashSelect(CORPORAL_MODEL_TEMPLATES, d.userId, d.tipoCorporal, d.estiloPersonalidade);
  return [
    { prompt: t1(d), w: 700, h: 500, seed: makeSeed(d.userId, "corporal", 1) },
    { prompt: t2(d), w: 480, h: 700, seed: makeSeed(d.userId, "corporal", 2) },
  ];
}

// ─── ABA: COLORAÇÃO ─────────────────────────────────────────────────────────

export function buildColoracaoPrompts(d: DiagnosticData) {
  const palette = SEASON_PALETTE[d.tomDePele]?.[d.estiloPersonalidade]
    || STYLE_PALETTE[d.estiloPersonalidade];

  const templates1 = [
    `Seasonal color analysis palette display: fabric swatches in ${palette}, arranged in a fan pattern on white surface, draped silk and cashmere textures, overhead flat lay, ${PHOTO_QUALITY}, no text`,
    `Color theory editorial: ${palette} tone fabric swatches, ${CLIMATE_FABRIC_EN[d.clima]} textures, arranged around a ${SKIN_TONE_EN[d.tomDePele]} ceramic bowl, minimalist composition, ${PHOTO_QUALITY}`,
    `Fashion color palette flat lay: folded fabric samples in ${palette}, overlapping arrangement, marble surface, natural light, ${PHOTO_QUALITY}`,
  ];

  const templates2 = [
    `Fashion editorial portrait from neck to waist, model with ${d.corCabelo.toLowerCase()} hair, wearing garment in ${palette.split(",")[0].trim()}, ${FIT_EN[d.caimento]}, ${STYLE_EN[d.estiloPersonalidade]}, ${NO_FACE_RULE}, collarbone to hip crop, studio soft light, ${PHOTO_QUALITY}`,
    `Close-up fashion shot: model's neck and décolletage, ${d.corCabelo.toLowerCase()} hair visible, wearing ${palette.split(",")[0].trim()} garment in ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]}, ${NO_FACE_RULE}, cropped at jawline, soft natural light, ${PHOTO_QUALITY}`,
    `Editorial torso shot: model wearing ${palette.split(",")[1]?.trim() || palette.split(",")[0].trim()} ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${d.corCabelo.toLowerCase()} hair, ${NO_FACE_RULE}, back turned, outdoor natural light, ${PHOTO_QUALITY}`,
  ];

  const p1 = hashSelect(templates1, d.userId, d.tomDePele, d.estiloPersonalidade);
  const p2 = hashSelect(templates2, d.userId, d.corCabelo, d.tipoCorporal);

  return [
    { prompt: p1, w: 600, h: 600, seed: makeSeed(d.userId, "coloracao", 1) },
    { prompt: p2, w: 500, h: 600, seed: makeSeed(d.userId, "coloracao", 2) },
  ];
}

// ─── ABA: ESTILO ────────────────────────────────────────────────────────────

const ESTILO_LOOK_TEMPLATES = [
  (d: DiagnosticData) =>
    `High fashion editorial: ${STYLE_EN[d.estiloPersonalidade]} look, model in ${OCCASION_OUTFIT[d.ocasiao]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${FIT_EN[d.caimento]}, ${NO_FACE_RULE} model back walking on editorial set, full length, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Vogue editorial photo: ${STYLE_EN[d.estiloPersonalidade]} aesthetic, ${OCCASION_OUTFIT[d.ocasiao]}, model side profile from shoulder to ankle, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${NO_FACE_RULE}, architectural background, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Fashion editorial: waist-down shot of ${STYLE_EN[d.estiloPersonalidade]} outfit for ${OCCASION_EN[d.ocasiao]}, ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]}, movement blur, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `${STYLE_EN[d.estiloPersonalidade]} editorial: model seated from collarbone to knee, ${OCCASION_OUTFIT[d.ocasiao]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${FIT_EN[d.caimento]}, ${NO_FACE_RULE}, editorial set with ${STYLE_PROPS[d.estiloPersonalidade].split(",")[0]}, ${PHOTO_QUALITY}`,
];

const ESTILO_MOODBOARD_TEMPLATES = [
  (d: DiagnosticData) =>
    `${STYLE_EN[d.estiloPersonalidade]} fashion mood board: ${STYLE_PROPS[d.estiloPersonalidade]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]} swatches, editorial flat lay, luxury objects, overhead view, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Curated accessories flat lay: ${STYLE_PROPS[d.estiloPersonalidade]}, on ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()} surface, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]} fabric background, natural light, editorial, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `${STYLE_EN[d.estiloPersonalidade]} editorial props: ${STYLE_PROPS[d.estiloPersonalidade]}, arranged on marble or linen, ${STYLE_PALETTE[d.estiloPersonalidade]} tones, morning golden light, Vogue aesthetic, ${PHOTO_QUALITY}`,
];

export function buildEstiloPrompts(d: DiagnosticData) {
  const t1 = hashSelect(ESTILO_LOOK_TEMPLATES, d.userId, d.estiloPersonalidade, d.ocasiao, d.tipoCorporal);
  const t2 = hashSelect(ESTILO_MOODBOARD_TEMPLATES, d.userId, d.estiloPersonalidade, d.clima);
  return [
    { prompt: t1(d), w: 480, h: 700, seed: makeSeed(d.userId, "estilo", 1) },
    { prompt: t2(d), w: 600, h: 400, seed: makeSeed(d.userId, "estilo", 2) },
  ];
}

// ─── ABA: MODELAGENS ────────────────────────────────────────────────────────

export function buildModelagensPrompts(d: DiagnosticData) {
  const templates1 = [
    `Fashion design flat lay: ${BODY_MODELAGEM[d.tipoCorporal]}, ${CLIMATE_FABRIC_EN[d.clima]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, on architect's table with technical drawings, overhead, ${PHOTO_QUALITY}`,
    `Clothing silhouette editorial: ${BODY_MODELAGEM[d.tipoCorporal]}, neatly arranged on linen surface, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]}, minimalist composition, ${PHOTO_QUALITY}`,
    `Atelier flat lay: ${BODY_MODELAGEM[d.tipoCorporal]}, ${FIT_EN[d.caimento]} cuts, ${CLIMATE_FABRIC_EN[d.clima]} fabrics, ${STYLE_PALETTE[d.estiloPersonalidade]}, marble surface with measuring tape, ${PHOTO_QUALITY}`,
  ];

  const templates2 = [
    `Close-up fabric swatches: ${CLIMATE_FABRIC_EN[d.clima]}, ${STYLE_PALETTE[d.estiloPersonalidade]} tones, texture detail shots, arranged in overlapping pattern, studio macro photography, ${PHOTO_QUALITY}`,
    `Textile editorial: ${CLIMATE_FABRIC_EN[d.clima]} fabric samples folded and stacked, ${STYLE_PALETTE[d.estiloPersonalidade]}, dramatic side lighting, surface texture visible, ${PHOTO_QUALITY}`,
    `Fashion material study: ${CLIMATE_FABRIC_EN[d.clima]} swatches on oak surface, ${STYLE_PALETTE[d.estiloPersonalidade]}, pins and fashion labels, flat lay overhead, ${PHOTO_QUALITY}`,
  ];

  const p1 = hashSelect(templates1, d.userId, d.tipoCorporal, d.clima);
  const p2 = hashSelect(templates2, d.userId, d.clima, d.estiloPersonalidade);

  return [
    { prompt: p1, w: 700, h: 450, seed: makeSeed(d.userId, "modelagens", 1) },
    { prompt: p2, w: 500, h: 400, seed: makeSeed(d.userId, "modelagens", 2) },
  ];
}

// ─── ABA: ESSENCIAIS ────────────────────────────────────────────────────────

const ESSENCIAIS_TEMPLATES = [
  (d: DiagnosticData) =>
    `Five essential wardrobe pieces flat lay for ${BODY_TYPE_EN[d.tipoCorporal]} body: ${BODY_MODELAGEM[d.tipoCorporal]}, ${FORMALITY_EN[d.formalidade]} style for ${OCCASION_EN[d.ocasiao]}, ${CLIMATE_FABRIC_EN[d.clima]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, on cream linen, overhead editorial, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Capsule wardrobe essentials: 5 pieces curated for ${OCCASION_EN[d.ocasiao]}, ${BODY_MODELAGEM[d.tipoCorporal].split(",").slice(0, 3).join(", ")}, ${STYLE_PALETTE[d.estiloPersonalidade]}, ${CLIMATE_FABRIC_EN[d.clima]}, arranged in grid on marble, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Curated fashion essentials flat lay: key pieces for ${FORMALITY_EN[d.formalidade]} ${OCCASION_EN[d.ocasiao]}, ${BODY_TYPE_EN[d.tipoCorporal]} figure, ${STYLE_EN[d.estiloPersonalidade]}, ${STYLE_PALETTE[d.estiloPersonalidade]}, on white surface with botanical accents, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Premium capsule wardrobe for ${OCCASION_EN[d.ocasiao]}: ${BODY_MODELAGEM[d.tipoCorporal]}, ${CLIMATE_FABRIC_EN[d.clima]} fabrics, ${STYLE_PALETTE[d.estiloPersonalidade]}, folded neatly on wood surface, ${STYLE_EN[d.estiloPersonalidade]} aesthetic, ${PHOTO_QUALITY}`,
];

const ESSENCIAIS_HERO_TEMPLATES = [
  (d: DiagnosticData) =>
    `Hero fashion shot of ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()} color, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]} fabric, ${FIT_EN[d.caimento]}, dramatic studio light, product photography, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Editorial close-up of essential piece: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[1]?.trim() || BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[1]?.trim()}, hanging on rack, dramatic side light, ${PHOTO_QUALITY}`,
  (d: DiagnosticData) =>
    `Luxury product shot: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]} in ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]} detail, folded on marble, macro lens, ${PHOTO_QUALITY}`,
];

export function buildEssenciaisPrompts(d: DiagnosticData) {
  const t1 = hashSelect(ESSENCIAIS_TEMPLATES, d.userId, d.formalidade, d.ocasiao, d.tipoCorporal, d.clima);
  const t2 = hashSelect(ESSENCIAIS_HERO_TEMPLATES, d.userId, d.estiloPersonalidade, d.tipoCorporal);
  return [
    { prompt: t1(d), w: 750, h: 500, seed: makeSeed(d.userId, "essenciais", 1) },
    { prompt: t2(d), w: 400, h: 400, seed: makeSeed(d.userId, "essenciais", 2) },
  ];
}

// ─── ABA: GUARDA-ROUPA ──────────────────────────────────────────────────────

const WARDROBE_COMPOSITIONS = [
  (outfit: string, style: string, palette: string, climate: string) =>
    `Fashion editorial back view, model walking away wearing ${outfit}, ${style}, ${palette}, ${climate}, full length shot, architectural background, ${NO_FACE_RULE}, ${PHOTO_QUALITY}`,
  (outfit: string, style: string, palette: string, climate: string) =>
    `Waist-down editorial: model legs in ${outfit}, ${style}, ${palette}, ${climate} fabrics, movement blur, city sidewalk, oblique light, ${PHOTO_QUALITY}`,
  (outfit: string, style: string, palette: string, climate: string) =>
    `Side profile editorial: model shoulder to ankle wearing ${outfit}, ${style}, ${palette}, ${climate}, ${NO_FACE_RULE}, minimalist white wall, ${PHOTO_QUALITY}`,
  (outfit: string, style: string, palette: string, climate: string) =>
    `Outfit flat lay overhead: ${outfit} pieces arranged on ${palette.split(",")[0].trim()} surface, ${climate} fabrics, ${style} accessories, editorial composition, ${PHOTO_QUALITY}`,
  (outfit: string, style: string, palette: string, climate: string) =>
    `Ankle-to-thigh editorial crop: lower half outfit ${outfit}, ${style}, ${palette} tones, ${climate} textures, staircase setting, ${PHOTO_QUALITY}`,
];

const LOOK_BY_TAG: Record<string, (d: DiagnosticData, i: number) => string> = {
  "Trabalho": (d, i) => {
    const options = [
      `tailored ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]} suit in ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[1]?.trim() || "navy"}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]}, structured blazer`,
      `power dressing: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[1]?.trim() || "wide-leg trousers"} and crisp blouse, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]}`,
      `office ${STYLE_EN[d.estiloPersonalidade]} look: pencil skirt and fitted blazer, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[2]?.trim() || "camel"}, pointed heels`,
    ];
    return options[i % options.length];
  },
  "Casual": (d, i) => {
    const options = [
      `relaxed ${STYLE_EN[d.estiloPersonalidade]} casual: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]} in ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[0]}, white sneakers`,
      `everyday ${BODY_TYPE_EN[d.tipoCorporal]} flattering: straight-leg jeans and quality t-shirt in ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[1]?.trim() || "ivory"}, ${STYLE_PROPS[d.estiloPersonalidade].split(",")[0]}`,
      `weekend ${STYLE_EN[d.estiloPersonalidade]}: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[2]?.trim() || "midi dress"}, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()}, ${CLIMATE_FABRIC_EN[d.clima].split(",")[1]?.trim() || "cotton"}, sandals`,
    ];
    return options[i % options.length];
  },
  "Eventos": (d, i) => {
    const options = [
      `event look: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]} in ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[0].trim()} evening fabric, ${STYLE_PROPS[d.estiloPersonalidade].split(",")[1]?.trim() || "statement jewelry"}`,
      `cocktail ${STYLE_EN[d.estiloPersonalidade]}: ${BODY_MODELAGEM[d.tipoCorporal].split(",")[1]?.trim() || "wrap dress"}, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[1]?.trim() || "champagne"}, heels and ${STYLE_PROPS[d.estiloPersonalidade].split(",")[0]}`,
      `gala ${STYLE_EN[d.estiloPersonalidade]} outfit: formal ${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, ${STYLE_PALETTE[d.estiloPersonalidade].split(",")[2]?.trim() || "deep navy"}, luxury accessories`,
    ];
    return options[i % options.length];
  },
};

export function buildGuardaRoupaPrompts(d: DiagnosticData) {
  const style = STYLE_EN[d.estiloPersonalidade];
  const palette = STYLE_PALETTE[d.estiloPersonalidade];
  const climate = CLIMATE_FABRIC_EN[d.clima].split(",")[0];
  const results: Array<{ category: string; prompt: string; w: number; h: number; seed: number }> = [];

  const CATEGORIES = ["Básicos", "Trabalho", "Casual", "Eventos", "Peças-chave"];
  const CATEGORY_OUTFITS = [
    `${BODY_MODELAGEM[d.tipoCorporal].split(",")[0]}, essential basics, ${CLIMATE_FABRIC_EN[d.clima]}`,
    OCCASION_OUTFIT["Trabalho/Escritório"],
    OCCASION_OUTFIT["Casual/Dia a dia"],
    OCCASION_OUTFIT["Eventos sociais"],
    `statement ${STYLE_EN[d.estiloPersonalidade]} piece, ${STYLE_PROPS[d.estiloPersonalidade].split(",")[0]}`,
  ];

  for (let i = 0; i < 5; i++) {
    const compFn = hashSelect(WARDROBE_COMPOSITIONS, d.userId, CATEGORIES[i], d.estiloPersonalidade);
    results.push({
      category: CATEGORIES[i],
      prompt: compFn(CATEGORY_OUTFITS[i], style, palette, climate),
      w: 400,
      h: 300,
      seed: makeSeed(d.userId, `wardcat-${i}`, i + 1),
    });
  }

  const TAGS = ["Trabalho", "Casual", "Eventos"];
  for (let i = 0; i < 3; i++) {
    const outfit = LOOK_BY_TAG[TAGS[i]](d, i);
    const compFn = hashSelect(WARDROBE_COMPOSITIONS, d.userId, TAGS[i], d.clima, String(i));
    results.push({
      category: TAGS[i],
      prompt: compFn(outfit, style, palette, climate),
      w: 480,
      h: 640,
      seed: makeSeed(d.userId, `wardlook-${TAGS[i]}`, i + 1),
    });
  }

  return results;
}

// ─── Section dispatcher used by <SmartSectionImage /> ──────────────────────

export interface PromptSpec {
  prompt: string;
  w: number;
  h: number;
  seed: number;
}

export function getSectionPrompt(section: SectionId, variant: 'primary' | 'secondary', d: DiagnosticData): PromptSpec {
  switch (section) {
    case 'resumo': {
      const [a, b] = buildResumoPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'corpo': {
      const [a, b] = buildCorporalPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'cores': {
      const [a, b] = buildColoracaoPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'estilo': {
      const [a, b] = buildEstiloPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'modelagens': {
      const [a, b] = buildModelagensPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'essenciais': {
      const [a, b] = buildEssenciaisPrompts(d);
      return variant === 'secondary' ? b : a;
    }
    case 'capsula': {
      const items = buildGuardaRoupaPrompts(d);
      // primary = hero look (index 5, Trabalho 480x640), secondary = first category card
      const primary = items[5] || items[0];
      const secondary = items[0];
      return variant === 'secondary' ? secondary : primary;
    }
  }
}

export function buildAllPrompts(d: DiagnosticData) {
  return {
    resumo: buildResumoPrompts(d),
    corporal: buildCorporalPrompts(d),
    coloracao: buildColoracaoPrompts(d),
    estilo: buildEstiloPrompts(d),
    modelagens: buildModelagensPrompts(d),
    essenciais: buildEssenciaisPrompts(d),
    guardaRoupa: buildGuardaRoupaPrompts(d),
  };
}
