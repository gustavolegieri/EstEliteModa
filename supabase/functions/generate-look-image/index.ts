import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLOTHING_BUCKET = "clothing-generated";

type PieceMetadata = {
  category?: string | null;
  color?: string | null;
  fabric?: string | null;
  style?: string | null;
};

type StyleContext = {
  styleIdentity?: string | null;
  colorSeason?: string | null;
  palette?: string[] | null;
  bodyType?: string | null;
  formality?: string | null;
  personality?: string | null;
};

function buildStyleSuffix(ctx?: StyleContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.styleIdentity) parts.push(`style identity: ${ctx.styleIdentity}`);
  if (ctx.colorSeason) parts.push(`color season: ${ctx.colorSeason}`);
  if (Array.isArray(ctx.palette) && ctx.palette.length) parts.push(`palette: ${ctx.palette.slice(0, 5).join(", ")}`);
  if (ctx.bodyType) parts.push(`body type: ${ctx.bodyType}`);
  if (ctx.formality) parts.push(`formality: ${ctx.formality}`);
  if (ctx.personality) parts.push(`personality: ${ctx.personality}`);
  return parts.length ? `. Tailored to client profile — ${parts.join("; ")}` : "";
}

function normalizeToken(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePieceKey(name: string, metadata?: PieceMetadata, ctx?: StyleContext): string {
  return [
    normalizeToken(name),
    normalizeToken(metadata?.color),
    normalizeToken(metadata?.fabric),
    normalizeToken(metadata?.category),
    normalizeToken(metadata?.style),
    normalizeToken(ctx?.styleIdentity),
    normalizeToken(ctx?.colorSeason),
  ]
    .filter(Boolean)
    .join("_");
}

// ─── Category detection from piece name (PT-BR) — locks the AI to the right product ───
type PieceCategory =
  | "footwear" | "pants" | "skirt" | "shorts" | "dress" | "jumpsuit"
  | "top" | "outerwear" | "bag" | "accessory" | "unknown";

const CATEGORY_KEYWORDS: Array<[PieceCategory, RegExp]> = [
  ["footwear",  /\b(t[eê]nis|sapato|sapatilha|bota|botinha|cotur|sand[aá]lia|chinelo|rasteira|scarpin|salto|mule|oxford|mocass|loafer|slipper|espadrille|sneaker|shoe|boot|heel|flat)\b/i],
  ["jumpsuit",  /\b(macac[aã]o|jumpsuit|romper)\b/i],
  ["dress",     /\b(vestido|dress|chemise)\b/i],
  ["skirt",     /\b(saia|skirt)\b/i],
  ["shorts",    /\b(short|bermuda)\b/i],
  ["pants",     /\b(cal[cç]a|jeans|legging|pantal|alfaiataria|trouser|pant|slack)\b/i],
  ["outerwear", /\b(casaco|jaqueta|blazer|sobretudo|trench|parka|kimono|colete|cardig|sueter|su[eé]ter|tricot|coat|jacket)\b/i],
  ["top",       /\b(camisa|camiseta|blusa|top|cropped|regata|body|t-?shirt|polo|tank|blouse|shirt)\b/i],
  ["bag",       /\b(bolsa|clutch|mochila|bag|tote|handbag|crossbody)\b/i],
  ["accessory", /\b(cinto|len[cç]o|brinco|colar|anel|pulseira|[oó]culos|chap[eé]u|bon[eé]|gravata|rel[oó]gio|belt|scarf|hat|cap|sunglass|necklace|earring|bracelet|jewel|accessory|acess[oó]rio)\b/i],
];

function detectCategory(name: string, explicit?: string | null): PieceCategory {
  const ex = (explicit || "").toLowerCase();
  if (ex) {
    for (const [cat, rx] of CATEGORY_KEYWORDS) if (rx.test(ex)) return cat;
  }
  for (const [cat, rx] of CATEGORY_KEYWORDS) if (rx.test(name || "")) return cat;
  return "unknown";
}

const CATEGORY_PROMPT_LOCK: Record<PieceCategory, string> = {
  footwear:  "Generate ONLY a single pair of women's shoes (footwear product shot). Show only the shoes. No legs, no pants, no full body, no clothing items, no accessories. Single product centered.",
  pants:     "Generate ONLY a pair of women's pants/trousers as a flat-lay product (bottoms only). No shoes, no top, no jacket, no full outfit, no model. Single garment centered.",
  skirt:     "Generate ONLY a women's skirt as a flat-lay product. No shoes, no top, no jacket, no full outfit, no model. Single garment centered.",
  shorts:    "Generate ONLY a pair of women's shorts as a flat-lay product. No shoes, no top, no full outfit, no model. Single garment centered.",
  dress:     "Generate ONLY a women's dress as a flat-lay product. No shoes, no jacket, no accessories, no model, no second outfit. Single garment centered.",
  jumpsuit:  "Generate ONLY a women's jumpsuit as a flat-lay product. No shoes, no jacket, no accessories, no model. Single garment centered.",
  top:       "Generate ONLY a women's top (shirt/blouse/t-shirt) as a flat-lay product. Upper-body garment only. No pants, no skirt, no shoes, no jacket, no model. Single garment centered.",
  outerwear: "Generate ONLY a women's outerwear piece (jacket/blazer/coat/cardigan) as a flat-lay product. Outer layer only. No pants, no top underneath, no shoes, no model. Single garment centered.",
  bag:       "Generate ONLY a single women's handbag as a product shot. No clothing, no shoes, no model. Single product centered.",
  accessory: "Generate ONLY a single women's fashion accessory as a product shot. No clothing, no shoes, no model. Single product centered.",
  unknown:   "Generate ONLY a single women's fashion product as a flat-lay. One item only. No model, no full outfit.",
};

function buildIsolatedPiecePrompt(description: string, ctx?: StyleContext, metadata?: PieceMetadata): string {
  const safeDesc = description.length > 200 ? description.slice(0, 200) : description;
  const cat = detectCategory(safeDesc, metadata?.category);
  const lock = CATEGORY_PROMPT_LOCK[cat];
  // Positive lock first (strongest signal), then the description, then style suffix.
  const prompt = `${lock} Item: ${safeDesc}. Luxury e-commerce flat-lay product photography on a pure white seamless background, crisp folds, visible stitching, fine fabric texture, even soft studio lighting, faint contact shadow, photorealistic catalog standard${buildStyleSuffix(ctx)}`;
  return prompt.length > 3800 ? prompt.slice(0, 3800) : prompt;
}

function trimPrompt(text: string, max = 3800): string {
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}

function shortenPieces(pieces: string[], maxTotal = 1200): string[] {
  const shortened = pieces.map((p) => (p.length > 80 ? p.slice(0, 80).replace(/\s+\S*$/, "") + "..." : p));
  let total = 0;
  const out: string[] = [];
  for (const p of shortened) {
    if (total + p.length > maxTotal) break;
    out.push(p);
    total += p.length + 2;
  }
  return out.length ? out : shortened.slice(0, 3);
}

function buildLookPrompt(lookName: string | undefined, pieces: string[], occasion?: string, ctx?: StyleContext, _withFace?: boolean): string {
  const safePieces = shortenPieces(pieces.map(String));
  const piecesDescription = safePieces.join(", ");
  const occasionText = occasion ? ` for a ${occasion} occasion` : "";
  const safeName = (lookName || "stylish look").slice(0, 80);
  return trimPrompt(`Luxury editorial flat-lay still life of the complete outfit "${safeName}"${occasionText}, composed of: ${piecesDescription}. Garments, shoes and accessories arranged as objects from above on a warm off-white linen surface, with natural folds, visible fabric weave, premium magazine styling, soft natural daylight, photorealistic catalog standard${buildStyleSuffix(ctx)}.`);
}

// ─── Lovable AI Gateway: gpt-image-2 (reliable primary) ───
async function callGptImage2(prompt: string, lovableApiKey: string): Promise<string> {
  const t0 = Date.now();
  console.log("[img] calling gpt-image-2");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt: prompt.slice(0, 1800),
      quality: "low",
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
    if (response.status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
    const errText = await response.text().catch(() => "");
    console.error(`[img] gpt-image-2 ${response.status} in ${Date.now() - t0}ms:`, errText.slice(0, 300));
    throw new Error(`GPT_IMAGE_2_ERROR_${response.status}`);
  }
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || b64.length < 5000) throw new Error("gpt-image-2 returned empty image");
  console.log(`[img] gpt-image-2 ok in ${Date.now() - t0}ms`);
  return `data:image/png;base64,${b64}`;
}

// ─── Pollinations free turbo endpoint (no API key needed) ───
async function callPollinationsFree(prompt: string): Promise<string> {
  const t0 = Date.now();
  const safePrompt = prompt.slice(0, 1800);
  const u = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}`);
  u.searchParams.set("model", "turbo");
  u.searchParams.set("nologo", "true");
  u.searchParams.set("private", "true");
  u.searchParams.set("safe", "true");
  u.searchParams.set("enhance", "false");
  u.searchParams.set("width", "512");
  u.searchParams.set("height", "512");
  u.searchParams.set("seed", String(Math.floor(Math.random() * 1_000_000_000)));

  console.log("[img] calling pollinations free turbo");
  const res = await fetch(u.toString(), { headers: { "User-Agent": "Estelite/1.0" } });
  if (!res.ok) {
    console.error(`[img] pollinations ${res.status} in ${Date.now() - t0}ms`);
    if (res.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
    throw new Error(`POLLINATIONS_ERROR_${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 5000) throw new Error("Pollinations returned empty image");
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunkSize)));
  }
  console.log(`[img] pollinations ok in ${Date.now() - t0}ms`);
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

// ─── Nano Banana via Lovable AI Gateway (chat-completions image shape) ───
async function callNanoBananaImageGeneration(prompt: string, lovableApiKey: string): Promise<string> {
  const t0 = Date.now();
  console.log("[img] calling nano-banana");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      modalities: ["image", "text"],
    }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
    if (response.status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
    const errText = await response.text().catch(() => "");
    console.error(`[img] nano-banana ${response.status} in ${Date.now() - t0}ms:`, errText.slice(0, 300));
    throw new Error(`NANO_BANANA_ERROR_${response.status}`);
  }
  const data = await response.json();
  const dataUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("No image returned by Nano Banana");
  }
  console.log(`[img] nano-banana ok in ${Date.now() - t0}ms`);
  return dataUrl;
}

function decodeBase64Image(imageData: string) {
  const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) throw new Error("Invalid image data format");
  const ext = base64Match[1];
  const base64 = base64Match[2];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return { ext, bytes };
}

function isManagedCatalogUrl(imageUrl: string, supabaseUrl: string): boolean {
  return imageUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/${CLOTHING_BUCKET}/`);
}

function metadataMatchesCache(cached: Record<string, unknown>, metadata?: PieceMetadata): boolean {
  if (!metadata) return true;

  const comparableFields: Array<keyof PieceMetadata> = ["category", "color", "fabric", "style"];

  return comparableFields.every((field) => {
    const expected = normalizeToken(metadata[field]);
    if (!expected) return true;
    return normalizeToken(String(cached[field] ?? "")) === expected;
  });
}

function isValidCachedImage(
  cached: Record<string, unknown>,
  expectedPrompt: string,
  supabaseUrl: string,
  metadata?: PieceMetadata,
): boolean {
  const imageUrl = String(cached.image_url ?? "");
  const promptUsed = String(cached.prompt_used ?? "");

  if (!imageUrl || !isManagedCatalogUrl(imageUrl, supabaseUrl)) return false;
  if (promptUsed !== expectedPrompt) return false;
  if (!metadataMatchesCache(cached, metadata)) return false;

  return true;
}

async function uploadImage(bytes: Uint8Array, ext: string, folder: string, diagnosisId: string | null, supabaseUrl: string, serviceRoleKey: string) {
  const scope = diagnosisId || "unscoped";
  const filePath = `${folder}/${scope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.storage
    .from(CLOTHING_BUCKET)
    .upload(filePath, bytes, {
      contentType: `image/${ext}`,
      upsert: true,
    });
  if (error) {
    console.error("Storage upload error:", JSON.stringify(error));
    throw new Error("Failed to upload image to storage");
  }
  return `${supabaseUrl}/storage/v1/object/public/${CLOTHING_BUCKET}/${filePath}`;
}

// ─── Generate image: gpt-image-2 → Nano Banana → Pollinations free ───
async function generateImage(
  pieceName: string,
  lovableApiKey: string | undefined,
  _pollinationsApiKey: string | undefined,
  ctx?: StyleContext,
  metadata?: PieceMetadata,
): Promise<{ imageData: string; source: string }> {
  const prompt = buildIsolatedPiecePrompt(pieceName, ctx, metadata);

  // Priority 1: gpt-image-2 (paid via Lovable, reliable, fast)
  if (lovableApiKey) {
    try {
      const imageData = await callGptImage2(prompt, lovableApiKey);
      return { imageData, source: "gpt-image-2" };
    } catch (error) {
      console.warn(`[img] gpt-image-2 failed for "${pieceName}":`, error instanceof Error ? error.message : error);
    }
  }

  // Priority 2: Nano Banana (also via Lovable AI Gateway)
  if (lovableApiKey) {
    try {
      const imageData = await callNanoBananaImageGeneration(prompt, lovableApiKey);
      return { imageData, source: "nano-banana" };
    } catch (error) {
      console.warn(`[img] nano-banana failed for "${pieceName}":`, error instanceof Error ? error.message : error);
    }
  }

  // Priority 3: Pollinations free turbo (no key, can be flaky)
  try {
    const imageData = await callPollinationsFree(prompt);
    return { imageData, source: "pollinations-free" };
  } catch (error) {
    console.warn(`[img] pollinations failed for "${pieceName}":`, error instanceof Error ? error.message : error);
  }

  throw new Error("IMAGE_GENERATION_UNAVAILABLE");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lookName, pieces, occasion, singlePiece, metadata, styleContext, diagnosisId, nonce } = await req.json();

    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return new Response(JSON.stringify({ error: "No pieces provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const POLLINATIONS_API_KEY = Deno.env.get("POLLINATIONS_API_KEY");
    if (!LOVABLE_API_KEY) console.warn("[img] LOVABLE_API_KEY missing — will rely on Pollinations free only");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isSinglePiece = Boolean(singlePiece || pieces.length === 1);
    const pieceName = String(pieces[0] || "").trim();
    const pieceMetadata: PieceMetadata | undefined = metadata && typeof metadata === "object" ? metadata : undefined;
    const ctx: StyleContext | undefined = styleContext && typeof styleContext === "object" ? styleContext : undefined;
    const diagId = typeof diagnosisId === "string" && diagnosisId ? diagnosisId : null;

    if (isSinglePiece) {
      const normalizedKey = normalizePieceKey(pieceName, pieceMetadata, ctx);
      const standardizedPrompt = buildIsolatedPiecePrompt(pieceName, ctx, pieceMetadata);

      // Cache lookup is now scoped per diagnosis only — never reuse images across diagnoses.
      // If a `nonce` is provided (manual retry), bypass cache to force a fresh generation.
      if (diagId && !nonce) {
        const cacheCheckRes = await fetch(
          `${SUPABASE_URL}/rest/v1/clothing_images?diagnosis_id=eq.${encodeURIComponent(diagId)}&normalized_key=eq.${encodeURIComponent(normalizedKey)}&select=image_url&order=created_at.desc&limit=1`,
          { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } },
        );
        if (cacheCheckRes.ok) {
          const cached = await cacheCheckRes.json();
          const hit = Array.isArray(cached) && cached[0]?.image_url;
          if (hit) {
            return new Response(JSON.stringify({ imageUrl: hit, validated: true, source: "cache-per-diagnosis" }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Generate fresh image (Pollinations → Nano Banana, no global reuse)
      const { imageData, source } = await generateImage(pieceName, LOVABLE_API_KEY, POLLINATIONS_API_KEY, ctx, pieceMetadata);

      const { ext, bytes } = decodeBase64Image(imageData);
      if (bytes.byteLength < 10_000) {
        throw new Error("Generated image is incomplete");
      }
      const publicUrl = await uploadImage(bytes, ext, "piece-images", diagId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Save scoped to diagnosis (NOT NULL on diagnosis_id enforced by schema).
      if (diagId) {
        const insertBody: Record<string, unknown> = {
          piece_key: `${pieceName}__${normalizedKey}`,
          normalized_key: normalizedKey,
          description: pieceName,
          image_url: publicUrl,
          prompt_used: standardizedPrompt,
          diagnosis_id: diagId,
        };
        if (pieceMetadata?.category) insertBody.category = pieceMetadata.category;
        if (pieceMetadata?.color) insertBody.color = pieceMetadata.color;
        if (pieceMetadata?.fabric) insertBody.fabric = pieceMetadata.fabric;
        if (pieceMetadata?.style) insertBody.style = pieceMetadata.style;

        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/clothing_images`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(insertBody),
        });
        if (!insertRes.ok) console.warn("Failed to persist piece image:", await insertRes.text());
      }

      return new Response(JSON.stringify({ imageUrl: publicUrl, validated: true, source }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look (multi-piece) generation — privacy-safe flat lay only
    const lookPrompt = buildLookPrompt(lookName, pieces.map(String), occasion, ctx, false);
    console.log("[img] generating look:", lookName);

    let generatedImageData: string | undefined;
    let source = "";

    // 1) gpt-image-2 (Lovable AI Gateway, reliable primary)
    if (LOVABLE_API_KEY) {
      try {
        generatedImageData = await callGptImage2(lookPrompt, LOVABLE_API_KEY);
        source = "gpt-image-2";
      } catch (err) {
        console.warn("[img] gpt-image-2 look failed:", err instanceof Error ? err.message : err);
      }
    }

    // 2) Nano Banana fallback
    if (!generatedImageData && LOVABLE_API_KEY) {
      try {
        generatedImageData = await callNanoBananaImageGeneration(lookPrompt, LOVABLE_API_KEY);
        source = "nano-banana";
      } catch (err) {
        console.warn("[img] nano-banana look failed:", err instanceof Error ? err.message : err);
      }
    }

    // 3) Pollinations free (last resort)
    if (!generatedImageData) {
      try {
        generatedImageData = await callPollinationsFree(lookPrompt);
        source = "pollinations-free";
      } catch (err) {
        console.warn("[img] pollinations look failed:", err instanceof Error ? err.message : err);
      }
    }

    if (!generatedImageData) {
      throw new Error("IMAGE_GENERATION_UNAVAILABLE");
    }

    const { ext, bytes } = decodeBase64Image(generatedImageData);
    const publicUrl = await uploadImage(bytes, ext, "look-images", diagId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    return new Response(JSON.stringify({ imageUrl: publicUrl, validated: false, source }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-look-image error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "RATE_LIMIT_EXCEEDED" ? 429
      : message === "AI_CREDITS_EXHAUSTED" ? 402
      : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});