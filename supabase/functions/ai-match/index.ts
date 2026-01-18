import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update the keyset pagination cursor
async function updateLastCursor(
  supabase: SupabaseClient,
  userId: string,
  swipeDate: string,
  lastCursor: string
) {
  const { error } = await supabase
    .from('daily_swipes')
    .upsert({
      user_id: userId,
      swipe_date: swipeDate,
      last_cursor: lastCursor,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,swipe_date'
    });
  
  if (error) {
    console.error('Failed to update last cursor:', error);
  }
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

    // Get current user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const DAILY_SWIPE_LIMIT = 5;
    const CANDIDATE_PAGE_SIZE = 50; // Fetch 50 candidates per page
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get today's swipe count and last cursor for keyset pagination
    const { data: dailySwipe, error: swipeError } = await supabase
      .from('daily_swipes')
      .select('swipe_count, last_cursor')
      .eq('user_id', userProfile.id)
      .eq('swipe_date', today)
      .maybeSingle();

    if (swipeError) {
      console.error('Daily swipe error:', swipeError);
    }

    const currentSwipeCount = dailySwipe?.swipe_count || 0;
    const lastCursor = dailySwipe?.last_cursor || null;
    const remainingSwipes = Math.max(0, DAILY_SWIPE_LIMIT - currentSwipeCount);

    // If no swipes remaining, return early with limit info
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

    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${userProfile.id},recipient_id.eq.${userProfile.id}`);

    if (connectionsError) {
      console.error('Connections error:', connectionsError);
    }

    // Get dismissed profiles (max 3 dismisses = permanent hide, or recently dismissed = temporary hide)
    const { data: dismissedProfiles, error: dismissedError } = await supabase
      .from('dismissed_profiles')
      .select('dismissed_profile_id, dismiss_count, last_dismissed_at')
      .eq('user_id', userProfile.id);

    if (dismissedError) {
      console.error('Dismissed profiles error:', dismissedError);
    }

    // Build sets for different connection states
    const excludedProfileIds = new Set<string>(); // Profiles to completely exclude
    const likedYouProfileIds = new Set<string>(); // Profiles who liked you (pending received)
    
    if (connections) {
      connections.forEach((conn) => {
        if (conn.requester_id === userProfile.id) {
          // You sent this request - exclude them (pending or accepted)
          excludedProfileIds.add(conn.recipient_id);
        } else if (conn.recipient_id === userProfile.id) {
          if (conn.status === 'accepted') {
            // Already connected - exclude
            excludedProfileIds.add(conn.requester_id);
          } else if (conn.status === 'pending') {
            // They liked you - include with priority!
            likedYouProfileIds.add(conn.requester_id);
          }
        }
      });
    }

    // Profiles dismissed 3+ times are permanently excluded
    // Profiles dismissed recently (within last hour) are temporarily excluded
    const permanentlyDismissedIds = new Set<string>();
    const recentlyDismissedIds = new Set<string>();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    if (dismissedProfiles) {
      dismissedProfiles.forEach((d) => {
        if (d.dismiss_count >= 3) {
          permanentlyDismissedIds.add(d.dismissed_profile_id);
        } else if (d.last_dismissed_at > oneHourAgo) {
          recentlyDismissedIds.add(d.dismissed_profile_id);
        }
      });
    }

    // Get profiles using keyset pagination
    // Use created_at as cursor - fetch next page after last shown profile
    let profileQuery = supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(CANDIDATE_PAGE_SIZE);

    // Apply keyset pagination if we have a cursor from previous session
    if (lastCursor) {
      profileQuery = profileQuery.gt('created_at', lastCursor);
    }

    const { data: otherProfiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      throw profilesError;
    }

    // If no profiles after cursor, wrap around to beginning
    let finalProfiles = otherProfiles || [];
    if (finalProfiles.length === 0 && lastCursor) {
      // Reset cursor - start from beginning
      const { data: resetProfiles, error: resetError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(CANDIDATE_PAGE_SIZE);
      
      if (resetError) {
        throw resetError;
      }
      finalProfiles = resetProfiles || [];
    }

    // Filter profiles: exclude connected, permanently dismissed, and recently dismissed
    // BUT include profiles who liked you (even if recently dismissed, they get priority)
    const availableProfiles = finalProfiles.filter(p => {
      // Always exclude if you already sent them a request or are connected
      if (excludedProfileIds.has(p.id)) return false;
      
      // Always exclude permanently dismissed
      if (permanentlyDismissedIds.has(p.id)) return false;
      
      // If they liked you, include them (bypass recent dismiss cooldown)
      if (likedYouProfileIds.has(p.id)) return true;
      
      // Exclude recently dismissed (for regular profiles)
      if (recentlyDismissedIds.has(p.id)) return false;
      
      return true;
    });
    
    // Mark which profiles liked the user (for priority sorting later)
    const profilesWithLikedFlag = availableProfiles.map(p => ({
      ...p,
      _likedYou: likedYouProfileIds.has(p.id)
    }));

    // Track the last profile's created_at for cursor update
    const lastProfileCreatedAt = finalProfiles.length > 0 
      ? finalProfiles[finalProfiles.length - 1].created_at 
      : null;

    if (profilesWithLikedFlag.length === 0) {
      // Update cursor even if no matches (to progress through profiles)
      if (lastProfileCreatedAt) {
        await updateLastCursor(supabase, userProfile.id, today, lastProfileCreatedAt);
      }
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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build preference context
    const preferenceContext = `
User's Match Preferences:
- Preferred Experience Levels: ${userProfile.preferred_experience_levels?.join(', ') || 'Any'}
- Preferred Industries: ${userProfile.preferred_industries?.join(', ') || 'Any'}
- Preferred Goals: ${userProfile.preferred_goals?.join(', ') || 'Any'}
- Age Range: ${userProfile.age_min || 18} - ${userProfile.age_max || 99}
`;

    const systemPrompt = `You are a professional matchmaker for a dating-style networking app. Given a user's profile, their preferences, and a list of potential connections, analyze compatibility and return the top matches ranked by relevance.

Consider these factors when matching:
1. How well candidates match the user's stated preferences (experience, industry, goals)
2. Complementary goals (e.g., mentors match with mentees, hiring managers with job seekers)
3. Mutual benefit potential - would BOTH parties gain from connecting?
4. Skill complementarity and potential for collaboration
5. Location proximity when relevant

Prioritize candidates who closely match the user's preferences. Be thoughtful about WHY each match would be valuable.`;

    const userProfileSummary = `
User Profile:
- Name: ${userProfile.full_name || 'Not specified'}
- Headline: ${userProfile.headline || 'Not specified'}
- Bio: ${userProfile.bio || 'Not specified'}
- Industry: ${userProfile.industry || 'Not specified'}
- Experience Level: ${userProfile.experience_level || 'Not specified'}
- Looking For: ${userProfile.looking_for?.join(', ') || 'Not specified'}
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Location: ${userProfile.location || 'Not specified'}
- Age: ${userProfile.age || 'Not specified'}

${preferenceContext}
`;

    const candidatesSummary = profilesWithLikedFlag.map((p, i) => `
Candidate ${i + 1} (ID: ${p.id})${p._likedYou ? ' [ALREADY LIKED YOU - HIGH PRIORITY]' : ''}:
- Name: ${p.full_name || 'Not specified'}
- Headline: ${p.headline || 'Not specified'}
- Bio: ${p.bio || 'Not specified'}
- Industry: ${p.industry || 'Not specified'}
- Experience Level: ${p.experience_level || 'Not specified'}
- Looking For: ${p.looking_for?.join(', ') || 'Not specified'}
- Skills: ${p.skills?.join(', ') || 'Not specified'}
- Location: ${p.location || 'Not specified'}
- Age: ${p.age || 'Not specified'}
`).join('\n');

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
          { role: 'user', content: `${userProfileSummary}\n\nPotential Connections:\n${candidatesSummary}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'rank_matches',
              description: 'Return ranked list of profile matches with compatibility scores and reasons',
              parameters: {
                type: 'object',
                properties: {
                  matches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        profile_id: { type: 'string', description: 'The ID of the matched profile' },
                        score: { type: 'number', description: 'Compatibility score from 0-100' },
                        reason: { type: 'string', description: 'Brief explanation of why this is a good match (1-2 sentences)' }
                      },
                      required: ['profile_id', 'score', 'reason'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['matches'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'rank_matches' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const matchResults = JSON.parse(toolCall.function.arguments);
    
    // Enrich matches with full profile data and liked status
    // Limit to remaining swipes for the day
    const enrichedMatches = matchResults.matches
      .filter((m: any) => m.score >= 50) // Only return good matches
      .slice(0, remainingSwipes) // Limit to remaining daily swipes
      .map((match: any) => {
        const profile = profilesWithLikedFlag.find(p => p.id === match.profile_id);
        return {
          ...match,
          profile: profile ? { ...profile, _likedYou: undefined } : undefined, // Remove internal flag
          liked_you: profile?._likedYou || false
        };
      })
      .filter((m: any) => m.profile) // Ensure profile exists
      // Sort to put "liked you" profiles first
      .sort((a: any, b: any) => (b.liked_you ? 1 : 0) - (a.liked_you ? 1 : 0));

    // Update the cursor to the last profile we processed
    if (lastProfileCreatedAt) {
      await updateLastCursor(supabase, userProfile.id, today, lastProfileCreatedAt);
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
