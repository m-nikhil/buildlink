import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firestore REST API helper
async function firestoreQuery(
  projectId: string,
  accessToken: string,
  collectionPath: string
) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Get access token using service account
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid Firebase service account configuration');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${claimB64}`;

  const privateKey = serviceAccount.private_key;
  const base64 = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
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

// Parse Firestore document to plain object
function parseFirestoreDoc(doc: any) {
  const fields = doc.fields || {};
  const result: any = { id: doc.name?.split('/').pop() };
  
  for (const [key, value] of Object.entries(fields)) {
    const v = value as any;
    if (v.stringValue !== undefined) result[key] = v.stringValue;
    else if (v.integerValue !== undefined) result[key] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) result[key] = v.doubleValue;
    else if (v.booleanValue !== undefined) result[key] = v.booleanValue;
    else if (v.nullValue !== undefined) result[key] = null;
    else if (v.arrayValue !== undefined) {
      result[key] = (v.arrayValue.values || []).map((av: any) => {
        if (av.stringValue !== undefined) return av.stringValue;
        if (av.integerValue !== undefined) return parseInt(av.integerValue);
        return av.stringValue || null;
      });
    }
  }
  
  return result;
}

async function updateLastCursor(
  supabase: SupabaseClient,
  userId: string,
  swipeDate: string,
  lastCursor: string
) {
  await supabase
    .from('daily_swipes')
    .upsert({
      user_id: userId,
      swipe_date: swipeDate,
      last_cursor: lastCursor,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,swipe_date' });
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

    const DAILY_SWIPE_LIMIT = 5;
    const today = new Date().toISOString().split('T')[0];

    // Get profiles from Firestore
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID not configured');
    
    const accessToken = await getAccessToken();
    const firestoreData = await firestoreQuery(projectId, accessToken, 'profiles');
    
    const allProfiles = (firestoreData.documents || [])
      .map(parseFirestoreDoc)
      .filter((p: any) => p.user_id !== user.id);

    // Get current user's profile from Firestore
    const userProfile = (firestoreData.documents || [])
      .map(parseFirestoreDoc)
      .find((p: any) => p.user_id === user.id);

    if (!userProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get daily swipe count
    const { data: dailySwipe } = await supabase
      .from('daily_swipes')
      .select('swipe_count')
      .eq('user_id', user.id)
      .eq('swipe_date', today)
      .maybeSingle();

    const currentSwipeCount = dailySwipe?.swipe_count || 0;
    const remainingSwipes = Math.max(0, DAILY_SWIPE_LIMIT - currentSwipeCount);

    if (remainingSwipes <= 0) {
      return new Response(JSON.stringify({ 
        matches: [], 
        daily_limit_reached: true,
        swipes_used: currentSwipeCount,
        swipes_remaining: 0,
        daily_limit: DAILY_SWIPE_LIMIT
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connections and dismissed profiles
    const { data: connections } = await supabase
      .from('connections')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    const { data: dismissedProfiles } = await supabase
      .from('dismissed_profiles')
      .select('dismissed_profile_id, dismiss_count, last_dismissed_at')
      .eq('user_id', user.id);

    const excludedUserIds = new Set<string>();
    const likedYouUserIds = new Set<string>();
    
    connections?.forEach((conn) => {
      if (conn.requester_id === user.id) {
        excludedUserIds.add(conn.recipient_id);
      } else if (conn.recipient_id === user.id) {
        if (conn.status === 'accepted') {
          excludedUserIds.add(conn.requester_id);
        } else if (conn.status === 'pending') {
          likedYouUserIds.add(conn.requester_id);
        }
      }
    });

    const permanentlyDismissedIds = new Set<string>();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    dismissedProfiles?.forEach((d) => {
      if (d.dismiss_count >= 3) {
        permanentlyDismissedIds.add(d.dismissed_profile_id);
      }
    });

    const availableProfiles = allProfiles.filter((p: any) => {
      if (excludedUserIds.has(p.user_id)) return false;
      if (permanentlyDismissedIds.has(p.user_id)) return false;
      if (likedYouUserIds.has(p.user_id)) return true;
      return true;
    });

    if (availableProfiles.length === 0) {
      return new Response(JSON.stringify({ 
        matches: [],
        swipes_used: currentSwipeCount,
        swipes_remaining: remainingSwipes,
        daily_limit: DAILY_SWIPE_LIMIT
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a professional matchmaker. Rank candidates by compatibility with the user. Return matches with scores and reasons.`;

    const userProfileSummary = `User: ${userProfile.full_name}, ${userProfile.headline}, ${userProfile.industry}, ${userProfile.experience_level}, Looking for: ${userProfile.looking_for?.join(', ')}`;

    const candidatesSummary = availableProfiles.slice(0, 20).map((p: any, i: number) => 
      `${i + 1}. ID:${p.user_id} - ${p.full_name}, ${p.headline}, ${p.industry}, ${p.experience_level}${likedYouUserIds.has(p.user_id) ? ' [LIKED YOU]' : ''}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userProfileSummary}\n\nCandidates:\n${candidatesSummary}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'rank_matches',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      profile_id: { type: 'string' },
                      score: { type: 'number' },
                      reason: { type: 'string' }
                    },
                    required: ['profile_id', 'score', 'reason']
                  }
                }
              },
              required: ['matches']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'rank_matches' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('AI service error: ' + errorText);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    const matchResults = JSON.parse(toolCall?.function?.arguments || '{"matches":[]}');

    const enrichedMatches = matchResults.matches
      .filter((m: any) => m.score >= 50)
      .slice(0, remainingSwipes)
      .map((match: any) => {
        const profile = availableProfiles.find((p: any) => p.user_id === match.profile_id);
        return {
          ...match,
          profile,
          liked_you: likedYouUserIds.has(match.profile_id)
        };
      })
      .filter((m: any) => m.profile)
      .sort((a: any, b: any) => (b.liked_you ? 1 : 0) - (a.liked_you ? 1 : 0));

    return new Response(JSON.stringify({ 
      matches: enrichedMatches,
      swipes_used: currentSwipeCount,
      swipes_remaining: remainingSwipes,
      daily_limit: DAILY_SWIPE_LIMIT
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Match error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
