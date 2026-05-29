// Bootstrap a single admin account. Idempotent: if user exists, just ensures role.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'admin@estelite.com';
const ADMIN_PASSWORD = 'Estelite@Admin2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Try create
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Administrador Estelite' },
    });

    if (created?.user?.id) {
      userId = created.user.id;
    } else {
      // User likely exists — find by listing
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
      if (found) {
        userId = found.id;
        // reset password to known value
        await supabase.auth.admin.updateUserById(found.id, { password: ADMIN_PASSWORD, email_confirm: true });
      } else if (createErr) {
        throw createErr;
      }
    }

    if (!userId) throw new Error('Failed to obtain admin user id');

    // Ensure profile
    await supabase.from('profiles').upsert({ user_id: userId, full_name: 'Administrador Estelite' }, { onConflict: 'user_id' });

    // Ensure admin role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!existingRole) {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        user_id: userId,
        login_url: '/auth',
        admin_url: '/admin',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
