// Returns library generation stats. Admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const countOf = async (status: string | null) => {
      const q = admin.from("library_assets").select("id", { count: "exact", head: true });
      const { count, error } = status ? await q.eq("status", status) : await q;
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    const [total, done, pending, failed] = await Promise.all([
      countOf(null),
      countOf("done"),
      countOf("pending"),
      countOf("failed"),
    ]);

    // Per-category breakdown (done only)
    const { data: catRows } = await admin
      .from("library_assets")
      .select("category, status")
      .limit(20000);
    const byCategory: Record<string, { total: number; done: number }> = {};
    for (const r of catRows || []) {
      const c = (r as { category: string }).category;
      const s = (r as { status: string }).status;
      if (!byCategory[c]) byCategory[c] = { total: 0, done: 0 };
      byCategory[c].total += 1;
      if (s === "done") byCategory[c].done += 1;
    }

    return new Response(JSON.stringify({ total, done, pending, failed, byCategory }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("library-stats error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
