import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === Translation maps PT → EN ===

const clothingTermMap: Record<string, string> = {
  "blazer estruturado": "structured blazer",
  "blazer oversized": "oversized blazer",
  blazer: "blazer jacket",
  "camisa social": "dress shirt formal",
  camisa: "shirt blouse",
  blusa: "blouse top",
  camiseta: "t-shirt tee",
  "top cropped": "crop top",
  top: "fashion top",
  regata: "tank top sleeveless",
  body: "bodysuit",
  cropped: "crop top",
  "suéter": "sweater pullover",
  tricot: "knit sweater",
  cardigan: "cardigan knit",
  moletom: "sweatshirt",
  "jaqueta de couro": "leather jacket",
  jaqueta: "jacket outerwear",
  casaco: "coat outerwear",
  "trench coat": "trench coat",
  colete: "vest waistcoat",
  "calça alfaiataria": "tailored trousers",
  "calça wide leg": "wide leg pants",
  "calça pantalona": "palazzo pants",
  "calça skinny": "skinny jeans",
  "calça reta": "straight leg pants",
  "calça jeans": "jeans denim",
  "calça": "trousers pants",
  legging: "leggings",
  "saia midi": "midi skirt",
  "saia lápis": "pencil skirt",
  "saia plissada": "pleated skirt",
  "saia longa": "maxi skirt",
  "saia curta": "mini skirt",
  saia: "skirt",
  "vestido midi": "midi dress",
  "vestido longo": "maxi dress evening",
  "vestido curto": "mini dress",
  "vestido envelope": "wrap dress",
  "vestido tubinho": "sheath dress",
  "vestido chemise": "shirt dress",
  vestido: "dress elegant",
  "macacão": "jumpsuit",
  macaquinho: "romper playsuit",
  short: "shorts",
  shorts: "shorts",
  bermuda: "bermuda shorts",
  scarpin: "stiletto pumps heels",
  "sandália de salto": "heeled sandals",
  "sandália rasteira": "flat sandals",
  "sandália": "sandals",
  "tênis branco": "white sneakers",
  "tênis": "sneakers trainers",
  "bota cano alto": "knee high boots",
  "bota chelsea": "chelsea boots",
  bota: "boots ankle",
  rasteirinha: "flat sandals",
  mocassim: "loafers",
  sapatilha: "ballet flats",
  mule: "mule shoes",
  sapato: "shoes",
  "bolsa estruturada": "structured handbag",
  "bolsa tote": "tote bag",
  bolsa: "handbag purse",
  clutch: "clutch bag evening",
  mochila: "backpack",
  cinto: "belt leather",
  "lenço de seda": "silk scarf",
  "lenço": "scarf",
  cachecol: "winter scarf",
  "chapéu": "hat",
  echarpe: "shawl wrap",
  brinco: "earrings",
  colar: "necklace",
  pulseira: "bracelet",
  anel: "ring",
  "óculos de sol": "sunglasses",
  "óculos": "sunglasses",
};

const colorMap: Record<string, string> = {
  preto: "black", preta: "black", branco: "white", branca: "white",
  azul: "blue", "azul marinho": "navy blue", "azul claro": "light blue",
  vermelho: "red", vermelha: "red", verde: "green", "verde oliva": "olive green",
  amarelo: "yellow", amarela: "yellow", rosa: "pink", "rosa claro": "light pink",
  bege: "beige", caramelo: "caramel", marrom: "brown", cinza: "gray",
  dourado: "gold", dourada: "gold", prata: "silver", nude: "nude",
  borgonha: "burgundy", terracota: "terracotta", mostarda: "mustard",
  coral: "coral", lavanda: "lavender", creme: "cream", off: "off-white",
};

const materialMap: Record<string, string> = {
  "crochê": "crochet", croche: "crochet", tricot: "knit",
  renda: "lace", linho: "linen", couro: "leather", jeans: "denim",
  seda: "silk", "algodão": "cotton", algodao: "cotton", cetim: "satin",
  veludo: "velvet", tweed: "tweed", camurça: "suede", camurca: "suede",
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

/** Generate a normalized key for deduplication */
function generateNormalizedKey(input: string): string {
  const n = normalize(input);
  const sortedKeys = Object.keys(clothingTermMap).sort((a, b) => b.length - a.length);
  let type = "";
  for (const key of sortedKeys) {
    if (n.includes(normalize(key))) { type = key; break; }
  }
  let color = "";
  const sortedColors = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  for (const pt of sortedColors) {
    if (n.includes(normalize(pt))) { color = pt; break; }
  }
  let material = "";
  for (const [pt] of Object.entries(materialMap)) {
    if (n.includes(normalize(pt))) { material = pt; break; }
  }
  return [type, color, material].filter(Boolean).join("_").replace(/\s+/g, "_") || n.replace(/\s+/g, "_");
}

/** Detect clothing category */
function detectCategory(input: string): string {
  const n = normalize(input);
  const categoryRules: [string[], string][] = [
    [["blazer", "jaqueta", "casaco", "trench", "colete", "cardigan", "sueter", "moletom"], "tercas_pecas"],
    [["camisa", "blusa", "camiseta", "top", "regata", "body", "cropped"], "tops"],
    [["calca", "legging", "shorts", "bermuda", "short"], "bottoms"],
    [["saia"], "bottoms"],
    [["vestido", "macacao", "macaquinho"], "vestidos"],
    [["scarpin", "sandalia", "tenis", "bota", "mocassim", "sapatilha", "mule", "sapato", "rasteirinha"], "calcados"],
    [["bolsa", "clutch", "mochila", "cinto", "lenco", "cachecol", "chapeu", "echarpe", "brinco", "colar", "pulseira", "anel", "oculos"], "acessorios"],
  ];
  for (const [keywords, cat] of categoryRules) {
    for (const kw of keywords) {
      if (n.includes(kw)) return cat;
    }
  }
  return "outros";
}

function gerarQueryPexels(input: string): string {
  const normalized = normalize(input);
  const sortedKeys = Object.keys(clothingTermMap).sort((a, b) => b.length - a.length);
  
  let tipo = "";
  for (const key of sortedKeys) {
    if (normalized.includes(normalize(key))) { tipo = clothingTermMap[key]; break; }
  }
  if (!tipo) tipo = "clothing fashion";

  let cor = "";
  const sortedColors = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  for (const pt of sortedColors) {
    if (normalized.includes(normalize(pt))) { cor = colorMap[pt]; break; }
  }

  let material = "";
  for (const [pt, en] of Object.entries(materialMap)) {
    if (normalized.includes(normalize(pt))) { material = en; break; }
  }

  const parts = [cor, material, tipo, "women clothing product isolated white background -face -model -person -portrait -selfie"].filter(Boolean);
  return parts.join(" ");
}

// === Pexels (API 1 - primary) ===

async function buscarPexels(query: string, perPage: number): Promise<{ url: string; source: string }[]> {
  const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
  if (!PEXELS_API_KEY) {
    console.log("PEXELS_API_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!res.ok) {
      console.log(`Pexels returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const faceExclude = ["portrait", "selfie", "couple", "family", "man ", "boy ", "male", "face", "model", "person", "people", "woman smiling", "posing", "looking at camera", "headshot", "smile"];
    
    const results = (data.photos || [])
      .filter((p: any) => {
        const alt = (p.alt || "").toLowerCase();
        if (faceExclude.some(t => alt.includes(t))) return false;
        const productTerms = ["clothing", "fashion", "dress", "shirt", "pants", "shoes", "bag", "fabric", "textile", "outfit", "garment", "apparel", "wardrobe", "style", "wear", "flat lay", "product"];
        const hasProductTerm = productTerms.some(t => alt.includes(t));
        return alt.length === 0 || hasProductTerm || !alt.includes("woman");
      })
      .map((p: any) => ({
        url: p.src?.medium || p.src?.large || p.src?.small,
        source: "pexels",
      }))
      .filter((r: any) => r.url);

    console.log(`Pexels: ${results.length} product images for "${query}"`);
    return results;
  } catch (e) {
    console.error("Pexels fetch error:", e);
    return [];
  }
}

// === Unsplash (API 2 - fallback) ===

async function buscarUnsplash(query: string, perPage: number): Promise<{ url: string; source: string }[]> {
  const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!UNSPLASH_KEY) {
    console.log("UNSPLASH_ACCESS_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + " clothing product flat lay -face -person")}&per_page=${perPage}&orientation=portrait`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );

    if (!res.ok) {
      console.log(`Unsplash returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const faceExclude = ["portrait", "selfie", "face", "model", "person", "people", "smile", "posing"];

    const results = (data.results || [])
      .filter((p: any) => {
        const desc = (p.description || p.alt_description || "").toLowerCase();
        return !faceExclude.some(t => desc.includes(t));
      })
      .map((p: any) => ({
        url: p.urls?.regular || p.urls?.small,
        source: "unsplash",
      }))
      .filter((r: any) => r.url);

    console.log(`Unsplash: ${results.length} product images for "${query}"`);
    return results;
  } catch (e) {
    console.error("Unsplash fetch error:", e);
    return [];
  }
}

// === Validate image URL is accessible ===

async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") || "";
    return res.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}

// === AI Vision validator (Gemini via Lovable AI Gateway) ===
// Scores every candidate image 0–100 against an expected context/category.
// Returns sorted scores. Designed to be called with up to ~12 image URLs at once.

interface AiScore { index: number; score: number; reason: string; category_guess?: string }

async function aiScoreImages(
  expectedContext: string,
  expectedCategory: string | null,
  urls: string[],
): Promise<AiScore[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || urls.length === 0) return [];

  const list = urls.slice(0, 12);
  const systemPrompt = `You are an expert women's fashion image curator. Given a target context and a numbered list of candidate images, you must score each image from 0 to 100 based on how well it matches the target.

Scoring rules:
- 90–100: perfect match (correct category, correct style, clean composition, women's fashion).
- 70–89: relevant but not perfect (right category, slightly different style or color).
- 40–69: tangentially related (e.g. fashion image but wrong category).
- 0–39: wrong category, men's wear, irrelevant subject, low quality, or contains text/watermarks.

Hard reject (score < 40):
- Wrong clothing category (if the target asks for "shoes" and the image shows pants → reject).
- Male subjects, children, or non-fashion content.
- Group shots, close-ups of faces, or selfies.
- Stock photo collages or images with heavy overlaid text.

Always return one entry per image, in the same order you received them.`;

  const userPrompt = `Target context: ${expectedContext}
${expectedCategory ? `Required category: ${expectedCategory}` : ""}

Score the ${list.length} images below.`;

  const content: any[] = [{ type: "text", text: userPrompt }];
  list.forEach((url, i) => {
    content.push({ type: "text", text: `Image ${i}:` });
    content.push({ type: "image_url", image_url: { url } });
  });

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    tools: [{
      type: "function",
      function: {
        name: "submit_scores",
        description: "Return the relevance score for each image.",
        parameters: {
          type: "object",
          properties: {
            scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  score: { type: "integer", minimum: 0, maximum: 100 },
                  category_guess: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["index", "score", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["scores"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "submit_scores" } },
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`🤖 AI validator HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return [];
    }
    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.warn("🤖 AI validator: no tool call returned");
      return [];
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    const scores: AiScore[] = (parsed.scores || []).filter((s: any) => typeof s.index === "number" && typeof s.score === "number");
    scores.sort((a, b) => b.score - a.score);
    console.log(`🤖 AI scored ${scores.length} candidates: ${scores.map(s => `${s.index}=${s.score}`).join(", ")}`);
    return scores;
  } catch (e) {
    console.warn("🤖 AI validator error:", e);
    return [];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  tercas_pecas: "outerwear / third layer (blazer, jacket, coat, vest, cardigan)",
  tops: "top / blouse / shirt / t-shirt only",
  bottoms: "bottoms only (pants, trousers, skirt, shorts)",
  vestidos: "dress or jumpsuit only",
  calcados: "shoes only (sneakers, heels, boots, sandals, flats)",
  acessorios: "accessory only (bag, belt, scarf, jewelry, sunglasses)",
  outros: "women's clothing piece",
};

// === Main handler ===

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, count = 1, diagnosisId, mode = "product", seed = 0, section, fallbackQueries } = await req.json();
    if (!query || typeof query !== "string") {
      throw new Error("Missing or invalid query parameter");
    }
    const seedNum = Math.abs(parseInt(String(seed), 10) || 0);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── EDITORIAL MODE: per-section specialized AI validation ──
    if (mode === "editorial") {
      // Per-tab specialist: each section defines what a valid image must show.
      const SECTION_SPECS: Record<string, { label: string; mustShow: string; reject: string; minScore: number }> = {
        corpo: {
          label: "body-type styling reference",
          mustShow: "a woman wearing an outfit clearly designed for the target body shape, full or 3/4 length, balanced proportions visible",
          reject: "random portraits, accessories alone, men, group shots, abstract editorials with no garment focus",
          minScore: 80,
        },
        cores: {
          label: "color palette / season styling",
          mustShow: "garments or palette swatches in the EXACT season's colors (warm autumn, cool winter, etc.). Color story must dominate the frame",
          reject: "wrong-season colors, neon or off-palette tones, men, busy backgrounds, makeup tutorials",
          minScore: 80,
        },
        estilo: {
          label: "style identity outfit",
          mustShow: "a complete look that visually embodies the target style aesthetic (minimalist, classic, bohemian, etc.) on a woman",
          reject: "outfits from a different style family, streetwear if not asked, costumes, men, irrelevant lifestyle",
          minScore: 80,
        },
        modelagens: {
          label: "garment fit / silhouette reference",
          mustShow: "a single garment (pants, blazer, dress, skirt) showcasing the exact cut/fit, ideally flat-lay or focused product shot",
          reject: "full styled outfits, accessories, men, multiple unrelated pieces in one frame",
          minScore: 80,
        },
        essenciais: {
          label: "wardrobe essential piece",
          mustShow: "a single essential garment (white shirt, trench, jeans, etc.) shown cleanly as a product or worn minimally",
          reject: "complete looks, trendy statement pieces, accessories-only, men, irrelevant items",
          minScore: 80,
        },
        capsula: {
          label: "capsule wardrobe outfit",
          mustShow: "a curated, coherent women's outfit aligned with style + occasion + season",
          reject: "off-style outfits, men, costume/cosplay, random fashion shots",
          minScore: 80,
        },
        resumo: {
          label: "editorial hero portrait of a styled woman",
          mustShow: "a high-quality editorial fashion image of a single woman in a complete look matching the profile",
          reject: "men, group shots, product-only, screenshots, watermarked stock",
          minScore: 75,
        },
      };
      const spec = (section && SECTION_SPECS[section]) || SECTION_SPECS.resumo;
      const queries: string[] = [query, ...(Array.isArray(fallbackQueries) ? fallbackQueries : [])];
      console.log(`🎨 EDITORIAL[${section ?? 'generic'}] queries=${queries.length} primary="${query}"`);

      async function fetchPool(q: string) {
        const perPage = 20;
        let pool: { url: string; source: string }[] = [];
        const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
        if (PEXELS_API_KEY) {
          try {
            const res = await fetch(
              `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=portrait`,
              { headers: { Authorization: PEXELS_API_KEY } }
            );
            if (res.ok) {
              const data = await res.json();
              pool = (data.photos || [])
                .map((p: any) => ({ url: p.src?.large || p.src?.medium, source: "pexels" }))
                .filter((r: any) => r.url);
            }
          } catch (e) { console.error("editorial pexels error", e); }
        }
        if (pool.length === 0) {
          const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
          if (UNSPLASH_KEY) {
            try {
              const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=portrait`,
                { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
              );
              if (res.ok) {
                const data = await res.json();
                pool = (data.results || [])
                  .map((p: any) => ({ url: p.urls?.regular || p.urls?.small, source: "unsplash" }))
                  .filter((r: any) => r.url);
              }
            } catch (e) { console.error("editorial unsplash error", e); }
          }
        }
        return pool;
      }

      let bestPick: { url: string; source: string; score: number } | null = null;
      let lastReachable: { url: string; source: string }[] = [];

      for (const q of queries) {
        const pool = await fetchPool(q);
        if (pool.length === 0) continue;
        const reachable: { url: string; source: string }[] = [];
        for (const r of pool.slice(0, 12)) {
          if (await validateImageUrl(r.url)) reachable.push(r);
          if (reachable.length >= 10) break;
        }
        if (reachable.length === 0) continue;
        lastReachable = reachable;

        const aiContext = `SECTION: "${spec.label}". TARGET: ${query}. MUST SHOW: ${spec.mustShow}. HARD REJECT: ${spec.reject}.`;
        const aiScores = await aiScoreImages(aiContext, spec.label, reachable.map(r => r.url));
        const acceptable = aiScores.filter(s => s.score >= spec.minScore && reachable[s.index]);

        if (acceptable.length > 0) {
          const chosen = acceptable[seedNum % acceptable.length];
          bestPick = { ...reachable[chosen.index], score: chosen.score };
          console.log(`✅ editorial[${section}] q="${q}" score=${chosen.score}`);
          break;
        } else {
          console.warn(`↪ editorial[${section}] rejected all for "${q}" (top=${aiScores[0]?.score ?? 'n/a'}); trying fallback`);
        }
      }

      if (!bestPick && lastReachable.length > 0) {
        const fb = lastReachable[seedNum % lastReachable.length];
        bestPick = { ...fb, score: 0 };
        console.log(`⚠️ editorial[${section}] returning unvalidated fallback`);
      }

      if (!bestPick) {
        return new Response(
          JSON.stringify({ results: [], source: "none" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ results: [{ url: bestPick.url, source: bestPick.source, score: bestPick.score }], cached: false, seed: seedNum, section }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedKey = generateNormalizedKey(query);
    const category = detectCategory(query);

    console.log(`🔍 Input: "${query}" → Key: "${normalizedKey}" | Cat: "${category}"`);

    // ── STEP 1: Check DB for existing image ──
    const { data: existing } = await supabase
      .from("clothing_images")
      .select("image_url, piece_key, description")
      .eq("normalized_key", normalizedKey)
      .limit(1)
      .maybeSingle();

    if (existing?.image_url) {
      console.log(`✅ DB HIT for "${normalizedKey}": ${existing.image_url}`);
      return new Response(
        JSON.stringify({ results: [{ url: existing.image_url, source: "database" }], cached: true, normalizedKey, category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`❌ DB MISS for "${normalizedKey}" → searching APIs...`);

    const perPage = 20;
    const pexelsQuery = gerarQueryPexels(query);

    // ── STEP 2: API 1 - Pexels ──
    console.log(`🔎 API1 (Pexels): "${pexelsQuery}"`);
    let results = await buscarPexels(pexelsQuery, perPage);

    // ── STEP 3: API 2 - Unsplash (fallback) ──
    if (results.length === 0) {
      console.log(`🔎 API2 (Unsplash fallback): "${pexelsQuery}"`);
      results = await buscarUnsplash(pexelsQuery, perPage);
    }

    if (results.length === 0) {
      console.warn(`⚠️ No images found from any API for "${query}"`);
      return new Response(
        JSON.stringify({ results: [], source: "none", normalizedKey, category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STEP 4: Reach + AI validation ──
    const reachable: { url: string; source: string }[] = [];
    for (const r of results.slice(0, 12)) {
      if (await validateImageUrl(r.url)) reachable.push(r);
      if (reachable.length >= 10) break;
    }
    if (reachable.length === 0) {
      console.warn(`⚠️ No reachable image URLs for "${query}"`);
      return new Response(
        JSON.stringify({ results: [], source: "none", normalizedKey, category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryLabel = CATEGORY_LABELS[category] || CATEGORY_LABELS.outros;
    const aiContext = `Women's fashion catalog image showing a single ${categoryLabel}. Description: "${query}". Must be a clean product/flat-lay or focused garment shot — no men, no faces, no group shots, no irrelevant categories.`;
    const aiScores = await aiScoreImages(aiContext, categoryLabel, reachable.map(r => r.url));

    let validUrl: string | null = null;
    let validSource = "";
    let validScore = 0;
    for (const s of aiScores) {
      if (s.score >= 70 && reachable[s.index]) {
        validUrl = reachable[s.index].url;
        validSource = reachable[s.index].source;
        validScore = s.score;
        console.log(`🤖 AI picked idx=${s.index} score=${s.score} reason="${s.reason}"`);
        break;
      }
    }
    if (!validUrl) {
      console.warn(`⚠️ AI rejected all ${reachable.length} candidates for "${query}" (top score=${aiScores[0]?.score ?? 'n/a'})`);
      return new Response(
        JSON.stringify({ results: [], source: "none", normalizedKey, category, rejected: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Validated (${validSource}, score=${validScore}): ${validUrl}`);

    // ── STEP 5: Save to DB (only if not already saved) ──
    const { data: doubleCheck } = await supabase
      .from("clothing_images")
      .select("id")
      .eq("normalized_key", normalizedKey)
      .maybeSingle();

    if (!doubleCheck) {
      const { error: insertError } = await supabase
        .from("clothing_images")
        .insert({
          piece_key: normalizedKey,
          image_url: validUrl,
          description: query,
          category,
          normalized_key: normalizedKey,
          diagnosis_id: null, // Global: shared across all users
        });

      if (insertError) {
        // Unique constraint violation = already saved by another request (race condition)
        if (insertError.message?.includes("duplicate") || insertError.message?.includes("unique")) {
          console.log(`⚡ Race condition: "${normalizedKey}" already saved by another request`);
        } else {
          console.warn("Failed to save clothing image:", insertError.message);
        }
      } else {
        console.log(`💾 Saved to catalog: "${normalizedKey}" (${category}) from ${validSource}`);
      }
    } else {
      console.log(`⚡ Already saved by concurrent request: "${normalizedKey}"`);
    }

    return new Response(
      JSON.stringify({ results: [{ url: validUrl, source: validSource, score: validScore }], normalizedKey, category, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error searching clothing image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
