import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGINS = [
  "https://estelite.lovable.app",
  "https://id-preview--462c4d3a-f571-40f6-9948-7806cc2e0657.lovable.app",
];

function isValidUrl(url: string, allowedOrigins: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedOrigins.some(origin => url.startsWith(origin));
  } catch {
    return false;
  }
}

function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function isValidStripeKey(key: string): boolean {
  return /^sk_(test|live)_[a-zA-Z0-9]+$/.test(key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user via JWT claims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Rate limiting: max 5 checkout attempts per user per 15 minutes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Cleanup old entries periodically
    await supabaseAdmin.rpc("cleanup_rate_limits");

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "checkout")
      .gte("created_at", fifteenMinutesAgo);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record this attempt
    await supabaseAdmin.from("rate_limits").insert({
      user_id: userId,
      action: "checkout",
    });
    // Read Stripe secret key from site_settings
    const { data: settingsData } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["stripe_secret_key"]);

    const settingsMap: Record<string, string> = {};
    settingsData?.forEach((s: any) => {
      const val = typeof s.value === "string" ? s.value.replace(/^"|"$/g, "") : String(s.value);
      settingsMap[s.key] = val;
    });

    const stripeSecretKey = settingsMap.stripe_secret_key;
    if (!stripeSecretKey || !isValidStripeKey(stripeSecretKey)) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured", demo: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const planId = body.planId;
    const successUrl = body.successUrl;
    const cancelUrl = body.cancelUrl;

    // Validate planId format
    if (!planId || typeof planId !== "string" || !isValidUuid(planId)) {
      return new Response(JSON.stringify({ error: "Invalid plan ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate redirect URLs — must be from allowed origins
    const finalSuccessUrl = (successUrl && isValidUrl(successUrl, ALLOWED_ORIGINS))
      ? successUrl
      : "https://estelite.lovable.app/payment-success";

    const finalCancelUrl = (cancelUrl && isValidUrl(cancelUrl, ALLOWED_ORIGINS))
      ? cancelUrl
      : "https://estelite.lovable.app/pricing?payment=cancelled";

    // Get plan details
    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plan not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate plan data
    if (plan.price_cents < 100 || plan.price_cents > 100000000) {
      return new Response(JSON.stringify({ error: "Invalid plan price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing Stripe customer ID
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: userEmail || "",
          "metadata[user_id]": userId,
        }),
      });
      const customer = await customerRes.json();
      if (customer.error) {
        console.error("Stripe customer creation error:", customer.error.type);
        return new Response(JSON.stringify({ error: "Failed to create customer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customer.id;
    }

    // Create Stripe Price
    const priceRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        unit_amount: String(plan.price_cents),
        currency: plan.currency.toLowerCase(),
        "recurring[interval]": plan.interval === "yearly" ? "year" : "month",
        "product_data[name]": plan.name.substring(0, 250),
      }),
    });
    const price = await priceRes.json();
    if (price.error) {
      console.error("Stripe price creation error:", price.error.type);
      return new Response(JSON.stringify({ error: "Failed to create price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Checkout Session
    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId!,
        "line_items[0][price]": price.id,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        "metadata[user_id]": userId,
        "metadata[plan_id]": planId,
        "subscription_data[metadata][user_id]": userId,
        "subscription_data[metadata][plan_id]": planId,
      }),
    });
    const session = await sessionRes.json();
    if (session.error) {
      console.error("Stripe session creation error:", session.error.type);
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert subscription record
    await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        status: "pending",
        plan: plan.interval,
      },
      { onConflict: "user_id" }
    );

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Checkout error:", err.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
