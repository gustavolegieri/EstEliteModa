import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PIECE_IMAGE = "/assets/default.jpg";

async function callAI(apiKey: string, prompt: string, maxRetries = 2): Promise<string> {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a fashion AI assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (response.status === 429) {
      const retryAfter = Math.min(30, (attempt + 1) * 10);
      console.warn(`AI gateway 429, retry ${attempt + 1}/${maxRetries} after ${retryAfter}s`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new Error("QUOTA_EXHAUSTED");
    }

    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty AI response");
    return text;
  }

  throw new Error("QUOTA_EXHAUSTED");
}

/** Generate a deterministic look when AI is unavailable */
function generateFallbackLook(diagnosis: Record<string, unknown>): Record<string, unknown> {
  const questionnaire = (diagnosis.questionnaire || {}) as Record<string, unknown>;
  const styleAnalysis = (diagnosis.style_analysis || {}) as Record<string, unknown>;
  const colorAnalysis = (diagnosis.color_analysis || {}) as Record<string, unknown>;

  const estilo = String(styleAnalysis.estilo_predominante || "Clássico");
  const paleta = (colorAnalysis as Record<string, unknown>).paleta_cores_ideais as Record<string, unknown> || {};
  const neutros = Array.isArray(paleta.neutros) ? paleta.neutros : ["Preto", "Branco", "Bege"];
  const destaque = Array.isArray(paleta.cores_destaque) ? paleta.cores_destaque : ["Azul marinho"];

  const occasions = ["Casual Chic", "Trabalho", "Evento Social", "Final de Semana", "Jantar"];
  const occasion = occasions[Math.floor(Math.random() * occasions.length)];

  const lookTemplates = [
    {
      look_name: `${estilo} Refinado`,
      pieces: [
        { name: "Blazer estruturado", category: "terceira_peça", color: String(neutros[0]) },
        { name: "Blusa de seda", category: "top", color: String(destaque[0]) },
        { name: "Calça de alfaiataria", category: "bottom", color: String(neutros[0]) },
        { name: "Scarpin clássico", category: "calçado", color: String(neutros[2] || "Nude") },
        { name: "Bolsa estruturada", category: "acessório", color: String(neutros[0]) },
      ],
    },
    {
      look_name: `Elegância ${estilo}`,
      pieces: [
        { name: "Vestido midi", category: "vestido", color: String(destaque[0]) },
        { name: "Sandália de salto", category: "calçado", color: String(neutros[2] || "Nude") },
        { name: "Bolsa clutch", category: "acessório", color: String(neutros[0]) },
        { name: "Brincos dourados", category: "acessório", color: "Dourado" },
      ],
    },
    {
      look_name: `Casual ${estilo}`,
      pieces: [
        { name: "Camisa de algodão", category: "top", color: String(neutros[1] || "Branco") },
        { name: "Calça jeans reta", category: "bottom", color: "Azul médio" },
        { name: "Tênis branco", category: "calçado", color: "Branco" },
        { name: "Bolsa tote", category: "acessório", color: String(neutros[2] || "Caramelo") },
        { name: "Cinto de couro", category: "acessório", color: String(neutros[0]) },
      ],
    },
  ];

  const template = lookTemplates[Math.floor(Math.random() * lookTemplates.length)];

  return {
    look_name: template.look_name,
    occasion,
    occasion_description: `Look ${template.look_name.toLowerCase()} para ${occasion.toLowerCase()}, baseado no seu perfil de estilo ${estilo}.`,
    pieces: template.pieces.map(p => ({
      ...p,
      description: `${p.name} na cor ${p.color}, ideal para ${occasion.toLowerCase()}`,
      available: false,
      generation_prompt: `${p.name} ${p.color} women fashion product photo white background`,
    })),
    styling_tips: [
      `Combine as cores ${neutros.slice(0, 2).join(" e ")} como base`,
      `Use ${destaque[0] || "uma cor destaque"} para criar ponto focal`,
      `Mantenha os acessórios alinhados com o estilo ${estilo}`,
    ],
    mood: `${estilo}, sofisticado, versátil`,
    confidence_level: "Médio",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { diagnosisId } = await req.json();
    if (!diagnosisId) {
      return new Response(JSON.stringify({ error: "diagnosisId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify diagnosis ownership
    const { data: diagnosis, error: diagError } = await supabase
      .from("diagnoses")
      .select("*")
      .eq("id", diagnosisId)
      .single();

    if (diagError || !diagnosis) {
      return new Response(JSON.stringify({ error: "Diagnóstico não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (diagnosis.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription and look limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, plan")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Assinatura ativa necessária" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan limits
    const { data: plans } = await supabase
      .from("plans")
      .select("looks_per_month")
      .order("sort_order", { ascending: true });

    // Default to 3 if no plan match found
    let monthlyLimit = 3;
    if (plans && plans.length > 0) {
      // Try to match by plan name, fallback to first plan
      monthlyLimit = plans[0].looks_per_month || 3;
      if (plans.length > 1) {
        // sort_order 0=basic(3), 1=premium(5), 2=elite(7)
        const planName = (subscription.plan || "").toLowerCase();
        if (planName.includes("elite") || planName.includes("c")) monthlyLimit = plans[2]?.looks_per_month || 7;
        else if (planName.includes("premium") || planName.includes("b")) monthlyLimit = plans[1]?.looks_per_month || 5;
        else monthlyLimit = plans[0]?.looks_per_month || 3;
      }
    }

    // Count looks generated this month across ALL diagnoses for this user
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = await supabase
      .from("look_recommendations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString())
      .in(
        "diagnosis_id",
        (await supabase.from("diagnoses").select("id").eq("user_id", userId)).data?.map(d => d.id) || []
      );

    const usedLooks = monthlyCount || 0;

    if (usedLooks >= monthlyLimit) {
      return new Response(
        JSON.stringify({
          error: `Você atingiu o limite de ${monthlyLimit} looks este mês. Faça upgrade do plano para mais looks.`,
          usage: { used: usedLooks, limit: monthlyLimit },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from diagnosis data
    const questionnaire = (diagnosis.questionnaire || {}) as Record<string, unknown>;
    const bodyAnalysis = (diagnosis.body_analysis || {}) as Record<string, unknown>;
    const colorAnalysis = (diagnosis.color_analysis || {}) as Record<string, unknown>;
    const styleAnalysis = (diagnosis.style_analysis || {}) as Record<string, unknown>;

    // Fetch previous recommendations to avoid repetition
    const { data: previousRecs } = await supabase
      .from("look_recommendations")
      .select("look_name, occasion")
      .eq("diagnosis_id", diagnosisId)
      .order("created_at", { ascending: false })
      .limit(10);

    const previousContext = previousRecs?.length
      ? `\nLOOKS JÁ GERADOS (NÃO REPITA):\n${previousRecs.map(r => `- ${r.look_name} (${r.occasion})`).join("\n")}`
      : "";

    // Determine occasion automatically from profile
    const occasions = Array.isArray(questionnaire.occasions)
      ? questionnaire.occasions as string[]
      : [];
    const profession = String(questionnaire.profession || "");
    const lifestyle = String(questionnaire.lifestyle || "");

    const autoOccasions = [
      "Dia a Dia Casual",
      "Trabalho/Escritório",
      "Evento Social",
      "Jantar Especial",
      "Final de Semana",
    ];

    // Pick an occasion not yet used
    const usedOccasions = new Set(previousRecs?.map(r => r.occasion) || []);
    const availableOccasion = autoOccasions.find(o => !usedOccasions.has(o))
      || autoOccasions[Math.floor(Math.random() * autoOccasions.length)];

    let lookData: Record<string, unknown>;
    let usedFallback = false;

    // Try AI generation, fallback to deterministic if unavailable
    if (lovableApiKey) {
      try {
        const prompt = `Você é uma personal stylist de alto nível. Gere UMA sugestão de look.

CONTEXTO DA CLIENTE:
- Profissão: ${profession || "Não especificado"}
- Estilo de vida: ${lifestyle || "Não especificado"}
- Clima: ${questionnaire.climate || "Não especificado"}
- Orçamento: ${questionnaire.budget || "Não especificado"}
- Preferências: ${Array.isArray(questionnaire.preferences) ? (questionnaire.preferences as string[]).join(", ") : "Não especificado"}
- Tipo corporal: ${bodyAnalysis.tipo_corporal || "Não especificado"}
- Estilo predominante: ${styleAnalysis.estilo_predominante || "Não especificado"}
- Estação de cor: ${colorAnalysis.estacao || "Não especificada"}
- Paleta de cores: ${JSON.stringify(colorAnalysis.paleta_cores_ideais || {})}
- Ocasiões frequentes: ${occasions.join(", ") || "Variadas"}

OCASIÃO ALVO: ${availableOccasion}
${previousContext}

REGRAS:
1. Nome CRIATIVO para o look (ex: "Elegância Urbana")
2. 4-5 peças com descrição detalhada (tecido, cor da paleta, modelagem)
3. Cada peça deve ter category: top|bottom|vestido|calçado|acessório|terceira_peça

Retorne JSON:
{
  "look_name": "Nome Criativo",
  "occasion": "${availableOccasion}",
  "occasion_description": "Quando/onde usar",
  "pieces": [
    {
      "name": "Nome da peça",
      "description": "Descrição detalhada",
      "category": "categoria",
      "color": "cor específica",
      "generation_prompt": "prompt em inglês para buscar imagem"
    }
  ],
  "styling_tips": ["Dica 1", "Dica 2", "Dica 3"],
  "mood": "3-5 palavras",
  "confidence_level": "Alto/Médio"
}`;

        const rawResult = await callAI(lovableApiKey, prompt);
        let jsonStr = rawResult.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        lookData = JSON.parse(jsonStr);
      } catch (aiError: unknown) {
        const errMsg = aiError instanceof Error ? aiError.message : "";
        console.warn("AI generation failed:", errMsg, "- using fallback");
        usedFallback = true;
        lookData = generateFallbackLook(diagnosis as unknown as Record<string, unknown>);
      }
    } else {
      console.warn("LOVABLE_API_KEY not configured - using fallback");
      usedFallback = true;
      lookData = generateFallbackLook(diagnosis as unknown as Record<string, unknown>);
    }

    // Process pieces: find/create images
    const processedPieces = [];
    const pieces = (lookData.pieces || []) as Array<Record<string, unknown>>;

    for (const piece of pieces) {
      const pieceName = String(piece.name || piece.description || "");
      let imageUrl: string | null = null;

      // Try to find image in DB via search-clothing-image
      try {
        const searchResponse = await fetch(
          `${supabaseUrl}/functions/v1/search-clothing-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              query: String(piece.generation_prompt || pieceName),
              count: 1,
              diagnosisId,
            }),
          }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          imageUrl = searchData?.results?.[0]?.url || null;
        }
      } catch (err) {
        console.error(`Error searching image for ${pieceName}:`, err);
      }

      // Use default image as final fallback
      if (!imageUrl) {
        imageUrl = DEFAULT_PIECE_IMAGE;
      }

      processedPieces.push({
        name: pieceName,
        description: String(piece.description || pieceName),
        category: String(piece.category || "outros"),
        color: String(piece.color || ""),
        image_url: imageUrl,
        available: imageUrl !== DEFAULT_PIECE_IMAGE,
      });
    }

    // Save recommendation
    const { data: recommendation, error: insertError } = await supabase
      .from("look_recommendations")
      .insert({
        diagnosis_id: diagnosisId,
        look_name: String(lookData.look_name || "Look Personalizado"),
        occasion: String(lookData.occasion || availableOccasion),
        occasion_description: String(lookData.occasion_description || ""),
        pieces: processedPieces,
        styling_tips: (lookData.styling_tips || []) as string[],
        metadata: {
          mood: lookData.mood,
          confidence_level: lookData.confidence_level,
          used_fallback: usedFallback,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving recommendation:", insertError);
      throw insertError;
    }

    console.log(`Look saved: ${recommendation.id} (fallback: ${usedFallback})`);

    return new Response(
      JSON.stringify({
        success: true,
        recommendation: {
          ...recommendation,
          pieces: processedPieces,
          styling_tips: lookData.styling_tips,
          metadata: { mood: lookData.mood, confidence_level: lookData.confidence_level },
        },
        usage: { used: usedLooks + 1, limit: monthlyLimit },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
