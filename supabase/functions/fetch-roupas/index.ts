import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function translateQuery(input: string): string {
  const map: Record<string, string> = {
    blazer: "blazer",
    camisa: "shirt",
    blusa: "blouse",
    camiseta: "t-shirt",
    top: "top",
    regata: "tank top",
    body: "bodysuit",
    cropped: "crop top",
    sueter: "sweater",
    tricot: "knit",
    cardigan: "cardigan",
    moletom: "sweatshirt",
    jaqueta: "jacket",
    casaco: "coat",
    "trench coat": "trench coat",
    colete: "vest",
    calca: "pants",
    jeans: "jeans",
    legging: "leggings",
    saia: "skirt",
    vestido: "dress",
    macacao: "jumpsuit",
    short: "shorts",
    bermuda: "shorts",
    scarpin: "pumps",
    sapato: "shoes",
    sandalia: "sandals",
    tenis: "sneakers",
    bota: "boots",
    mocassim: "loafers",
    sapatilha: "ballet flats",
    bolsa: "bag",
    clutch: "clutch",
    cinto: "belt",
    lenco: "scarf",
    cachecol: "scarf",
    brinco: "earrings",
    colar: "necklace",
    pulseira: "bracelet",
    anel: "ring",
    oculos: "sunglasses",
  };

  const colorMap: Record<string, string> = {
    preto: "black", preta: "black", branco: "white", branca: "white",
    azul: "blue", vermelho: "red", vermelha: "red", verde: "green",
    amarelo: "yellow", amarela: "yellow", rosa: "pink", bege: "beige",
    marrom: "brown", cinza: "gray", dourado: "gold", nude: "nude",
  };

  const n = normalize(input);
  const parts: string[] = [];

  // Match clothing type (longest key first)
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (n.includes(k)) {
      parts.push(map[k]);
      break;
    }
  }

  // Match color
  for (const [pt, en] of Object.entries(colorMap)) {
    if (n.includes(pt)) {
      parts.push(en);
      break;
    }
  }

  return parts.length > 0 ? parts.join(" ") : input;
}

async function searchASOS(query: string, count: number): Promise<string[]> {
  const url = "https://www.asos.com/search/?q=" + encodeURIComponent(query);

  console.log(`ASOS search: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    console.log(`ASOS returned status ${res.status}`);
    return [];
  }

  const html = await res.text();

  const matches = [...html.matchAll(/https:\/\/images\.asos-media\.com[^"'\s)]+/g)];

  const images = matches
    .map(m => m[0])
    .filter(u => u.includes(".jpg") || u.includes(".webp"))
    .filter(u => !u.includes("logo") && !u.includes("icon") && !u.includes("banner"))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, count);

  console.log(`ASOS: ${images.length} images found`);
  return images;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = body.query || "shirt";
    const count = body.count || 8;

    const q = translateQuery(query);
    console.log(`Input: "${query}" → EN: "${q}"`);

    const images = await searchASOS(q, count);

    return new Response(
      JSON.stringify({ query: q, images, success: images.length > 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("Error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, images: [], success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
