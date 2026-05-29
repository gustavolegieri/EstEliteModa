import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HMAC-SHA256 signature verification for Stripe webhooks
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const pairs = sigHeader.split(",");
    const timestamp = pairs.find(p => p.startsWith("t="))?.split("=")[1];
    const signatures = pairs
      .filter(p => p.startsWith("v1="))
      .map(p => p.split("=")[1]);

    if (!timestamp || signatures.length === 0) return false;

    // Reject if timestamp is older than 5 minutes (replay attack prevention)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const computed = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return signatures.some(sig => sig === computed);
  } catch {
    return false;
  }
}

function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Whitelist of allowed Stripe event types
const ALLOWED_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.deleted",
  "customer.subscription.updated",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();

    // Read webhook signing secret from site_settings
    const { data: webhookSecretData } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "stripe_webhook_secret")
      .maybeSingle();

    const webhookSecret = webhookSecretData?.value
      ? String(webhookSecretData.value).replace(/^"|"$/g, "")
      : null;

    // Verify Stripe signature if webhook secret is configured
    if (webhookSecret && webhookSecret.startsWith("whsec_")) {
      const sigHeader = req.headers.get("stripe-signature");
      if (!sigHeader) {
        console.error("Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isValid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
      if (!isValid) {
        console.error("Invalid Stripe webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("Stripe webhook secret not configured — signature verification skipped. Configure stripe_webhook_secret in admin settings for production.");
    }

    const event = JSON.parse(rawBody);

    // Validate event structure
    if (!event.type || !event.data?.object) {
      return new Response(JSON.stringify({ error: "Invalid event structure" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process whitelisted events
    if (!ALLOWED_EVENTS.has(event.type)) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const subscriptionId = session.subscription;

        if (!userId || !isValidUuid(userId)) {
          console.error("Invalid or missing user_id in session metadata");
          break;
        }

        if (userId && subscriptionId) {
          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: String(subscriptionId),
              stripe_customer_id: String(session.customer),
              status: "active",
              ...(planId && isValidUuid(planId) ? { plan_id: planId } : {}),
              current_period_start: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }
        break;
      }


      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", String(subscriptionId))
            .maybeSingle();

          if (sub) {
            const periodStart = typeof invoice.period_start === "number"
              ? new Date(invoice.period_start * 1000).toISOString()
              : null;
            const periodEnd = typeof invoice.period_end === "number"
              ? new Date(invoice.period_end * 1000).toISOString()
              : null;

            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                ...(periodStart && { current_period_start: periodStart }),
                ...(periodEnd && { current_period_end: periodEnd }),
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id);
          }
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", String(subscription.id))
          .maybeSingle();

        if (sub) {
          const allowedStatuses = ["active", "canceled", "past_due", "unpaid", "incomplete"];
          const status = allowedStatuses.includes(subscription.status)
            ? subscription.status
            : "inactive";

          const periodEnd = typeof subscription.current_period_end === "number"
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              ...(periodEnd && { current_period_end: periodEnd }),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
