// Seed library_assets with all (category × style × body × season × variant) combinations.
// Admin-only. Idempotent — uses ON CONFLICT to avoid duplicates.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES: Array<{ key: string; label: string; promptHint: string }> = [
  { key: "calcados", label: "calçados", promptHint: "a single pair of women's shoes" },
  { key: "calcas", label: "calças", promptHint: "a single pair of women's pants/trousers" },
  { key: "saias", label: "saias", promptHint: "a single women's skirt" },
  { key: "vestidos", label: "vestidos", promptHint: "a single women's dress" },
  { key: "blusas", label: "blusas", promptHint: "a single women's top/blouse" },
  { key: "camisas", label: "camisas", promptHint: "a single women's button-up shirt" },
  { key: "jaquetas", label: "jaquetas", promptHint: "a single women's jacket or blazer" },
  { key: "bolsas", label: "bolsas", promptHint: "a single women's handbag" },
  { key: "acessorios", label: "acessórios", promptHint: "a single women's fashion accessory" },
];

const STYLES: Array<{ key: string; descriptor: string }> = [
  { key: "minimalista", descriptor: "minimalist, clean lines, neutral tones" },
  { key: "classico", descriptor: "classic, timeless, refined tailoring" },
  { key: "romantico", descriptor: "romantic, delicate, soft fabrics and details" },
  { key: "dramatico", descriptor: "dramatic, bold structure, statement silhouette" },
  { key: "criativo", descriptor: "creative, eclectic, mixed textures" },
  { key: "esportivo", descriptor: "sporty chic, athleisure, comfort meets style" },
  { key: "boho", descriptor: "bohemian, fluid, natural fibers" },
  { key: "sofisticado", descriptor: "sophisticated, luxurious, premium fabrics" },
];

const BODIES: Array<{ key: string; descriptor: string }> = [
  { key: "ampulheta", descriptor: "designed for an hourglass figure (balanced shoulders/hips, defined waist)" },
  { key: "retangulo", descriptor: "designed for a rectangle figure (straight silhouette)" },
  { key: "triangulo", descriptor: "designed for a pear/triangle figure (wider hips)" },
  { key: "triangulo_invertido", descriptor: "designed for an inverted triangle figure (broader shoulders)" },
  { key: "oval", descriptor: "designed for an oval/round figure" },
];

const SEASONS: Array<{ key: string; palette: string }> = [
  { key: "primavera_clara", palette: "light spring palette: warm pastels, peach, coral, soft golden" },
  { key: "primavera_brilhante", palette: "bright spring palette: vivid warm colors, turquoise, coral, sunny yellow" },
  { key: "verao_suave", palette: "soft summer palette: muted cool tones, dusty rose, soft lavender" },
  { key: "verao_frio", palette: "cool summer palette: rosy cool tones, soft navy, periwinkle" },
  { key: "outono_quente", palette: "warm autumn palette: terracotta, mustard, olive, rust" },
  { key: "outono_profundo", palette: "deep autumn palette: burgundy, forest green, deep teal" },
  { key: "inverno_brilhante", palette: "bright winter palette: jewel tones, fuchsia, emerald, true red" },
  { key: "inverno_profundo", palette: "deep winter palette: black, deep navy, plum, icy white" },
];

const VARIANTS_PER_COMBO = 4; // 9*8*5*8*4 = 11520

function buildPrompt(
  cat: { label: string; promptHint: string },
  style: { descriptor: string },
  body: { descriptor: string },
  season: { palette: string },
  variantIndex: number,
): string {
  return [
    `Luxury e-commerce flat-lay product photography of ${cat.promptHint}.`,
    `Style: ${style.descriptor}.`,
    `${body.descriptor}.`,
    `Color story from ${season.palette}.`,
    `Pure white seamless background, crisp folds, visible stitching, fine fabric texture,`,
    `even soft studio lighting, faint contact shadow, photorealistic catalog standard.`,
    `Variant ${variantIndex + 1} of 4 — vary fabric and silhouette while keeping the brief.`,
    `No model, no face, no full body, one item only.`,
  ].join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Validate admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build all combinations
    const rows: Array<Record<string, unknown>> = [];
    for (const cat of CATEGORIES) {
      for (const style of STYLES) {
        for (const body of BODIES) {
          for (const season of SEASONS) {
            for (let v = 0; v < VARIANTS_PER_COMBO; v++) {
              rows.push({
                category: cat.key,
                style: style.key,
                body_type: body.key,
                color_season: season.key,
                variant_index: v,
                tags: [cat.key, style.key, body.key, season.key],
                prompt: buildPrompt(cat, style, body, season, v),
                status: "pending",
              });
            }
          }
        }
      }
    }

    const total = rows.length;
    let inserted = 0;
    // Bulk insert in chunks of 500 with upsert (no conflict update — first writer wins)
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error, count } = await admin
        .from("library_assets")
        .upsert(chunk, { onConflict: "category,style,body_type,color_season,variant_index", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("seed chunk error:", error.message);
      } else if (typeof count === "number") {
        inserted += count;
      }
    }

    return new Response(JSON.stringify({ ok: true, total_combinations: total, inserted_now: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("library-seed error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
