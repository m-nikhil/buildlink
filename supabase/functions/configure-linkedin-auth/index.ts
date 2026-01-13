import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is just for documentation purposes
  // LinkedIn OAuth is configured through the Supabase dashboard
  
  return new Response(
    JSON.stringify({
      message: "LinkedIn OAuth configuration",
      instructions: [
        "1. Go to Cloud dashboard -> Users -> Auth Settings",
        "2. Enable LinkedIn provider",
        "3. Add your LinkedIn Client ID and Client Secret",
        "4. The redirect URL is already configured in Supabase"
      ],
      redirect_url: `${Deno.env.get("SUPABASE_URL")}/auth/v1/callback`
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
