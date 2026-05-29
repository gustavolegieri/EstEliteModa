// DALL-E 3 fallback for client-side SmartImage when Pollinations fails.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ url: null, error: "dalle_unavailable", reason: "missing_api_key" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPrompt = prompt.slice(0, 1000);

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: cleanPrompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("DALL-E error:", res.status, text);
      // Return 200 with null url so the client gracefully keeps its Pollinations URL
      // without surfacing a 502 (common cause: OpenAI billing hard limit).
      return new Response(JSON.stringify({ url: null, error: "dalle_unavailable", status: res.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const item = data?.data?.[0];
    const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if (!url) {
      return new Response(JSON.stringify({ url: null, error: "dalle_unavailable", reason: "no_image_returned" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("dalle-fallback error:", err);
    return new Response(JSON.stringify({ url: null, error: "dalle_unavailable", reason: "internal_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
