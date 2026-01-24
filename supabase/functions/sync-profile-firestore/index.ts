import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firestore REST API helper
async function firestoreRequest(
  projectId: string,
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const url = `${baseUrl}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Check if a document exists in Firestore
async function firestoreDocExists(
  projectId: string,
  accessToken: string,
  docPath: string
): Promise<boolean> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const url = `${baseUrl}${docPath}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.ok;
}

// Convert profile to Firestore document format
function profileToFirestoreFields(profile: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(profile)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) 
        ? { integerValue: value.toString() }
        : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: v.toString() };
            return { stringValue: String(v) };
          })
        }
      };
    }
  }
  
  return fields;
}

// Get access token using service account
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid Firebase service account configuration');
  }

  // Create JWT - use cloud-platform scope for full Firestore access
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Sign with RSA
  const privateKey = serviceAccount.private_key;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get access token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, profileData } = await req.json();
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID not configured');
    }

    const accessToken = await getAccessToken();

    // Action: ensure-profile - Create profile if it doesn't exist
    if (action === 'ensure-profile') {
      const profileId = user.id;
      
      // Check if profile already exists
      const exists = await firestoreDocExists(projectId, accessToken, `/profiles/${profileId}`);
      
      if (exists) {
        return new Response(JSON.stringify({ success: true, created: false, message: 'Profile already exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new profile
      const newProfile = {
        id: profileId,
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        email: user.email || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        headline: null,
        bio: null,
        linkedin_url: null,
        experience_level: null,
        industry: null,
        looking_for: [],
        skills: [],
        location: null,
        age: null,
        preferred_experience_levels: [],
        preferred_industries: [],
        preferred_goals: [],
        age_min: 18,
        age_max: 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const fields = profileToFirestoreFields(newProfile);
      const fieldPaths = Object.keys(newProfile).map(k => `updateMask.fieldPaths=${k}`).join('&');

      await firestoreRequest(
        projectId,
        accessToken,
        'PATCH',
        `/profiles/${profileId}?${fieldPaths}`,
        { fields }
      );

      return new Response(JSON.stringify({ success: true, created: true, profile: newProfile }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: update-profile - Update existing profile
    if (action === 'update-profile') {
      const profileId = user.id;
      
      const updatedData = {
        ...profileData,
        id: profileId,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const fields = profileToFirestoreFields(updatedData);
      const fieldPaths = Object.keys(updatedData).map(k => `updateMask.fieldPaths=${k}`).join('&');

      await firestoreRequest(
        projectId,
        accessToken,
        'PATCH',
        `/profiles/${profileId}?${fieldPaths}`,
        { fields }
      );

      return new Response(JSON.stringify({ success: true, profile: updatedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use ensure-profile or update-profile' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
