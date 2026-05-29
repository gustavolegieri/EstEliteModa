import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log("Fetching image:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Image fetch failed:", response.status, response.statusText, "URL:", url);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log("Image fetched, size:", arrayBuffer.byteLength);
    const bytes = new Uint8Array(arrayBuffer);
    // Process in chunks to avoid stack overflow on large images
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

// Free, unlimited Pollinations.ai (flux) — positive-only prompts (diffusion models invert negations).
// We strip any negative phrasing from the caller's prompt to avoid summoning faces/people.
function stripNegations(text: string): string {
  return text
    // Remove sentences that mention banned subjects in any way
    .replace(/[^.!?\n]*\b(no\s+(people|person|human|face|head|eye|nose|mouth|skin|hair|hand|arm|leg|feet|foot|body|model|silhouette|portrait|display\s+figure|dress\s+form|mannequin|child|men|man|woman)s?|without\s+(people|person|human|face|body|model)|zero\s+(humans?|people|faces?|body)|absolutely\s+no\s+\w+|no\s+visible\s+\w+|privacy\s+(rule|lock)|client\s+context|consistency\s+check|must\s+not\s+show|frame\s+(id|code)|sem\s+(rosto|pessoa|modelo|corpo|cabe[çc]a|pele|cabelo|m[ãa]os?))[^.!?\n]*[.!?]?/gi, " ")
    // Remove any remaining banned tokens
    .replace(/\b(no\s+people|no\s+person|no\s+human|no\s+face|no\s+head|no\s+model|no\s+body|no\s+skin|no\s+hair|mannequin|dress\s+form|display\s+figure|portrait|selfie|street[-\s]?style\s+scene|candid)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
async function callPollinationsSectionImage(
  prompt: string,
  _apiKey: string | undefined,
  _faceImageUrl: string | null,
  seed: number,
): Promise<{ b64: string; contentType: string }> {
  const safePrompt = stripNegations(prompt).slice(0, 480);

  const buildUrl = (s: number) => {
    const u = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}`);
    u.searchParams.set("model", "flux");
    u.searchParams.set("nologo", "true");
    u.searchParams.set("width", "1024");
    u.searchParams.set("height", "1024");
    u.searchParams.set("seed", String(s));
    u.searchParams.set("private", "true");
    u.searchParams.set("cacheBust", String(s));
    return u.toString();
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const attemptSeed = seed + attempt * 7919;
    try {
      const res = await fetchWithTimeout(buildUrl(attemptSeed), {
        headers: { "User-Agent": "CreateWithJoy/1.0", Accept: "image/*" },
      }, 90000);
      if (!res.ok) {
        lastErr = new Error(`Pollinations ${res.status}`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 5000) {
        lastErr = new Error("Pollinations returned tiny payload");
        continue;
      }
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
      }
      return { b64: btoa(binary), contentType };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Pollinations free section image failed");
}

function buildPollinationsImageUrl(prompt: string, seed: number): string {
  const safePrompt = stripNegations(prompt).replace(/\s+/g, " ").trim().slice(0, 900);
  const u = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}`);
  u.searchParams.set("width", "1024");
  u.searchParams.set("height", "1024");
  u.searchParams.set("model", "flux");
  u.searchParams.set("nologo", "true");
  u.searchParams.set("seed", String(seed));
  u.searchParams.set("private", "true");
  u.searchParams.set("cacheBust", String(seed));
  return u.toString();
}

function stableNumericSeed(...parts: unknown[]): number {
  const input = parts.map((part) => JSON.stringify(part ?? "")).join("|");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) + 1000;
}

function stringList(value: unknown, max = 4): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).slice(0, max);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => stringList(item, max)).slice(0, max);
  }
  return value ? [String(value)] : [];
}

function buildPersonalizedSectionImagePlan(args: {
  diagnosisId: string;
  questionnaire: Record<string, unknown>;
  bodyAnalysis: Record<string, unknown> | undefined;
  colorAnalysis: Record<string, unknown> | undefined;
  styleAnalysis: Record<string, unknown> | undefined;
  wardrobeEssentials: Record<string, unknown> | undefined;
  capsuleWardrobe: Record<string, unknown> | undefined;
  finalDiagnosis: Record<string, unknown> | undefined;
  personalizedBriefs?: Record<string, string>;
}): { prompts: Record<string, string>; urls: Record<string, string>; seedBase: number; sectionSalt: Record<string, number> } {
  const styleId = String(
    args.styleAnalysis?.estilo_predominante ||
    args.styleAnalysis?.estilo_principal ||
    args.styleAnalysis?.identidade_estilo ||
    args.styleAnalysis?.estilo ||
    stringList(args.questionnaire.preferences, 2).join(" ") ||
    "elegant feminine"
  );
  const seasonStr = String(args.colorAnalysis?.estacao || args.colorAnalysis?.coloracao_pessoal || args.colorAnalysis?.paleta_nome || "soft natural");
  const paletteValues = stringList(
    args.colorAnalysis?.paleta_cores_ideais || args.colorAnalysis?.paleta || args.colorAnalysis?.cores_recomendadas,
    6,
  );
  const paletteStr = paletteValues.length ? paletteValues.join(", ") : "neutral tones";
  const bodyStr = String(args.bodyAnalysis?.tipo_corporal || args.bodyAnalysis?.biotipo || args.questionnaire.bodyType || "feminine silhouette");
  const heightStr = String(args.questionnaire.heightCm || args.questionnaire.height || "height not specified");
  const weightStr = String(args.questionnaire.weightKg || "weight not specified");
  const topSizeStr = String(args.questionnaire.topSize || "top size not specified");
  const bottomSizeStr = String(args.questionnaire.bottomSize || "bottom size not specified");
  const shoeSizeStr = String(args.questionnaire.shoeSize || "shoe size not specified");
  const skinToneStr = String(args.questionnaire.skinTone || "not rendered");
  const eyeColorStr = String(args.questionnaire.eyeColor || "not rendered");
  const hairColorStr = String(args.questionnaire.hairColor || "not rendered");
  const fitPreferenceStr = String(args.questionnaire.fitPreference || "balanced fit");
  const bodyNotesStr = String(args.questionnaire.bodyNotes || args.questionnaire.challenges || "no extra body notes");
  const formalityStr = String(args.questionnaire.formalityLevel || args.questionnaire.formality_level || args.questionnaire.profession || "smart casual");
  const climateStr = String(args.questionnaire.climate || "adapted climate");
  const professionStr = String(args.questionnaire.profession || "modern routine");
  const essentialNames: string[] = Array.isArray((args.wardrobeEssentials as any)?.pecas_essenciais)
    ? (args.wardrobeEssentials as any).pecas_essenciais.slice(0, 5).map((p: any) => String(p?.peca || p?.nome || p?.name || p)).filter(Boolean)
    : [];
  const firstLookName: string = (() => {
    const cats = args.capsuleWardrobe ? Object.values(args.capsuleWardrobe as Record<string, unknown>) : [];
    for (const c of cats) {
      if (Array.isArray(c) && (c[0] as any)?.nome) return String((c[0] as any).nome);
    }
    return essentialNames.slice(0, 3).join(", ") || "signature look";
  })();

  const seedBase = stableNumericSeed(args.diagnosisId, styleId, seasonStr, paletteStr, bodyStr, professionStr, skinToneStr, eyeColorStr, hairColorStr, heightStr, weightStr, topSizeStr, bottomSizeStr, shoeSizeStr, essentialNames);
  const sectionSalt: Record<string, number> = { resumo: 11, corpo: 23, cores: 37, estilo: 41, modelagens: 53, essenciais: 67, capsula: 79 };
  // ===== Reusable rule blocks (consistency tests) =====
  const NO_PEOPLE = `ABSOLUTE PRIVACY RULE — NO people, NO human figure, NO face, NO head, NO eyes, NO nose, NO mouth, NO skin, NO hair, NO hands, NO arms, NO legs, NO feet, NO visible body parts, NO model, NO visible display figure, NO dress form. If a human or face would appear, replace it with flat-lay garments, hangers, swatches, objects, or invisible internal garment support only.`;
  const NO_TEXT = `HARD RULE — NO text, NO typography, NO words, NO letters, NO numbers, NO logos, NO brand marks, NO watermarks, NO captions, NO tags, NO labels of any kind anywhere in the image.`;
  const PALETTE_LOCK = `COLOR LOCK — Every visible color in the frame MUST come from this palette: ${paletteStr}. Background is warm off-white / cream / soft linen neutral. Do NOT introduce colors outside this palette (no random reds, blues, greens unless they are in the palette).`;
  const FEMININE_LOCK = `AUDIENCE LOCK — Womenswear ONLY. No menswear cuts, no unisex streetwear, no children's clothing, no sportswear unless explicitly asked.`;
  const QUALITY = `RENDER QUALITY — Premium fashion magazine reference, Vogue/Harper's Bazaar editorial, sharp focus, natural soft daylight, subtle shadows, refined composition, color-accurate, photorealistic still life unless illustration is explicitly requested.`;
  const FRAME = `FRAME ID — ${args.diagnosisId}.`;

  const briefs = args.personalizedBriefs || {};
  const sanitizeVisualBrief = (value: string) => value
    .replace(/\b(modelo|model|pessoa|person|mulher|woman|corpo humano|human body|silhueta humana|human silhouette|rosto|face|cabeça|head|olhos|eyes|nariz|nose|boca|mouth|queixo|chin|pescoço|neck|pele|skin|cabelo|hair|mãos|hands|braços|arms|pernas|legs|pés|feet|retrato|portrait|selfie|manequim|mannequin|busto|dress form|avatar)\b/gi, "composição de roupas e objetos")
    .replace(/\s+/g, " ")
    .trim();

  // ===== Elite Editorial photography rules (Vogue / Harper's Bazaar quality) =====
  const REALISM = `ULTRA-REALISM — photorealistic, hyper-detailed, sharp focus, fine fabric weave visible, natural textile texture, premium material detail, NO plastic AI sheen, NO waxy surfaces, NO uncanny human features.`;
  const FEMININE_ONLY = `AUDIENCE LOCK — Womenswear ONLY, adult feminine garments and styling. No menswear, no children, no unisex streetwear unless explicitly requested.`;
  const NO_TEXT_RULE = `NO text, NO typography, NO words, NO letters, NO numbers, NO logos, NO brand marks, NO watermarks, NO captions, NO tags, NO labels anywhere in the frame.`;
  const PALETTE_RULE = `COLOR LOCK — Every visible color in wardrobe, props and styling MUST belong to this palette: ${paletteStr}. Do NOT introduce colors outside this palette (no red unless red is in the palette, no blue unless blue is in the palette, etc.).`;
  const NO_FACE_RULE = `ABSOLUTE PRIVACY LOCK — The image must contain ZERO human faces and ZERO human body parts. Do NOT render a person from front, side, back, profile, cropped, blurred, reflected, illustrated, photographed, or partially visible. NO eyes, nose, mouth, chin, neck, skin, hair, hands, arms, legs, feet, silhouettes, shadows of people, posters with faces, paintings with faces, display figures with heads, dolls, avatars, or body fragments.`;
  const CLIENT_CONTEXT = `CLIENT CONTEXT (must guide styling only, never render the client): biotype ${bodyStr} (~${heightStr}cm, sizes top ${topSizeStr} / bottom ${bottomSizeStr}), season ${seasonStr}, style identity "${styleId}", profession ${professionStr}, formality ${formalityStr}, climate ${climateStr}, fit preference ${fitPreferenceStr}.`;
  const FRAME_ID = `Unique frame code ${args.diagnosisId}.`;

  // Positive-only template — diffusion models invert negations, so we describe ONLY what we want.
  const tpl = (section: string, scene: string, style: string) => {
    const personalized = briefs[section] ? sanitizeVisualBrief(briefs[section]) : "";
    return [
      scene,
      personalized ? `Inspired by: ${personalized.slice(0, 200)}.` : "",
      style,
      `Palette strictly: ${paletteStr}.`,
      `Warm off-white linen background.`,
    ].filter(Boolean).join(" ");
  };

  const seasonMood = (() => {
    const s = (seasonStr || "").toLowerCase();
    if (s.includes("inverno") || s.includes("winter")) return "icy off-white linen, cool crisp daylight, glass and chrome accents";
    if (s.includes("outono") || s.includes("autumn") || s.includes("fall")) return "warm terracotta linen, golden hour light, brass and aged leather accents";
    if (s.includes("primavera") || s.includes("spring")) return "creamy linen, soft morning light, fresh botanical and pearl accents";
    return "muted dusty pastel linen, diffused overcast light, brushed silver and stone accents";
  })();

  // All prompts are POSITIVE-ONLY object/garment still lifes tied to each tab's theme.
  const prompts: Record<string, string> = {
    resumo: tpl(
      "resumo",
      `Top-down flat-lay 3x3 grid on polished travertine marble: row 1 — five hand-painted color swatches, a folded silk scarf, a ceramic vase; row 2 — a folded cashmere sweater, fabric weave macro detail, a delicate gold chain on a tray; row 3 — a pair of minimalist leather loafers, a dried eucalyptus sprig, a small perfume bottle. Generous negative space, museum curation rhythm.`,
      `Vermeer-style soft side window light, overhead 90° shot, Vogue editorial still life, photorealistic, magazine color grading.`,
    ),
    corpo: tpl(
      "corpo",
      `Luxury atelier flat-lay on warm plaster surface showing garment architecture for a ${bodyStr} silhouette with ${fitPreferenceStr} fit: a folded structured wool blazer, fluid silk trousers laid flat with crisp center crease, a bias-cut skirt arranged in soft folds, a curled vintage measuring tape, white tailoring chalk, brass pins, three fabric swatches. Garments reveal cut, dart placement, proportional lines.`,
      `Editorial atelier still life, soft sculpting side light, Phase One XF 100MP, 85mm lens, sharp focus on seams and drape, photorealistic.`,
    ),
    cores: tpl(
      "cores",
      `Macro still life: cascading drapes of premium silk, cashmere and fine wool in every tone of the palette overlap across the surface; five to seven Pantone-style swatch cards in a row; a folded fabric stack; a delicate gold pearl earring on a marble tray; a luxury lipstick in a palette tone. Setting follows ${seasonMood}.`,
      `Macro fashion still life, Phase One 120mm at f/4, Harper's Bazaar color story, photorealistic, professional color grading.`,
    ),
    estilo: tpl(
      "estilo",
      `Curated editorial mood board flat-lay representing the "${styleId}" aesthetic: a folded signature garment, an art book opened to an abstract spread, a silk scarf draped diagonally, sunglasses, a leather card holder, a small ceramic sculpture, dried flowers, polaroids of architecture and textures, a wax-sealed envelope.`,
      `Cinematic golden-hour sidelight, 35mm film grain, Leica color science, photorealistic editorial still life of objects.`,
    ),
    modelagens: tpl(
      "modelagens",
      `Editorial atelier garment rack viewed straight on: five womenswear pieces hanging on matching pale-wood and brushed-brass hangers with clear spacing — a tailored blazer with open lapel, fluid wide-leg trousers folded over the hanger bar, a bias-cut midi skirt, a midi slip dress, a structured silk blouse. Natural drape clearly visible, warm plaster atelier wall behind, sliver of polished wood floor.`,
      `Editorial atelier photography, eye-level shot, soft side-window daylight grazing across fabrics, sharp focus on construction, photorealistic, Phase One XF.`,
    ),
    essenciais: tpl(
      "essenciais",
      `Luxury e-commerce catalog flat-lays of the wardrobe essentials${essentialNames.length ? ` (${essentialNames.slice(0,5).join(", ")})` : ""} arranged as a clean grid on a pure white seamless cyclorama: each garment laid perfectly flat from above with crisp folds, visible hardware, stitching and fabric weave, evenly spaced, faint contact shadow only.`,
      `Net-a-Porter luxury e-commerce photography, pure white cyclorama, even soft lighting, sharp focus, photorealistic catalog standard.`,
    ),
    capsula: tpl(
      "capsula",
      `Complete capsule look "${firstLookName}" arranged as a flat-lay on warm off-white linen: a folded top and trousers (or a midi dress laid flat), folded outerwear if climate ${climateStr} requires it, beside a coordinated flat lay of a pair of leather shoes, a handbag, a folded silk scarf, a fine jewelry piece on a tray. Garments arranged to show silhouette, seams and drape.`,
      `Editorial fashion styling flat-lay still life, soft natural daylight, premium magazine layout, photorealistic, Phase One XF 100MP, 50mm.`,
    ),
  };

  const urls = Object.fromEntries(
    Object.entries(prompts).map(([section, prompt]) => {
      const sectionSeed = seedBase + (sectionSalt[section] || 1) * 1009;
      return [section, buildPollinationsImageUrl(`${prompt} Unique frame code ${args.diagnosisId}-${section}-${sectionSeed}.`, sectionSeed)];
    }),
  ) as Record<string, string>;

  return { prompts, urls, seedBase, sectionSalt };
}

// ─── Hugging Face face swap (free, public Space "tonyassi/face-swap") ───
// Uses Gradio queue API: POST /gradio_api/call/predict → returns event_id
// Then GET /gradio_api/call/predict/{event_id} streams the result (SSE)
async function callHuggingFaceFaceSwap(
  hfToken: string,
  faceUrl: string,
  targetUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const SPACE = "https://tonyassi-face-swap.hf.space";
  const authHeaders = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
  const uploadRemoteImage = async (url: string, filename: string) => {
    const sourceRes = await fetchWithTimeout(url, {
      headers: { "User-Agent": "CreateWithJoy/1.0", Accept: "image/*" },
    }, 90000);
    if (!sourceRes.ok) throw new Error(`source image fetch failed ${sourceRes.status}`);
    const contentType = sourceRes.headers.get("content-type") || "image/jpeg";
    const form = new FormData();
    form.append("files", new Blob([await sourceRes.arrayBuffer()], { type: contentType }), filename);
    const uploadRes = await fetchWithTimeout(`${SPACE}/gradio_api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: form,
    }, 90000);
    if (!uploadRes.ok) throw new Error(`HF upload failed ${uploadRes.status} ${(await uploadRes.text()).slice(0, 160)}`);
    const uploaded = await uploadRes.json();
    const path = Array.isArray(uploaded) ? uploaded[0] : uploaded?.[0];
    if (!path) throw new Error("HF upload returned no path");
    return { path, orig_name: filename, mime_type: contentType, meta: { _type: "gradio.FileData" } };
  };

  try {
    // This Space fails with direct remote URLs; upload both files to Gradio first, then call swap_faces.
    const [sourceFile, targetFile] = await Promise.all([
      uploadRemoteImage(faceUrl, "source-face.jpg"),
      uploadRemoteImage(targetUrl, "target-image.jpg"),
    ]);

    const submitRes = await fetchWithTimeout(
      `${SPACE}/gradio_api/call/swap_faces`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ data: [sourceFile, targetFile] }),
      },
      45000,
    );
    if (!submitRes.ok) {
      console.warn(`HF face-swap submit failed: ${submitRes.status} ${(await submitRes.text()).slice(0, 200)}`);
      return null;
    }
    const submitJson = await submitRes.json();
    const eventId: string | undefined = submitJson?.event_id;
    if (!eventId) return null;

    // Poll the SSE result endpoint (treat as plain text stream)
    const resultRes = await fetchWithTimeout(
      `${SPACE}/gradio_api/call/swap_faces/${eventId}`,
      { method: "GET", headers: authHeaders },
      120000,
    );
    if (!resultRes.ok || !resultRes.body) {
      console.warn(`HF face-swap poll failed: ${resultRes.status}`);
      return null;
    }

    const reader = resultRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let outputUrl: string | null = null;
    let lastEvent = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("event:")) lastEvent = line.slice(6).trim();
        else if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();
          if (lastEvent === "complete") {
            try {
              const parsed = JSON.parse(dataStr);
              const first = Array.isArray(parsed) ? parsed[0] : parsed;
              outputUrl = first?.url || first?.path || (typeof first === "string" ? first : null);
            } catch { /* ignore */ }
            break;
          }
          if (lastEvent === "error") {
            console.warn("HF face-swap error event:", dataStr.slice(0, 200));
            return null;
          }
        }
      }
      if (outputUrl) break;
    }

    if (!outputUrl) return null;
    if (!outputUrl.startsWith("http")) outputUrl = `${SPACE}/gradio_api/file=${outputUrl.replace(/^\//, "")}`;

    const imgRes = await fetchWithTimeout(outputUrl, { headers: authHeaders }, 60000);
    if (!imgRes.ok) return null;
    return {
      bytes: new Uint8Array(await imgRes.arrayBuffer()),
      contentType: imgRes.headers.get("content-type") || "image/webp",
    };
  } catch (err) {
    console.warn("HF face-swap exception:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function callOpenAI(
  apiKey: string,
  images: { url: string; type: string }[],
  prompt: string,
  maxRetries = 1
): Promise<string> {
  const hasImages = images.length > 0;
  const model = hasImages ? "gpt-4o" : "gpt-4o-mini";

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  > = [];

  for (const img of images) {
    if (img.url && img.url.startsWith("data:")) {
      userContent.push({
        type: "image_url",
        image_url: { url: img.url, detail: "low" },
      });
    }
  }
  userContent.push({ type: "text", text: prompt });

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "Você é uma consultora de imagem feminina de altíssimo nível, sênior em moda editorial, alfaiataria, coloração pessoal e curadoria de armário. Suas análises são DETALHADAS, ESPECÍFICAS, NUNCA genéricas e NUNCA repetitivas entre clientes. Use vocabulário técnico de moda (decotes, gramaturas, modelagens, tons), cite referências concretas (designers, marcas, ícones), traga 5-10 opções diversas em cada lista, varie sinônimos, evite clichês como 'versátil', 'atemporal', 'elegante' isolados — sempre justifique. Responda SEMPRE em JSON válido em português do Brasil, seguindo exatamente a estrutura solicitada.",
      },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.95,
    top_p: 0.95,
    presence_penalty: 0.6,
    frequency_penalty: 0.5,
    max_tokens: hasImages ? 2600 : 2200,
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      }, hasImages ? 28000 : 18000);
    } catch (error) {
      console.warn(`OpenAI request timed out/failed, retry ${attempt + 1}/${maxRetries}`, error);
      if (attempt < maxRetries) continue;
      throw new Error("AI_TIMEOUT");
    }

    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Math.min(20, (attempt + 1) * 5);
      console.warn(`OpenAI ${response.status}, retry ${attempt + 1}/${maxRetries} after ${retryAfter}s`);
      await response.text();
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new Error(response.status === 429 ? "QUOTA_EXHAUSTED" : `OpenAI ${response.status}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      console.error("No text in OpenAI response:", JSON.stringify(data));
      throw new Error("Empty response from OpenAI");
    }
    return text;
  }

  throw new Error("QUOTA_EXHAUSTED");
}

const CLICHE_RE = /(camisa\s+branca|cal[cç]a\s+preta|blazer\s+preto|scarpin\s+nude|vestido\s+midi\s+(preto|b[aá]sico)|camiseta\s+branca|saia\s+l[aá]pis\s+preta)/i;
const REQUIRED_CATEGORIES = ["top", "bottom", "calcado", "terceira_peca", "coringa"] as const;

function collectPalette(colorAnalysis?: Record<string, unknown>): string[] {
  const source = colorAnalysis?.paleta_cores_ideais || colorAnalysis?.paleta || colorAnalysis?.cores_recomendadas;
  const values = stringList(source, 24)
    .map((value) => value.replace(/\s*\([^)]*\)/g, "").trim())
    .filter((value) => value.length > 2);
  return values.length ? values : ["azul petróleo", "ameixa suave", "verde oliva queimado", "cinza pomba", "champanhe rosado"];
}

function buildDiagnosticEssentials(args: {
  questionnaire: Record<string, unknown>;
  diagnosisId: string;
  styleAnalysis?: Record<string, unknown>;
  modelingAnalysis?: Record<string, unknown>;
  colorAnalysis?: Record<string, unknown>;
}) {
  const palette = collectPalette(args.colorAnalysis);
  const q = args.questionnaire;
  const seed = stableNumericSeed(args.diagnosisId, q.profession, q.climate, q.bodyType, q.topSize, q.bottomSize, q.skinTone, q.fitPreference);
  const pickLocal = <T,>(arr: T[], offset = 0): T => arr[(seed + offset * 37) % arr.length];
  const style = String(args.styleAnalysis?.estilo_predominante || args.styleAnalysis?.estilo || (Array.isArray(q.preferences) ? q.preferences.join(" ") : "sofisticado"));
  const body = String(args.modelingAnalysis?.cintura_ideal || args.modelingAnalysis?.silhueta_ideal || q.bodyType || "equilíbrio proporcional");
  const climate = String(q.climate || "meia-estação").toLowerCase();
  const isHot = /tropical|quente|summer|calor/.test(climate);
  const isCold = /frio|cold|winter/.test(climate);

  // Inferir vibe também no fallback determinístico
  const lifeText = `${String(q.formalityLevel || "")} ${String(q.lifestyle || "")} ${(Array.isArray(q.occasions) ? q.occasions.join(" ") : "")} ${String(q.profession || "")}`.toLowerCase();
  const budgetLow = String(q.budget || "").toLowerCase();
  const isFormalLife = /formal|black.?tie|gala|executiv|corporativo/.test(lifeText);
  const isCasualLife = /casual|dia.?a.?dia|home.?office|estudante|m[aã]e|aut[oô]nom|criat|freelanc|esport|academia/.test(lifeText);
  const isLuxBudget = /premium|luxo|high|alto/.test(budgetLow);
  const isLowBudget = /low|econ[oô]m|baixo|at[eé]\s*r?\$?\s*500/.test(budgetLow);
  const vibe: "casual" | "smart_casual" | "elegant" | "luxury" =
    isLuxBudget && isFormalLife ? "luxury" : isFormalLife ? "elegant" : (isCasualLife || isLowBudget) ? "casual" : "smart_casual";

  const POOLS = {
    casual: {
      top: ["camiseta de algodão pesado boyfriend", "blusa cropped de malha canelada", "regata estruturada decote canoa", "camisa de linho oversized", "moletom cropped"],
      bottom: ["calça wide-leg de algodão lavado", "saia midi de algodão", "calça cargo cintura alta", "bermuda alfaiataria curta", "jeans mom alto"],
      outer: ["jaqueta jeans oversized lavada", "cardigan de algodão amplo", "jaqueta utilitária com bolsos", "blazer-camisa desconstruído"],
      shoes: ["tênis branco minimalista de couro", "mocassim flat confortável", "sandália de tira plana", "bota coturno baixa"],
      wildcard: ["vestido camiseta midi", "macacão jardineira", "conjunto coordenado de moletom premium"],
      fabricTop: ["algodão pesado", "malha de algodão", "linho lavado", "modal macio"],
      fabricBottom: ["algodão lavado", "jeans confortável", "sarja stonewashed", "linho misto"],
      occasions: ["dia-a-dia", "passeios no fim de semana", "trabalho remoto", "encontros casuais", "viagens curtas"],
    },
    smart_casual: {
      top: ["blusa envelope com pregas diagonais", "camisa cropped com pala deslocada", "top de gola alta sem mangas", "camisa de viscose com nó frontal"],
      bottom: ["calça cenoura de cintura alta", "saia evasê midi", "calça pantacourt fluida", "jeans wide-leg alto"],
      outer: ["colete de alfaiataria alongado", "camisa-jacket utilitária", "blazer cropped descontraído", "cardigan longo de algodão"],
      shoes: ["mule slingback bico quadrado", "loafer feminino", "sandália bloco minimalista", "tênis de couro branco"],
      wildcard: ["vestido midi de viscose com cinto", "macacão de alfaiataria leve", "camisa-vestido fluida"],
      fabricTop: isHot ? ["linho lavado", "crepe de viscose", "algodão egípcio leve"] : isCold ? ["malha merino fina", "tricot canelado"] : ["popeline acetinada", "crepe fluido", "modal viscose"],
      fabricBottom: isHot ? ["sarja leve", "linho misto", "viscose alfaiatada"] : isCold ? ["lã fria", "gabardine encorpada"] : ["crepe alfaiataria", "sarja macia"],
      occasions: ["trabalho criativo", "almoços com clientes", "happy hours", "eventos diurnos casuais"],
    },
    elegant: {
      top: ["blusa envelope com pregas diagonais", "camisa cropped com pala deslocada", "top de gola alta sem mangas", "blusa túnica com punhos marcados"],
      bottom: ["calça cenoura de cintura alta", "pantalona com vinco frontal", "saia evasê midi com pala anatômica", "calça barrel alfaiataria"],
      outer: isCold ? ["casaco curto de lã batida", "jaqueta alongada de couro", "sobretudo leve com cinto"] : ["colete de alfaiataria alongado", "kimono-blazer de crepe", "jaqueta cropped estruturada"],
      shoes: ["mule slingback bico quadrado", "loafer com recorte alto", "sandália bloco minimalista", "bota sock de cano médio"],
      wildcard: ["vestido coluna com drapeado lateral", "macacão de alfaiataria fluida", "saia statement plissada"],
      fabricTop: isHot ? ["linho lavado", "crepe de viscose", "seda fosca"] : isCold ? ["malha merino fina", "tricot canelado", "crepe encorpado"] : ["popeline acetinada", "crepe fluido"],
      fabricBottom: isHot ? ["sarja leve", "linho misto", "gabardine fina"] : isCold ? ["lã fria", "gabardine encorpada", "tweed leve"] : ["crepe alfaiataria", "gabardine macia"],
      occasions: ["reuniões executivas", "jantares de trabalho", "eventos culturais", "compromissos diurnos elegantes"],
    },
    luxury: {
      top: ["blusa envelope de seda crepe", "camisa cropped de cashmere fino", "top coluna em cetim duquesa", "blusa drapeada de seda pesada"],
      bottom: ["calça reta sob medida em lã fria italiana", "saia coluna midi de crepe pesado", "pantalona de seda crepe", "calça barrel de tweed bouclé"],
      outer: ["sobretudo escultural em cashmere", "jaqueta alongada de couro nappa", "blazer-coat de lã italiana", "capa curta estruturada"],
      shoes: ["mule slingback de couro nappa", "loafer artesanal", "sandália escultural salto bloco"],
      wildcard: ["vestido coluna com drapeado em seda crepe", "terninho monocromático sob medida", "macacão de alfaiataria em seda"],
      fabricTop: ["cashmere puro", "seda crepe pesada", "musselina de seda", "tricot italiano"],
      fabricBottom: ["lã fria italiana", "couro nappa macio", "tweed bouclé refinado", "seda crepe pesada"],
      occasions: ["reuniões de alto nível", "jantares de gala íntimos", "viagens internacionais", "compromissos diplomáticos"],
    },
  } as const;
  const P = POOLS[vibe];
  const shoeFabrics = vibe === "casual" ? ["couro macio", "lona premium", "camurça lavada"] : vibe === "luxury" ? ["couro nappa italiano", "camurça refinada", "couro envernizado de luxo"] : ["couro nappa", "camurça premium", "verniz suave"];

  const mk = (categoria: typeof REQUIRED_CATEGORIES[number], name: string, color: string, fabric: string, offset: number) => ({
    peca: `${name} em ${fabric} ${color}`,
    cor: color,
    categoria,
    ocasiao: pickLocal(P.occasions as unknown as string[], offset),
    prioridade: "alta",
    porque: `Conecta ${style} com ${body}, respeitando clima, orçamento, vibe ${vibe} e proporções informadas.`,
  });

  return [
    mk("top", pickLocal(P.top as unknown as string[], 1), pickLocal(palette, 1), pickLocal(P.fabricTop as unknown as string[], 1), 1),
    mk("bottom", pickLocal(P.bottom as unknown as string[], 2), pickLocal(palette, 2), pickLocal(P.fabricBottom as unknown as string[], 2), 2),
    mk("calcado", pickLocal(P.shoes as unknown as string[], 3), pickLocal(palette, 3), pickLocal(shoeFabrics, 3), 3),
    mk("terceira_peca", pickLocal(P.outer as unknown as string[], 4), pickLocal(palette, 4), pickLocal(P.fabricBottom as unknown as string[], 4), 4),
    mk("coringa", pickLocal(P.wildcard as unknown as string[], 5), pickLocal(palette, 5), pickLocal([...(P.fabricTop as unknown as string[]), ...(P.fabricBottom as unknown as string[])], 5), 5),
  ];
}

function normalizeWardrobeEssentials(
  raw: Record<string, unknown> | undefined,
  questionnaire: Record<string, unknown>,
  diagnosisId: string,
  styleAnalysis?: Record<string, unknown>,
  modelingAnalysis?: Record<string, unknown>,
  colorAnalysis?: Record<string, unknown>,
) {
  const generated = buildDiagnosticEssentials({ questionnaire, diagnosisId, styleAnalysis, modelingAnalysis, colorAnalysis });
  const incoming = Array.isArray(raw?.pecas_essenciais) ? raw!.pecas_essenciais as Record<string, unknown>[] : [];
  const used = new Set<string>();
  const finalItems = REQUIRED_CATEGORIES.map((category, index) => {
    const candidate = incoming.find((item) => String(item?.categoria || "").toLowerCase() === category && typeof item?.peca === "string");
    const name = String(candidate?.peca || "").trim();
    const invalid = !name || name.length < 18 || CLICHE_RE.test(name) || used.has(name.toLowerCase());
    const item = invalid ? generated[index] : {
      peca: name,
      cor: String(candidate?.cor || generated[index].cor),
      categoria: category,
      ocasiao: String(candidate?.ocasiao || generated[index].ocasiao),
      prioridade: "alta",
      porque: String(candidate?.porque || generated[index].porque),
    };
    used.add(item.peca.toLowerCase());
    return item;
  });

  const byCategory = (category: string) => finalItems.filter((item) => item.categoria === category).map((item) => item.peca);
  return {
    ...raw,
    pecas_essenciais: finalItems,
    tops_essenciais: finalItems.filter((item) => item.categoria === "top"),
    bottoms_essenciais: finalItems.filter((item) => item.categoria === "bottom"),
    calcados_essenciais: finalItems.filter((item) => item.categoria === "calcado"),
    tercas_pecas: finalItems.filter((item) => item.categoria === "terceira_peca"),
    vestidos_essenciais: finalItems.filter((item) => item.categoria === "coringa" && /vestido|macac[aã]o|saia/i.test(item.peca)),
    acessorios_essenciais: finalItems.filter((item) => item.categoria === "coringa" && !/vestido|macac[aã]o|saia/i.test(item.peca)),
    total_pecas: 5,
    investimento_sugerido: String(raw?.investimento_sugerido || `Estratégia ${questionnaire.budget || "personalizada"}: comprar 2 peças de maior impacto primeiro e completar por ocasião.`),
    _capsule_groups: {
      tops: byCategory("top"), bottoms: byCategory("bottom"), calcados: byCategory("calcado"), tercas_pecas: byCategory("terceira_peca"), coringas: byCategory("coringa"),
    },
  };
}

function normalizeCapsuleWardrobe(raw: Record<string, unknown> | undefined, essentials: Record<string, unknown>, questionnaire: Record<string, unknown>, diagnosisId: string) {
  const pieces = (essentials.pecas_essenciais as Array<Record<string, string>> || []).map((item) => item.peca).filter(Boolean);
  const groups = essentials._capsule_groups as Record<string, string[]> | undefined;
  const seed = stableNumericSeed(diagnosisId, pieces, questionnaire.profession, questionnaire.occasions);
  const names = ["Arquitetura do Dia", "Linha de Presença", "Ritual Urbano", "Contraste Assinado", "Eixo Elegante", "Cena de Autoria"];
  const occasion = String((Array.isArray(questionnaire.occasions) && questionnaire.occasions[0]) || questionnaire.profession || "rotina principal");
  const look = {
    nome: names[seed % names.length],
    pecas: pieces.slice(0, 5),
    ocasiao: occasion,
    dicas_styling: [
      "Use as peças com respiro visual e uma dobra estratégica na terceira peça.",
      "Repita a cor principal em dois pontos para criar continuidade.",
      "Ajuste a proporção superior/inferior conforme a modelagem indicada no diagnóstico.",
    ],
  };
  const bucket = /trabalho|office|execut|profiss|reuni/i.test(occasion) ? "looks_trabalho" : /evento|jantar|festa|social/i.test(occasion) ? "looks_eventos" : "looks_casual";
  return {
    ...raw,
    conceito_capsula: String(raw?.conceito_capsula || "Cápsula construída exclusivamente a partir das 5 peças essenciais deste diagnóstico, sem reaproveitar peças-padrão."),
    pecas_capsula: {
      quantidade_total: "5",
      tops: groups?.tops || [],
      bottoms: groups?.bottoms || [],
      vestidos: (groups?.coringas || []).filter((p) => /vestido|macac[aã]o/i.test(p)),
      tercas_pecas: groups?.tercas_pecas || [],
      calcados: groups?.calcados || [],
      bolsas: (groups?.coringas || []).filter((p) => /bolsa|cinto/i.test(p)),
    },
    looks_trabalho: bucket === "looks_trabalho" ? [look] : [],
    looks_casual: bucket === "looks_casual" ? [look] : [],
    looks_eventos: bucket === "looks_eventos" ? [look] : [],
    combinacoes_possiveis: "8-12",
    dicas_organizacao: ["Separe por ocasião real da rotina", "Fotografe o look montado", "Revise substituições apenas dentro da paleta indicada"],
  };
}

// Deterministic fallback when AI quota is exhausted
function generateDeterministicAnalysis(questionnaire: Record<string, unknown>, diagnosisId = crypto.randomUUID()) {
  const bodyType = String(questionnaire.bodyType || "retangulo");
  const bodyTypeMap: Record<string, string> = {
    "hourglass": "Ampulheta", "inverted-triangle": "Triângulo Invertido",
    "triangle": "Triângulo", "rectangle": "Retângulo", "oval": "Oval",
  };
  const tipoCorpName = bodyTypeMap[bodyType] || "Retângulo";

  const bodyAnalysis = {
    tipo_corporal: tipoCorpName,
    descricao_tipo: `Seu tipo corporal é ${tipoCorpName}. Esta análise foi gerada com base nas suas informações do questionário.`,
    proporcoes: { ombros: "Proporcionais", busto: "Proporcional", cintura: "Definida", quadril: "Proporcional", pernas: "Proporcionais" },
    pontos_fortes: ["Silhueta equilibrada", "Versatilidade de modelagens"],
    pontos_de_atencao: ["Manter o equilíbrio visual entre as proporções"],
    silhueta_ideal: "Modelagens que acompanham o corpo sem marcar excessivamente",
    dicas_gerais: ["Invista em peças de alfaiataria", "Use cintos para marcar a cintura", "Aposte em tecidos com bom caimento"],
  };

  const prefs = Array.isArray(questionnaire.preferences) ? questionnaire.preferences : [];
  const styleMap: Record<string, string> = { "classic": "Clássico", "romantic": "Romântico", "modern": "Moderno", "elegant": "Elegante", "natural": "Natural" };
  const mainStyle = styleMap[String(prefs[0] || "")] || "Clássico";

  const colorAnalysis = {
    estacao: "Verão", subtipo: "Suave", subtom_pele: "Neutro",
    descricao_coloracao: "Análise baseada nas informações fornecidas no questionário.",
    paleta_cores_ideais: { neutros: ["Bege", "Cinza médio", "Off-white"], cores_base: ["Azul marinho", "Bordô", "Verde escuro"], cores_destaque: ["Rosa antigo", "Terracota"], cores_maquiagem: ["Tons neutros", "Rosa suave"] },
    cores_evitar: ["Cores neon", "Amarelo vibrante"], metais_ideais: "Ouro e Prata", contraste_ideal: "Médio",
    dicas_coloracao: ["Use cores neutras como base", "Adicione cor com acessórios", "Combine tons da mesma família"],
  };

  const styleAnalysis = {
    estilo_predominante: mainStyle, estilos_secundarios: ["Elegante"],
    descricao_estilo: `Seu estilo predominante é ${mainStyle}, combinando sofisticação com praticidade.`,
    palavras_chave: ["Sofisticação", "Elegância", "Praticidade", "Versatilidade"],
    referencias_visuais: "Estilo atemporal e refinado",
    elementos_essenciais: ["Texturas alinhadas ao clima", "Cores específicas da cartela", "Proporções ajustadas ao biotipo", "Peça coringa autoral"],
    elementos_evitar: ["Peças muito informais para o trabalho", "Estampas exageradas"],
    dicas_estilo: ["Invista em peças atemporais", "Priorize qualidade sobre quantidade", "Mantenha uma paleta coesa"],
  };

  const modelingAnalysis = {
    decotes_ideais: ["V", "Quadrado", "Canoa"], decotes_evitar: ["Muito fechados"],
    mangas_ideais: ["Manga 3/4", "Manga longa", "Manga curta clássica"],
    comprimentos_ideais: { saias: "Midi", vestidos: "Midi ou longo", calcas: "Reta ou wide leg" },
    cintura_ideal: "Média a alta", modelagens_superiores: ["Camisas estruturadas", "Blusas com caimento"],
    modelagens_inferiores: ["Calça reta", "Saia lápis", "Pantalona"],
    tecidos_recomendados: ["Crepe", "Linho", "Algodão premium", "Seda"],
    tecidos_evitar: ["Tecidos muito sintéticos", "Malha muito fina"],
    estampas_ideais: ["Listras finas", "Poá discreto", "Florais médios"],
    dicas_modelagem: ["Prefira modelagens estruturadas", "Evite excesso de volume", "Valorize a cintura"],
  };

  const wardrobeEssentials = normalizeWardrobeEssentials(undefined, questionnaire, diagnosisId, styleAnalysis, modelingAnalysis, colorAnalysis);
  const capsuleWardrobe = normalizeCapsuleWardrobe(undefined, wardrobeEssentials, questionnaire, diagnosisId);
  delete (wardrobeEssentials as Record<string, unknown>)._capsule_groups;

  const finalDiagnosis = {
    summary: `Com base nas suas informações, seu perfil combina o estilo ${mainStyle} com o tipo corporal ${tipoCorpName}. Esta análise foi gerada a partir do seu questionário para oferecer orientações práticas.`,
    perfil_cliente: `Profissional com estilo ${mainStyle.toLowerCase()} que busca praticidade e elegância.`,
    principais_descobertas: ["Estilo pessoal bem definido", "Tipo corporal versátil", "Boa base para montar um guarda-roupa funcional"],
    transformacao_proposta: "Refinar o guarda-roupa atual com peças-chave que maximizem combinações.",
    proximos_passos: ["Revisar o guarda-roupa atual", "Investir nas peças essenciais", "Definir paleta de cores pessoal", "Organizar looks por ocasião", "Começar com 3 looks completos"],
    mensagem_final: "Você já tem uma ótima base! Com pequenos ajustes, seu estilo vai refletir ainda mais quem você é. 💫",
  };

  return { bodyAnalysis, colorAnalysis, styleAnalysis, modelingAnalysis, wardrobeEssentials, capsuleWardrobe, finalDiagnosis };
}

function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

function sanitizeStringArray(input: unknown, maxItems = 10): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .slice(0, maxItems)
    .map(s => sanitizeString(s, 100));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const pollinationsApiKey = Deno.env.get("POLLINATIONS_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Verify user with JWT claims
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check active subscription (admins bypass)
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (!isAdmin) {
      const { data: accessData } = await supabase.rpc('get_user_plan_access', { _user_id: userId });
      const access = accessData as {
        has_subscription?: boolean;
        looks_used?: number;
        looks_per_month?: number;
        plan_name?: string;
      } | null;

      if (!access?.has_subscription) {
        return new Response(JSON.stringify({ error: 'Conta sem assinatura', code: 'no_subscription' }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const used = access.looks_used ?? 0;
      const limit = access.looks_per_month ?? 0;
      // The current diagnosis was already inserted before this call, so used includes it.
      if (used > limit) {
        return new Response(JSON.stringify({
          error: `Limite do plano ${access.plan_name || ''} atingido (${limit} diagnósticos/mês). Faça upgrade para continuar.`,
          code: 'plan_limit_reached',
          limit,
          used,
          plan_name: access.plan_name,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    const { diagnosisId, photos, questionnaire: rawQuestionnaire } = await req.json();

    // Verify diagnosis belongs to this user
    const { data: diagnosisRecord } = await supabase
      .from('diagnoses')
      .select('user_id')
      .eq('id', diagnosisId)
      .single();

    if (!diagnosisRecord || diagnosisRecord.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Diagnóstico não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize questionnaire data
    const questionnaire = {
      lifestyle: sanitizeString(rawQuestionnaire?.lifestyle),
      profession: sanitizeString(rawQuestionnaire?.profession, 200),
      occasions: sanitizeStringArray(rawQuestionnaire?.occasions),
      preferences: sanitizeStringArray(rawQuestionnaire?.preferences),
      budget: sanitizeString(rawQuestionnaire?.budget, 50),
      climate: sanitizeString(rawQuestionnaire?.climate, 50),
      goals: sanitizeString(rawQuestionnaire?.goals),
      bodyType: sanitizeString(rawQuestionnaire?.bodyType, 50),
      height: sanitizeString(rawQuestionnaire?.height, 20),
      challenges: sanitizeString(rawQuestionnaire?.challenges),
      heightCm: sanitizeString(rawQuestionnaire?.heightCm, 20),
      weightKg: sanitizeString(rawQuestionnaire?.weightKg, 20),
      topSize: sanitizeString(rawQuestionnaire?.topSize, 50),
      bottomSize: sanitizeString(rawQuestionnaire?.bottomSize, 50),
      shoeSize: sanitizeString(rawQuestionnaire?.shoeSize, 50),
      bodyNotes: sanitizeString(rawQuestionnaire?.bodyNotes, 500),
      hairColor: sanitizeString(rawQuestionnaire?.hairColor, 80),
      eyeColor: sanitizeString(rawQuestionnaire?.eyeColor, 80),
      skinTone: sanitizeString(rawQuestionnaire?.skinTone, 80),
      fitPreference: sanitizeString(rawQuestionnaire?.fitPreference, 80),
      formalityLevel: sanitizeString(rawQuestionnaire?.formalityLevel, 80),
    };

    console.log("Processing diagnosis:", diagnosisId, "for user:", userId);

    let bodyAnalysis, colorAnalysis, styleAnalysis, modelingAnalysis, wardrobeEssentials, capsuleWardrobe, finalDiagnosis;
    let generatedSectionImages: Record<string, string> = {};
    let usedFallback = false;
    let coreDiagnosisSaved = false;

    const processingTask = (async () => {
      try {

    // Fetch and convert photos to base64
    const imagePromises = [
      photos.frontUrl ? fetchImageAsBase64(photos.frontUrl) : Promise.resolve(null),
      photos.sideUrl ? fetchImageAsBase64(photos.sideUrl) : Promise.resolve(null),
      photos.backUrl ? fetchImageAsBase64(photos.backUrl) : Promise.resolve(null),
      photos.faceUrl ? fetchImageAsBase64(photos.faceUrl) : Promise.resolve(null),
    ];

    const [frontBase64, sideBase64, backBase64, faceBase64] = await Promise.all(imagePromises);

    const bodyImages = [
      frontBase64 ? { url: frontBase64, type: "frente" } : null,
      sideBase64 ? { url: sideBase64, type: "lateral" } : null,
      backBase64 ? { url: backBase64, type: "costas" } : null,
    ].filter(Boolean) as { url: string; type: string }[];

    const faceImages = faceBase64 ? [{ url: faceBase64, type: "rosto" }] : [];

    // Budget interpretation
    const budgetDescription: Record<string, string> = {
      low: "Econômico – priorize peças acessíveis, fast-fashion consciente, brechós e marcas nacionais populares. Foco em custo-benefício.",
      medium: "Moderado – mix de marcas acessíveis e peças de investimento pontuais. Priorize qualidade nos básicos essenciais.",
      high: "Alto – marcas premium e peças de investimento. Tecidos nobres, alfaiataria sob medida e marcas reconhecidas.",
      premium: "Premium/Luxo – marcas de luxo, peças de grife, tecidos de altíssima qualidade e peças exclusivas ou sob medida.",
    };

    // Climate interpretation
    const climateDescription: Record<string, string> = {
      tropical: "Tropical quente e úmido – priorize tecidos leves, respiráveis e frescos (linho, algodão, viscose). Evite tecidos pesados, lã e muitas camadas.",
      subtropical: "Subtropical – variação de temperatura. Inclua peças de meia-estação, camadas leves e opções para dias mais frescos.",
      temperate: "Temperado – quatro estações distintas. Inclua peças versáteis para transição, casacos, e layering inteligente.",
      cold: "Frio – priorize tecidos quentes (lã, cashmere, couro), peças de inverno, sobreposições e outerwear robusto.",
      dry: "Seco – tecidos que não enruguem facilmente, cores que não desbotem. Boa variedade de peças para dia e noite.",
    };

    const budgetCtx = budgetDescription[questionnaire.budget] || `Orçamento: ${questionnaire.budget}`;
    const climateCtx = climateDescription[questionnaire.climate] || `Clima: ${questionnaire.climate}`;

    const questionnaireContext = `
CONTEXTO COMPLETO DA CLIENTE (USE ATIVAMENTE EM TODAS AS RECOMENDAÇÕES):

🏢 PROFISSÃO E ESTILO DE VIDA:
- Profissão: ${questionnaire.profession || "Não especificado"}
- Estilo de vida: ${questionnaire.lifestyle || "Não especificado"}
- Ocasiões frequentes: ${questionnaire.occasions.join(", ") || "Não especificado"}
→ IMPACTO: Adapte dress code, formalidade e versatilidade ao dia a dia profissional e pessoal desta cliente.

🌡️ CLIMA E REGIÃO:
- ${climateCtx}
→ IMPACTO: Todos os tecidos, peças e layering DEVEM ser adequados a este clima. NÃO sugira peças incompatíveis com o clima.

💰 ORÇAMENTO:
- ${budgetCtx}
→ IMPACTO: Adapte marcas, faixas de preço, qualidade de tecidos e estratégia de compra ao orçamento. Sugira alternativas quando possível.

👗 PREFERÊNCIAS E ESTILO:
- Preferências de estilo: ${questionnaire.preferences.join(", ") || "Não especificado"}
- Tipo corporal auto-percebido: ${questionnaire.bodyType || "Não especificado"}
- Altura: ${questionnaire.height || "Não especificado"}
- Objetivos: ${questionnaire.goals || "Não especificado"}
- Desafios: ${questionnaire.challenges || "Não especificado"}`;

    const variedadeRule = `\n⚠️ VARIEDADE OBRIGATÓRIA: traga MUITAS opções específicas (não 2 ou 3 itens genéricos). Evite repetir as mesmas peças, cores ou conselhos que apareceriam em qualquer diagnóstico padrão. Personalize TUDO ao perfil real desta cliente. Use linguagem rica, com adjetivos sensoriais (caimento, textura, peso, brilho).`;

    // Per-diagnosis variety seed — forces the AI to diverge between diagnoses,
    // even when two clients share a similar style/body profile.
    const varietyHash = Math.abs(stableNumericSeed(diagnosisId, questionnaire.profession || "", questionnaire.climate || "", (questionnaire.preferences || []).join("|"), questionnaire.bodyType || "", questionnaire.hairColor || "", questionnaire.skinTone || "", questionnaire.topSize || "", questionnaire.bottomSize || "", Date.now().toString().slice(0, 8)));

    // ── Inferir VIBE da cliente (casual / smart_casual / elegant / luxury) ──
    // Roupas geradas devem refletir o estilo de vida REAL, não default a "elegante".
    const formalityRaw = String(questionnaire.formalityLevel || "").toLowerCase();
    const lifestyleRaw = String(questionnaire.lifestyle || "").toLowerCase();
    const occasionsRaw = (questionnaire.occasions || []).join(" ").toLowerCase();
    const professionRaw = String(questionnaire.profession || "").toLowerCase();
    const budgetRaw = String(questionnaire.budget || "").toLowerCase();
    const lifeText = `${formalityRaw} ${lifestyleRaw} ${occasionsRaw} ${professionRaw}`;
    const isFormal = /formal|black.?tie|gala|executiv|corporativo|alta\s+formalid/.test(lifeText);
    const isCasualLife = /casual|dia.?a.?dia|home.?office|estudante|m[aã]e|aut[oô]nom|criat|artes|freelanc|esport|academia|viag/.test(lifeText);
    const isLuxBudget = /premium|luxo|high|alto/.test(budgetRaw);
    const isLowBudget = /low|econ[oô]m|baixo|at[eé]\s*r?\$?\s*500/.test(budgetRaw);
    let vibe: "casual" | "smart_casual" | "elegant" | "luxury" = "smart_casual";
    if (isLuxBudget && isFormal) vibe = "luxury";
    else if (isFormal) vibe = "elegant";
    else if (isCasualLife || isLowBudget) vibe = "casual";

    // Pools adaptados por vibe — variedade sem viés de "elegante" obrigatório
    const POOLS = {
      casual: {
        COLOR: ["um denim lavado", "um caqui suave", "um verde-oliva descontraído", "um terracota empoeirado", "um cinza-mescla", "um off-white quente", "um azul-jeans claro", "um marrom-areia", "um vinho amenizado", "um rosa-velho relax"],
        FABRIC: ["malha de algodão pesada", "moletom de qualidade", "jeans macio", "jersey grosso", "algodão pima", "linho lavado", "sarja stonewashed", "tricot básico de algodão", "modal confortável", "viscose fluida"],
        SHAPE: ["modelagem boyfriend", "corte oversized confortável", "barra dobrada casual", "decote redondo amplo", "cintura solta com elástico", "modelagem reta relaxada", "manga rolê", "comprimento midi descontraído", "regata larga", "shorts alfaiataria curto"],
        CORINGA: ["uma jaqueta jeans estruturada", "um conjunto de moletom coordenado", "um vestido camiseta", "uma camisa xadrez lavada", "um trench coat leve casual", "um cardigan de algodão amplo", "uma jaqueta utilitária", "um overalls/macacão jeans", "um vestido fluido midi básico"],
        OCCASION: ["caminhar pelo bairro no fim de semana", "trabalhar de casa", "buscar filhos na escola", "encontros no café com amigas", "viagens curtas confortáveis", "pequenos eventos diurnos casuais", "passeios em parques", "compras no mercado"],
        REFERENCE: ["Levi's, Madewell, COS básico", "Everlane, Uniqlo U, Arket", "Reformation casual, Aritzia", "Zara TRF, Mango casual", "Free People, Doen relax"],
      },
      smart_casual: {
        COLOR: ["um neutro quente menos óbvio", "um tom terroso da paleta", "um burgundy lavado", "um azul-petróleo", "um camel queimado", "um off-white com nuance fria", "um verde-sálvia", "um denim escuro"],
        FABRIC: ["tricot canelado", "sarja encorpada", "linho misto", "crepe fluido", "popeline de algodão", "modal viscose drapeado", "jeans premium", "malha modal", "ponte di roma"],
        SHAPE: ["modelagem cropped", "calça wide-leg de cintura alta", "blusa com mangas bufantes contidas", "decote V profundo", "barra assimétrica", "modelagem oversized contida", "camisa overshirt", "vestido camiseta estruturado"],
        CORINGA: ["uma jaqueta jeans elevada", "um conjunto de tricot coordenado", "uma camisa-vestido fluida", "um trench coat encurtado", "um cardigan longo", "um colete utilitário", "uma jaqueta de couro suave"],
        OCCASION: ["dia de trabalho criativo", "almoços com clientes", "happy hours descontraídos", "eventos diurnos informais", "viagens de fim de semana", "encontros sociais com amigas", "passeios urbanos com café"],
        REFERENCE: ["COS, Arket, Massimo Dutti", "Aritzia, Sezane, Reformation", "Everlane elevado, Madewell premium", "Tibi acessível, Toteme entry-level"],
      },
      elegant: {
        COLOR: ["um tom joia profundo da paleta", "um nude sofisticado", "um cinza pomba", "um burgundy elegante", "um navy profundo", "um champanhe quente", "um preto suavizado", "um marfim cremoso"],
        FABRIC: ["crepe encorpado", "lã fria de alfaiataria", "seda fosca", "cetim acetinado", "tweed leve", "veludo cotelê fino", "musselina de seda", "gabardine premium"],
        SHAPE: ["corte alongado coluna", "ombro estruturado leve", "cintura marcada por amarração", "calça wide-leg de cintura alta", "decote V trabalhado", "fenda lateral discreta", "corte godê fluido"],
        CORINGA: ["um vestido midi statement", "um colete de alfaiataria", "um terninho monocromático", "uma camisa-vestido de seda", "um trench coat estruturado", "um conjunto coordenado de crepe"],
        OCCASION: ["reuniões executivas", "jantares de trabalho", "eventos culturais (vernissages, teatro)", "casamentos diurnos", "almoços de negócio", "compromissos diurnos elegantes"],
        REFERENCE: ["Toteme, Lemaire, Studio Nicholson", "Tibi, Khaite, Frame elevado", "Massimo Dutti premium, Theory"],
      },
      luxury: {
        COLOR: ["um tom joia profundo da paleta", "um nude fora do convencional", "um camel queimado", "um burgundy lavado", "um off-white com nuance fria", "um cinza-grafite premium"],
        FABRIC: ["cashmere puro", "seda crepe pesada", "lã fria italiana", "couro nappa macio", "tweed bouclé refinado", "cetim duquesa", "jacquard com brilho sutil", "veludo de seda"],
        SHAPE: ["alfaiataria sob medida", "corte coluna escultural", "ombro estruturado leve", "decote barco refinado", "calça reta cintura alta milimetrada", "vestido coluna com drapeado"],
        CORINGA: ["uma capa curta estruturada", "um terninho monocromático sob medida", "um vestido coluna statement", "uma jaqueta de couro elevada", "um conjunto de cashmere coordenado"],
        OCCASION: ["reuniões executivas de alto nível", "jantares de gala íntimos", "eventos culturais premium", "viagens de negócios internacionais", "compromissos diplomáticos"],
        REFERENCE: ["The Row, Khaite, Brunello Cucinelli", "Loro Piana, Max Mara Atelier", "Bottega Veneta, Jil Sander", "Gabriela Hearst, Phoebe Philo"],
      },
    } as const;
    const P = POOLS[vibe];

    // Clichês proibidos por vibe — cada vibe tem seus próprios clichês a evitar
    const CLICHE_BY_VIBE: Record<typeof vibe, string[]> = {
      casual: ["camiseta branca lisa básica", "jeans skinny azul escuro padrão", "moletom cinza genérico", "tênis branco básico sem graça", "regata preta básica"],
      smart_casual: ["camisa branca de algodão básica", "calça preta de alfaiataria reta", "blazer preto estruturado clássico", "jeans skinny azul escuro", "blusa de seda marfim básica"],
      elegant: ["camisa branca de algodão básica", "calça preta de alfaiataria reta", "blazer preto estruturado clássico", "scarpin nude bico fino", "vestido midi preto básico", "trench coat caramelo tradicional"],
      luxury: ["scarpin nude bico fino genérico", "blazer preto sem alma", "vestido midi preto óbvio", "trench coat caramelo padrão", "camisa branca sem caimento autoral"],
    };

    const pick = <T,>(arr: readonly T[], offset = 0): T => arr[(varietyHash + offset) % arr.length];
    const pickMany = <T,>(arr: readonly T[], n: number, offset = 0): T[] => {
      const out: T[] = []; const used = new Set<number>();
      for (let i = 0; out.length < n && i < arr.length * 2; i++) {
        const idx = (varietyHash + offset + i * 31) % arr.length;
        if (!used.has(idx)) { used.add(idx); out.push(arr[idx]); }
      }
      return out;
    };
    const forbiddenCliches = pickMany(CLICHE_BY_VIBE[vibe], 4, 7);

    const vibeBriefing: Record<typeof vibe, string> = {
      casual: "VIBE: dia-a-dia confortável e descontraído. Roupas práticas, tecidos macios, peças básicas elevadas, NUNCA looks de gala ou alfaiataria pesada. Pense em conforto + estilo cotidiano real.",
      smart_casual: "VIBE: smart casual versátil. Mistura de peças confortáveis com toques de alfaiataria leve. Nem totalmente formal, nem só básico — equilíbrio para rotina urbana.",
      elegant: "VIBE: elegante e refinada. Alfaiataria, tecidos nobres acessíveis, peças statement com acabamento polido.",
      luxury: "VIBE: luxo discreto. Tecidos premium, alfaiataria escultural, marcas de alto padrão.",
    };

    const antiStaticDirective = `\n🔒 BLOQUEIO DE CONTEÚDO FIXO: este diagnóstico deve nascer do zero. ${vibeBriefing[vibe]} Não recicle listas, peças, nomes de looks, cores ou modelagens de diagnósticos anteriores. NÃO force peças elegantes/luxo se a cliente é casual — adapte 100% ao estilo de vida REAL dela. Substitua qualquer clichê por peças autorais com tecido, modelagem, cor da paleta e motivo ligado à profissão, clima, orçamento, biotipo e preferências.`;
    const varietyDirective = `\n🎲 ASSINATURA ÚNICA DESTE DIAGNÓSTICO (id ${diagnosisId.slice(0, 8)} · vibe ${vibe}):
${vibeBriefing[vibe]}

Para diferenciar este diagnóstico e respeitar a vibe acima, OBRIGATORIAMENTE incorpore:
- pelo menos UMA peça em ${pick(P.COLOR)};
- pelo menos UMA peça com tecido ${pick(P.FABRIC, 1)};
- pelo menos UMA peça com ${pick(P.SHAPE, 2)};
- como peça coringa, prefira ${pick(P.CORINGA, 3)};
- referencie marcas/estética próximas a: ${pick(P.REFERENCE, 5)};
- pense ocasiões reais como: ${pick(P.OCCASION, 4)}.

🚫 PROIBIDO NESTE DIAGNÓSTICO (escolha alternativas autorais dentro da paleta, biotipo e vibe):
${forbiddenCliches.map(c => `- ${c}`).join("\n")}

Use esses elementos sem mencionar este bloco no JSON. Eles devem aparecer naturalmente nos nomes, cores e descrições. Cada diagnóstico DEVE ter combinação única — JAMAIS repita conjuntos padrão.`;

    // IA 1: Análise Corporal
    const bodyAnalysisPrompt = `Você é uma consultora de imagem especializada em análise corporal feminina.

Analise as fotos do corpo (frente, lateral e costas) e forneça uma análise PROFUNDA e ÚNICA em JSON.
${variedadeRule}

${questionnaireContext}

Retorne um JSON com:
{
  "tipo_corporal": "Ampulheta/Triângulo/Triângulo Invertido/Retângulo/Oval",
  "descricao_tipo": "Descrição rica em 3-5 frases, citando proporções observadas, ângulos e características reais",
  "proporcoes": {
    "ombros": "descrição com largura relativa e angulação",
    "busto": "descrição com volume e altura",
    "cintura": "descrição com definição e altura",
    "quadril": "descrição com largura e curvatura",
    "pernas": "descrição com comprimento, formato de coxa e panturrilha"
  },
  "pontos_fortes": ["6-8 pontos específicos a valorizar"],
  "pontos_de_atencao": ["3-5 áreas que podem ser equilibradas, sem julgamento"],
  "silhueta_ideal": "Descrição detalhada da silhueta-alvo, citando cinturação, volumes e linhas",
  "dicas_gerais": ["7-10 dicas personalizadas, criativas e técnicas"]
}`;

    // IA 2: Análise de Coloração Pessoal
    const colorAnalysisPrompt = `Você é uma especialista em coloração pessoal sazonal (sistema 12 estações).

Analise a foto do rosto para determinar a coloração pessoal precisa.
${variedadeRule}

${questionnaireContext}

Analise: tom de pele, subtom (quente/frio/neutro), valor (claro/médio/profundo), cromia (suave/brilhante), cor dos olhos com nuances, cor natural do cabelo.

Retorne um JSON com:
{
  "estacao": "Primavera Brilhante/Primavera Clara/Primavera Quente/Verão Suave/Verão Claro/Verão Frio/Outono Suave/Outono Quente/Outono Profundo/Inverno Brilhante/Inverno Frio/Inverno Profundo",
  "subtipo": "Clara/Suave/Brilhante/Profunda",
  "subtom_pele": "Quente/Frio/Neutro-quente/Neutro-frio",
  "descricao_coloracao": "Análise rica em 3-5 frases descrevendo a cartela e por que combina",
  "paleta_cores_ideais": {
    "neutros": ["8-10 cores neutras específicas com nome poético (ex: 'cinza pomba', 'bege champanhe')"],
    "cores_base": ["8-10 cores para peças básicas com nome específico"],
    "cores_destaque": ["6-8 cores statement para acessórios"],
    "cores_maquiagem": ["6-8 tons para batom, blush, sombra"]
  },
  "cores_evitar": ["6-8 cores que não favorecem com explicação curta"],
  "metais_ideais": "Ouro amarelo/Ouro rosé/Prata/Mix dourado-prateado",
  "contraste_ideal": "Alto/Médio-alto/Médio/Baixo",
  "dicas_coloracao": ["7-10 dicas práticas e criativas de combinação"]
}`;

    // IA 3: Análise de Estilo
    const styleAnalysisPrompt = `Você é uma consultora de estilo e imagem pessoal sênior.

Identifique o estilo pessoal ideal cruzando profissão, clima, orçamento, personalidade e fotos.
${variedadeRule}
${antiStaticDirective}
${varietyDirective}

${questionnaireContext}

Retorne um JSON com:
{
  "estilo_predominante": "Clássico/Romântico/Dramático/Natural/Criativo/Sexy/Elegante/Tradicional/Esportivo",
  "estilos_secundarios": ["2-3 estilos complementares específicos"],
  "descricao_estilo": "Descrição em 3-5 frases conectando profissão, rotina e personalidade",
  "palavras_chave": ["7-10 palavras que definem a essência"],
  "referencias_visuais": "Cite 4-6 referências concretas (celebridades, ícones, marcas, estéticas, filmes)",
  "elementos_essenciais": ["8-12 elementos-chave do guarda-roupa adequados ao clima"],
  "elementos_evitar": ["5-7 elementos com explicação"],
  "dicas_estilo": ["8-10 dicas práticas e específicas, não genéricas"]
}`;

    // IA 4: Modelagens e Tecidos
    const modelingAnalysisPrompt = `Você é especialista em modelagem e alfaiataria feminina.

Analise as fotos e sugira modelagens, tecidos, gramaturas e estampas detalhadas.
${variedadeRule}
${antiStaticDirective}
${varietyDirective}

${questionnaireContext}

Retorne um JSON com:
{
  "decotes_ideais": ["6-8 tipos com nome técnico"],
  "decotes_evitar": ["3-5 decotes com explicação"],
  "mangas_ideais": ["6-8 tipos adequados ao clima"],
  "comprimentos_ideais": {
    "saias": "comprimento ideal com explicação técnica",
    "vestidos": "comprimento ideal com explicação",
    "calcas": "comprimento e modelagem ideais"
  },
  "cintura_ideal": "altura da cintura com justificativa",
  "modelagens_superiores": ["8-10 modelagens específicas"],
  "modelagens_inferiores": ["8-10 modelagens específicas"],
  "tecidos_recomendados": ["8-10 tecidos com gramatura/textura adequados ao clima"],
  "tecidos_evitar": ["5-7 tecidos com motivo"],
  "estampas_ideais": ["6-8 tipos com escala (micro, média, maxi) e estilo"],
  "dicas_modelagem": ["7-10 dicas técnicas personalizadas"]
}`;

    // IA 5: Peças Essenciais (5 PEÇAS CHAVE — ricas e únicas)
    const essentialsPrompt = `Você é uma personal stylist sênior especializada em curadoria.

Crie EXATAMENTE 5 PEÇAS ESSENCIAIS que formam a base versátil do guarda-roupa desta cliente.
${variedadeRule}
${antiStaticDirective}
${varietyDirective}

⚠️ REGRA CRÍTICA: EXATAMENTE 5 PEÇAS, NEM MAIS NEM MENOS.
As 5 peças devem cobrir: 1 top, 1 bottom, 1 calçado, 1 terceira peça (blazer/jaqueta/cardigan/sobretudo), 1 peça coringa (vestido OU acessório statement).
NUNCA caia no clichê genérico ("camisa branca + calça preta + blazer preto + scarpin nude + vestido midi"). Cada peça deve ser ÚNICA, com tecido, modelagem, detalhe e cor específicos da paleta desta cliente. Varie entre diagnósticos: explore cores fora do óbvio dentro da cartela, modelagens menos comuns (ex: blusa cropped de tricot canelado, calça pantacourt em sarja, mule slingback em couro envernizado).

⚠️ PERSONALIZAÇÃO OBRIGATÓRIA:
🌡️ CLIMA / 🏢 PROFISSÃO / 💰 ORÇAMENTO devem moldar tecidos, modelagens e marcas.

REGRAS DE NOMENCLATURA:
- Nomes CRIATIVOS e DESCRITIVOS combinando tecido + modelagem + detalhe único.

${questionnaireContext}

Retorne um JSON com:
{
  "pecas_essenciais": [
    {"peca": "nome detalhado com tecido + modelagem + detalhe único", "cor": "cor específica e poética da paleta", "categoria": "top|bottom|calcado|terceira_peca|coringa", "ocasiao": "quando usar", "prioridade": "alta", "porque": "1 frase explicando por que combina com ESTA cliente"}
  ],
  "total_pecas": 5,
  "investimento_sugerido": "faixa específica + estratégia de compra"
}`;

    // IA 6: Armário Cápsula (1 LOOK FEITO COM AS 5 PEÇAS)
    const capsulePrompt = `Você é especialista em armários cápsula e combinações de looks femininos.

Crie UM ÚNICO LOOK usando EXCLUSIVAMENTE peças da lista de 5 peças essenciais abaixo, geradas para ESTE diagnóstico.
Você NÃO pode inventar peças novas. Use APENAS as peças listadas, preservando os nomes exatos.
${antiStaticDirective}

⚠️ REGRA CRÍTICA: 
- Gere APENAS 1 (UM) look no total.
- O look deve conter entre 3 e 5 peças da lista abaixo.
- NÃO invente peças que não estão na lista.
- Escolha a ocasião mais relevante para a cliente (trabalho, casual ou evento).

PEÇAS DISPONÍVEIS (use EXATAMENTE estes nomes):
{PECAS_PLACEHOLDER}

⚠️ PERSONALIZAÇÃO:
🌡️ CLIMA: ${climateCtx}
🏢 PROFISSÃO: ${questionnaire.profession || "Não especificado"}

${questionnaireContext}
${variedadeRule}
${varietyDirective}

REGRAS:
- Use um nome CRIATIVO para o look
- Cada peça deve ser listada individualmente (não use "+" para juntar)
- Use EXATAMENTE os nomes das peças da lista acima
- Coloque o look na categoria mais adequada (looks_trabalho, looks_casual OU looks_eventos)

Retorne um JSON com:
{
  "conceito_capsula": "Descrição do conceito do armário cápsula com apenas 5 peças versáteis",
  "pecas_capsula": {
    "quantidade_total": "5",
    "tops": ["nomes exatos dos tops da lista"],
    "bottoms": ["nomes exatos dos bottoms da lista"],
    "vestidos": [],
    "tercas_pecas": ["nomes exatos das terceiras peças da lista"],
    "calcados": ["nomes exatos dos calçados da lista"],
    "bolsas": []
  },
  "looks_trabalho": [],
  "looks_casual": [],
  "looks_eventos": [],
  "combinacoes_possiveis": "número aproximado de combinações",
  "dicas_organizacao": ["dicas para organizar o guarda-roupa"]
}

IMPORTANTE: Preencha APENAS UMA das listas de looks (a mais relevante) com EXATAMENTE 1 look. As outras devem ficar como arrays vazios [].`;

    // Helper to update progress step
    const updateStep = async (step: string) => {
      await supabase.from("diagnoses").update({ processing_step: step }).eq("id", diagnosisId);
    };

    // Execute AI analyses with fallback
    console.log("Starting AI analyses...");

    const parseJSON = (raw: string) => {
      try { return JSON.parse(raw); } catch { return { raw_response: raw }; }
    };

    const fallbackAnalysis = generateDeterministicAnalysis(questionnaire, diagnosisId);

    try {
      // IA 1-4 run in parallel (independent analyses) to avoid timeout
      await updateStep("body");
      const [bodyRawResult, colorRawResult, styleRawResult, modelingRawResult] = await Promise.allSettled([
        bodyImages.length > 0
          ? callOpenAI(openaiApiKey, bodyImages, bodyAnalysisPrompt, 0)
          : Promise.resolve('{"error": "Sem fotos do corpo disponíveis"}'),
        faceImages.length > 0
          ? callOpenAI(openaiApiKey, faceImages, colorAnalysisPrompt, 0)
          : Promise.resolve('{"error": "Sem foto do rosto disponível"}'),
        callOpenAI(openaiApiKey, [...bodyImages, ...faceImages], styleAnalysisPrompt, 0),
        bodyImages.length > 0
          ? callOpenAI(openaiApiKey, bodyImages, modelingAnalysisPrompt, 0)
          : Promise.resolve('{"error": "Sem fotos do corpo disponíveis"}'),
      ]);
      bodyAnalysis = bodyRawResult.status === "fulfilled" ? parseJSON(bodyRawResult.value) : fallbackAnalysis.bodyAnalysis;
      await updateStep("color");
      colorAnalysis = colorRawResult.status === "fulfilled" ? parseJSON(colorRawResult.value) : fallbackAnalysis.colorAnalysis;
      await updateStep("style");
      styleAnalysis = styleRawResult.status === "fulfilled" ? parseJSON(styleRawResult.value) : fallbackAnalysis.styleAnalysis;
      await updateStep("modeling");
      modelingAnalysis = modelingRawResult.status === "fulfilled" ? parseJSON(modelingRawResult.value) : fallbackAnalysis.modelingAnalysis;

      // IA 5: Essentials (5 peças apenas)
      await updateStep("essentials");
      try {
        const essentialsRaw = await callOpenAI(openaiApiKey, [], essentialsPrompt, 0);
        wardrobeEssentials = parseJSON(essentialsRaw);
      } catch (error) {
        console.warn("Essentials AI failed, using fallback:", error);
        wardrobeEssentials = fallbackAnalysis.wardrobeEssentials;
      }
      wardrobeEssentials = normalizeWardrobeEssentials(wardrobeEssentials, questionnaire, diagnosisId, styleAnalysis, modelingAnalysis, colorAnalysis);

      // Build piece names list for capsule prompt
      const pecasNomes = (wardrobeEssentials?.pecas_essenciais || [])
        .map((p: { peca?: string; cor?: string; categoria?: string }, i: number) => `${i + 1}. ${p.peca || "Peça"} (${p.cor || ""}) [${p.categoria || ""}]`)
        .join("\n");
      const capsulePromptFinal = capsulePrompt.replace("{PECAS_PLACEHOLDER}", pecasNomes || "Nenhuma peça disponível");

      // IA 6: Capsule (looks com as 5 peças)
      await updateStep("capsule");
      try {
        const capsuleRaw = await callOpenAI(openaiApiKey, [], capsulePromptFinal, 0);
        capsuleWardrobe = parseJSON(capsuleRaw);
      } catch (error) {
        console.warn("Capsule AI failed, using fallback:", error);
        capsuleWardrobe = fallbackAnalysis.capsuleWardrobe;
      }
      capsuleWardrobe = normalizeCapsuleWardrobe(capsuleWardrobe, wardrobeEssentials, questionnaire, diagnosisId);
      delete (wardrobeEssentials as Record<string, unknown>)._capsule_groups;

      // IA 7: Final
      await updateStep("final");
      const finalDiagnosisPrompt = `Você é a consultora chefe de imagem que consolida todas as análises.

Crie um diagnóstico final consolidado baseado nas análises anteriores:

ANÁLISE CORPORAL:
${JSON.stringify(bodyAnalysis, null, 2)}

COLORAÇÃO PESSOAL:
${JSON.stringify(colorAnalysis, null, 2)}

ESTILO PESSOAL:
${JSON.stringify(styleAnalysis, null, 2)}

MODELAGENS:
${JSON.stringify(modelingAnalysis, null, 2)}

${questionnaireContext}

Retorne um JSON com:
{
  "summary": "Resumo executivo do diagnóstico em 2-3 parágrafos",
  "perfil_cliente": "Descrição do perfil completo da cliente",
  "principais_descobertas": ["5 descobertas mais importantes"],
  "transformacao_proposta": "Descrição da transformação de imagem proposta",
  "proximos_passos": ["5 ações prioritárias para implementar o novo estilo"],
  "mensagem_final": "Mensagem motivacional personalizada"
}`;

      try {
        const finalDiagnosisRaw = await callOpenAI(openaiApiKey, [], finalDiagnosisPrompt, 0);
        finalDiagnosis = parseJSON(finalDiagnosisRaw);
      } catch (error) {
        console.warn("Final diagnosis AI failed, using fallback:", error);
        finalDiagnosis = fallbackAnalysis.finalDiagnosis;
      }

      const { error: coreUpdateError } = await supabase
        .from("diagnoses")
        .update({
          body_analysis: bodyAnalysis,
          color_analysis: colorAnalysis,
          style_analysis: styleAnalysis,
          modeling_analysis: modelingAnalysis,
          wardrobe_essentials: wardrobeEssentials,
          capsule_wardrobe: capsuleWardrobe,
          final_diagnosis: finalDiagnosis,
          processing_step: "images",
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", diagnosisId);

      if (coreUpdateError) throw coreUpdateError;
      coreDiagnosisSaved = true;
      console.log("Core diagnosis saved before optional image generation:", diagnosisId);

      // IA 8: Generate clothing images for the 5 essential pieces ONLY
      await updateStep("images");
      console.log("Starting clothing image generation for 5 essential pieces...");

      const essentialPieces = wardrobeEssentials?.pecas_essenciais;

      // Build per-diagnosis style context so each client gets personalized images
      const styleContext = {
        styleIdentity:
          styleAnalysis?.estilo_predominante ||
          styleAnalysis?.estilo_principal ||
          styleAnalysis?.identidade_estilo ||
          styleAnalysis?.estilo ||
          null,
        colorSeason:
          colorAnalysis?.estacao ||
          colorAnalysis?.coloracao_pessoal ||
          colorAnalysis?.paleta_nome ||
          null,
        palette: Array.isArray(colorAnalysis?.paleta)
          ? colorAnalysis.paleta
          : Array.isArray(colorAnalysis?.cores_recomendadas)
          ? colorAnalysis.cores_recomendadas
          : null,
        bodyType:
          bodyAnalysis?.biotipo ||
          bodyAnalysis?.tipo_corporal ||
          null,
        formality: questionnaire?.formalityLevel || null,
        personality:
          finalDiagnosis?.perfil_cliente ||
          styleAnalysis?.personalidade ||
          null,
      };

      if (Array.isArray(essentialPieces)) {
        // Sequential generation to avoid rate limits
        for (const item of essentialPieces) {
          if (!item?.peca) continue;

          const queryParts = [item.peca, item.cor].filter(Boolean);
          const query = queryParts.join(" ");

          try {
            console.log(`Generating isolated AI clothing image for: "${query}"`);
            const genResponse = await fetch(
              `${supabaseUrl}/functions/v1/generate-look-image`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  pieces: [query],
                  singlePiece: true,
                  disableCache: true,
                  diagnosisId,
                  metadata: {
                    category: item.categoria || null,
                    color: item.cor || null,
                    style: item.ocasiao || null,
                  },
                  styleContext,
                }),
              }
            );

            if (!genResponse.ok) {
              const errText = await genResponse.text();
              console.error(`generate-look-image failed for "${query}": ${genResponse.status} ${errText}`);
            } else {
              const genData = await genResponse.json();
              if (genData?.imageUrl) {
                console.log(`✅ Isolated image generated for "${query}": ${genData.imageUrl}`);
              }
            }
          } catch (err) {
            console.error(`Error generating clothing image for "${query}":`, err);
          }
        }
      }

      console.log("Clothing image generation complete.");

      // IA 9: Generate look images for capsule wardrobe
      await updateStep("look_images");
      console.log("Starting look image generation for capsule wardrobe...");

      const lookCategories = ["looks_trabalho", "looks_casual", "looks_eventos"] as const;
      const lookImageTasks: (() => Promise<void>)[] = [];

      for (const category of lookCategories) {
        const looks = capsuleWardrobe?.[category];
        if (!Array.isArray(looks)) continue;

        for (const look of looks) {
          if (!look?.pecas || !Array.isArray(look.pecas) || look.pecas.length === 0) continue;

          const lookName = String(look.nome || category).trim();

          lookImageTasks.push(async () => {
            try {
              // Check if look image already exists
              const { data: existing } = await supabase
                .from("look_images")
                .select("id")
                .eq("diagnosis_id", diagnosisId)
                .eq("look_name", lookName)
                .maybeSingle();

              if (existing) {
                console.log(`Look image already exists for: ${lookName}`);
                return;
              }

              console.log(`Generating look image for: "${lookName}" with ${look.pecas.length} pieces`);

              const generateResponse = await fetch(
                `${supabaseUrl}/functions/v1/generate-look-image`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseAnonKey}`,
                  },
                  body: JSON.stringify({
                    lookName,
                    pieces: look.pecas,
                    occasion: look.ocasiao || category.replace("looks_", ""),
                    diagnosisId,
                    styleContext,
                    faceImageUrl: null,
                  }),
                }
              );

              if (!generateResponse.ok) {
                const errText = await generateResponse.text();
                console.error(`generate-look-image failed for "${lookName}": ${generateResponse.status} ${errText}`);
                return;
              }

              const generateData = await generateResponse.json();
              const imageUrl = generateData?.imageUrl;

              if (!imageUrl) {
                console.warn(`No image URL returned for look: "${lookName}"`);
                return;
              }

              const { error: insertError } = await supabase
                .from("look_images")
                .insert({ diagnosis_id: diagnosisId, look_name: lookName, image_url: imageUrl });

              if (insertError) {
                if (!insertError.message?.includes("duplicate")) {
                  console.error(`Failed to save look image for ${lookName}:`, insertError);
                }
              } else {
                console.log(`Saved look image for: ${lookName}`);
              }
            } catch (err) {
              console.error(`Error generating look image for "${lookName}":`, err);
            }
          });
        }
      }

      // Run look image generations sequentially to avoid rate limits
      for (const task of lookImageTasks) {
        await task();
      }
      console.log(`Look image generation complete. Processed ${lookImageTasks.length} looks.`);

      // IA 10: Generate personalized editorial section images (one per tab)
      await updateStep("section_images");
      console.log("Generating personalized section editorial images...");

      // STEP A — CURATOR: analyze ALL collected client data and produce a tailored visual brief per section
      let personalizedBriefs: Record<string, string> = {};
      if (openaiApiKey) {
        try {
          const curatorContext = JSON.stringify({
            questionnaire,
            bodyAnalysis,
            colorAnalysis,
            styleAnalysis,
            modelingAnalysis,
            wardrobeEssentials,
            capsuleWardrobe,
            finalDiagnosis,
          }).slice(0, 12000);

          const curatorPrompt = `Você é a DIRETORA DE ARTE de uma revista de moda feminina premium. Antes de gerar as 7 imagens editoriais do diagnóstico desta cliente específica, ANALISE EM PROFUNDIDADE todos os dados abaixo (questionário + 6 análises da IA) e escreva um BRIEFING VISUAL ÚNICO E PERSONALIZADO para cada uma das 7 abas. NÃO use templates genéricos. Cada briefing deve referenciar dados concretos desta cliente: paleta exata de cores recomendada, biotipo corporal exato, estilo predominante identificado, modelagens recomendadas, peças essenciais nomeadas, look da cápsula, profissão, clima, formalidade. Cada briefing tem 2-4 frases descrevendo CONCRETAMENTE o que renderizar usando SOMENTE objetos, roupas, acessórios, tecidos, araras, cabides, superfícies e atmosfera baseado nesta cliente.

REGRA ABSOLUTA DE PRIVACIDADE PARA TODAS AS 7 ABAS: não mencionar nem sugerir pessoa, modelo, mulher, corpo humano, silhueta humana, rosto, cabeça, olhos, nariz, boca, queixo, pescoço, pele, cabelo, mãos, braços, pernas, pés, retrato, selfie, manequim, busto, avatar ou qualquer parte humana. Se precisar representar biotipo/estilo, use apenas modelagem das roupas, dobras, caimento, fita métrica, cabides, flat lay, arara editorial e composição de objetos.

DADOS DA CLIENTE:
${curatorContext}

Responda em JSON válido com EXATAMENTE estas 7 chaves (cada valor é uma string em português curto e visualmente concreto):
{
  "resumo": "...",
  "corpo": "...",
  "cores": "...",
  "estilo": "...",
  "modelagens": "...",
  "essenciais": "...",
  "capsula": "..."
}`;

          const curatorRaw = await callOpenAI(openaiApiKey, [], curatorPrompt, 0);
          const parsed = JSON.parse(curatorRaw);
          for (const k of ["resumo","corpo","cores","estilo","modelagens","essenciais","capsula"]) {
            if (typeof parsed[k] === "string" && parsed[k].length > 10) {
              personalizedBriefs[k] = parsed[k];
            }
          }
          console.log(`Curator generated personalized briefs for ${Object.keys(personalizedBriefs).length}/7 sections.`);
        } catch (err) {
          console.warn("Curator step failed, falling back to template prompts:", err);
        }
      }

      const imagePlan = buildPersonalizedSectionImagePlan({
        diagnosisId,
        questionnaire,
        bodyAnalysis,
        colorAnalysis,
        styleAnalysis,
        wardrobeEssentials,
        capsuleWardrobe,
        finalDiagnosis,
        personalizedBriefs,
      });
      const sectionPrompts = imagePlan.prompts;
      const seedBase = imagePlan.seedBase;
      const sectionSalt = imagePlan.sectionSalt;

      // Keep fallback URLs in memory only. The result page is released after final image assets are persisted.
      await supabase
        .from("diagnoses")
        .update({ processing_step: "section_images", updated_at: new Date().toISOString() })
        .eq("id", diagnosisId);

      // Limit prompt size for image providers
      const trimPrompt = (p: string) => p.length > 3800 ? p.slice(0, 3800) : p;

      await Promise.all(Object.entries(sectionPrompts).map(async ([section, prompt]) => {
        try {
          let b64: string | null = null;
          let contentType = "image/png";
          const sectionSeed = seedBase + (sectionSalt[section] || 1) * 1009;
          const finalPrompt = trimPrompt(`${prompt} Unique editorial frame ${diagnosisId}-${section}-${sectionSeed}.`);

          // PRIMARY: Pollinations (free, no face param, fast)
          if (pollinationsApiKey) {
            try {
              const pollinationsImage = await callPollinationsSectionImage(
                prompt,
                pollinationsApiKey,
                null,
                sectionSeed,
              );
              b64 = pollinationsImage.b64;
              contentType = pollinationsImage.contentType;
              console.log(`✅ Pollinations primary used for ${section}`);
            } catch (err) {
              console.error(`Pollinations failed for ${section}:`, err instanceof Error ? err.message : err);
            }
          }

          // Fallback: Nano Banana via Lovable AI Gateway (no DALL-E)
          if (!b64 && lovableApiKey) {
            try {
              const nbRes = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-3.1-flash-image-preview",
                  messages: [{ role: "user", content: finalPrompt }],
                  modalities: ["image", "text"],
                }),
              }, 45000);

              if (nbRes.ok) {
                const nbData = await nbRes.json();
                const dataUrl = nbData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                if (typeof dataUrl === "string") {
                  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
                  if (match) {
                    contentType = match[1];
                    b64 = match[2];
                    console.log(`✅ Nano Banana fallback used for ${section}`);
                  }
                }
              } else {
                console.error(`Nano Banana failed for ${section}: ${nbRes.status}`);
              }
            } catch (err) {
              console.error(`Nano Banana exception for ${section}:`, err instanceof Error ? err.message : err);
            }
          }

          if (!b64) return;

          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const ext = contentType.split("/")[1]?.split("+")[0] || "png";
          const filePath = `section-images/${diagnosisId}/${section}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("clothing-generated")
            .upload(filePath, bytes, { contentType, upsert: true });

          if (upErr) {
            console.error(`Section upload failed for ${section}:`, upErr);
            return;
          }

          const publicUrl = `${supabaseUrl}/storage/v1/object/public/clothing-generated/${filePath}`;
          generatedSectionImages[section] = publicUrl;
          console.log(`✅ Section image saved: ${section}`);
        } catch (err) {
          console.error(`Section image error for ${section}:`, err);
        }
      }));

      for (const section of Object.keys(sectionPrompts)) {
        if (!generatedSectionImages[section]) {
          generatedSectionImages[section] = imagePlan.urls[section];
          console.warn(`Using unique Pollinations fallback URL for ${section}`);
        }
      }

    } catch (aiError: unknown) {
      const errMsg = aiError instanceof Error ? aiError.message : "";
      if (errMsg === "QUOTA_EXHAUSTED") {
        console.warn("AI quota exhausted, using deterministic fallback");
        usedFallback = true;
        const fallback = generateDeterministicAnalysis(questionnaire, diagnosisId);
        bodyAnalysis = fallback.bodyAnalysis;
        colorAnalysis = fallback.colorAnalysis;
        styleAnalysis = fallback.styleAnalysis;
        modelingAnalysis = fallback.modelingAnalysis;
        wardrobeEssentials = fallback.wardrobeEssentials;
        capsuleWardrobe = fallback.capsuleWardrobe;
        finalDiagnosis = fallback.finalDiagnosis;
      } else {
        throw aiError;
      }
    }

    if (Object.keys(generatedSectionImages).length < 7) {
      const completionImagePlan = buildPersonalizedSectionImagePlan({
        diagnosisId,
        questionnaire,
        bodyAnalysis,
        colorAnalysis,
        styleAnalysis,
        wardrobeEssentials,
        capsuleWardrobe,
        finalDiagnosis,
      });
      generatedSectionImages = { ...completionImagePlan.urls, ...generatedSectionImages };
      console.warn("Filled missing section images before completing diagnosis");
    }

    // Update diagnosis in database only after images are available
    const { error: updateError } = await supabase
      .from("diagnoses")
      .update({
        body_analysis: bodyAnalysis,
        color_analysis: colorAnalysis,
        style_analysis: styleAnalysis,
        modeling_analysis: modelingAnalysis,
        wardrobe_essentials: wardrobeEssentials,
        capsule_wardrobe: capsuleWardrobe,
        final_diagnosis: finalDiagnosis,
        generated_images: generatedSectionImages,
        processing_step: "section_images",
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", diagnosisId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    console.log("Diagnosis completed successfully for:", diagnosisId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Background diagnosis processing failed:", error);
        if (coreDiagnosisSaved) {
          const fallbackImagePlan = buildPersonalizedSectionImagePlan({
            diagnosisId,
            questionnaire,
            bodyAnalysis,
            colorAnalysis,
            styleAnalysis,
            wardrobeEssentials,
            capsuleWardrobe,
            finalDiagnosis,
          });
          await supabase
            .from("diagnoses")
            .update({
              status: Object.keys(generatedSectionImages).length >= 7 ? "completed" : "failed",
              processing_step: Object.keys(generatedSectionImages).length >= 7 ? "section_images" : "error",
              generated_images: Object.keys(generatedSectionImages).length ? generatedSectionImages : fallbackImagePlan.urls,
              final_diagnosis: Object.keys(generatedSectionImages).length >= 7 ? finalDiagnosis : { error: errorMessage },
              updated_at: new Date().toISOString(),
            })
            .eq("id", diagnosisId);
          return;
        }
        await supabase
          .from("diagnoses")
          .update({
            status: "failed",
            processing_step: "error",
            final_diagnosis: { error: errorMessage },
            updated_at: new Date().toISOString(),
          })
          .eq("id", diagnosisId);
      }
    })();

    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      EdgeRuntime.waitUntil(processingTask);
    }

    return new Response(
      JSON.stringify({
        success: true,
        diagnosisId,
        status: "processing",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing diagnosis:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
