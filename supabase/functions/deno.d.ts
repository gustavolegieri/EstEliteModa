/** Ambient types for Supabase Edge Functions (Deno runtime). */
declare namespace Deno {
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;

  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module 'npm:@supabase/supabase-js@2' {
  export { createClient, type SupabaseClient } from '@supabase/supabase-js';
}
