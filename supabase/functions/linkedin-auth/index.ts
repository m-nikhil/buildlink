import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, forceSync } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID');
    const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error('Missing LinkedIn credentials');
      return new Response(JSON.stringify({ error: 'LinkedIn credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange authorization code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('Access token obtained');

    // Fetch user profile from LinkedIn userinfo endpoint (OIDC)
    console.log('Fetching LinkedIn profile from /v2/userinfo...');
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Profile fetch failed:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch LinkedIn profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileData = await profileResponse.json();
    console.log('LinkedIn /v2/userinfo response:', JSON.stringify(profileData));

    // Also try /v2/me endpoint to see what it returns with current scopes
    console.log('Trying LinkedIn /v2/me endpoint...');
    const meResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    let vanityName: string | null = null;
    let linkedinHeadline: string | null = null;
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('LinkedIn /v2/me response:', JSON.stringify(meData));
      vanityName = meData.vanityName || null;
      linkedinHeadline = meData.headline?.localized?.en_US || meData.headline || null;
    } else {
      const meError = await meResponse.text();
      console.log('LinkedIn /v2/me failed:', meError);
    }

    const email = profileData.email;
    const fullName = profileData.name;
    const avatarUrl = profileData.picture;
    const linkedinSub = profileData.sub;
    const linkedinUrl = vanityName ? `https://linkedin.com/in/${vanityName}` : null;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email not available from LinkedIn' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    let userId: string;
    let isNewUser = false;

    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('Existing user found:', userId);
      
      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: fullName,
          avatar_url: avatarUrl,
          linkedin_id: linkedinSub,
          provider: 'linkedin',
        },
      });
    } else {
      // Create new user
      console.log('Creating new user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: avatarUrl,
          linkedin_id: linkedinSub,
          provider: 'linkedin',
        },
      });

      if (createError) {
        console.error('User creation failed:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log('New user created:', userId);

      // Create initial profile with LinkedIn data including avatar, URL, and headline
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        full_name: fullName,
        email: email,
        avatar_url: avatarUrl,
        linkedin_url: linkedinUrl,
        headline: linkedinHeadline,
      });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // Don't fail the auth flow, profile can be created later
      } else {
        console.log('Profile created with LinkedIn data (avatar, URL, headline)');
      }
    }
    
    // For existing users, update avatar, linkedin_url, and headline
    // If forceSync is true, always update. Otherwise only update if empty.
    if (!isNewUser) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url, linkedin_url, headline')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingProfile) {
        const updates: Record<string, string> = {};
        if ((forceSync || !existingProfile.avatar_url) && avatarUrl) {
          updates.avatar_url = avatarUrl;
        }
        if ((forceSync || !existingProfile.linkedin_url) && linkedinUrl) {
          updates.linkedin_url = linkedinUrl;
        }
        if ((forceSync || !existingProfile.headline) && linkedinHeadline) {
          updates.headline = linkedinHeadline;
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('user_id', userId);
          console.log('Updated existing profile with LinkedIn data:', Object.keys(updates), forceSync ? '(force sync)' : '');
        }
      }
    }

    // Generate a session for the user using magic link approach
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError) {
      console.error('Link generation failed:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token from the link
    const linkUrl = new URL(linkData.properties.action_link);
    const token = linkUrl.searchParams.get('token');
    const type = linkUrl.searchParams.get('type');

    return new Response(JSON.stringify({
      success: true,
      token,
      type,
      isNewUser,
      user: {
        id: userId,
        email,
        fullName,
        avatarUrl,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
