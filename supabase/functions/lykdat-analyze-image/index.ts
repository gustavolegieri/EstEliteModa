import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LYKDAT_API_KEY = Deno.env.get('LYKDAT_API_KEY');
    if (!LYKDAT_API_KEY) {
      throw new Error('LYKDAT_API_KEY is not configured');
    }

    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'image_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Lykdat API with image_url:', image_url);

    const response = await fetch('https://cloudapi.lykdat.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LYKDAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Lykdat API error [${response.status}]:`, JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Lykdat API error', status: response.status, details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lykdat API response received successfully');

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lykdat-analyze-image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
