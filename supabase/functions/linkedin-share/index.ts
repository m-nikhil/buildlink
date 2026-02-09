import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Post text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's LinkedIn access token from profile using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linkedin_access_token')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.linkedin_access_token) {
      console.error('No LinkedIn access token found:', profileError);
      return new Response(JSON.stringify({ 
        error: 'LinkedIn not connected',
        requiresReauth: true,
        message: 'Please log out and log back in to grant posting permissions.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = profile.linkedin_access_token;

    // First, get the user's LinkedIn URN (person ID)
    console.log('Fetching LinkedIn user info...');
    const meResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('LinkedIn userinfo failed:', errorText);
      
      // Token might be expired
      if (meResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'LinkedIn token expired',
          requiresReauth: true,
          message: 'Please log out and log back in to refresh your LinkedIn connection.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to fetch LinkedIn profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userInfo = await meResponse.json();
    const linkedinSub = userInfo.sub; // This is the LinkedIn user ID
    console.log('LinkedIn user sub:', linkedinSub);

    // Create the share post using LinkedIn's UGC Post API
    // The author URN format is "urn:li:person:{id}"
    const sharePayload = {
      author: `urn:li:person:${linkedinSub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    console.log('Posting to LinkedIn...');
    const shareResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(sharePayload),
    });

    if (!shareResponse.ok) {
      const errorText = await shareResponse.text();
      console.error('LinkedIn share failed:', shareResponse.status, errorText);
      
      // Check for specific error types
      if (shareResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'LinkedIn token expired',
          requiresReauth: true,
          message: 'Please log out and log back in to refresh your LinkedIn connection.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (shareResponse.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'LinkedIn posting not authorized',
          requiresReauth: true,
          message: 'Please log out and log back in to grant posting permissions.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to post to LinkedIn', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shareResult = await shareResponse.json();
    console.log('LinkedIn share successful:', shareResult.id);

    return new Response(JSON.stringify({ 
      success: true, 
      postId: shareResult.id,
      message: 'Successfully posted to LinkedIn!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn share error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
