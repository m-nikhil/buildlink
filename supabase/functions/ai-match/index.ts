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

    // Get all connections for this user (connections use user_id, not profile.id)
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${userProfile.user_id},recipient_id.eq.${userProfile.user_id}`);

    if (connectionsError) {
      console.error('Connections error:', connectionsError);
    }

    // Build a set of user_ids to exclude (users we've already swiped on or are connected with)
    // BUT keep users that have liked us (pending where we are recipient) so user can swipe to match
    const excludedUserIds = new Set<string>();
    const likesUserIds = new Set<string>(); // User IDs that have liked the current user
    
    if (connections) {
      connections.forEach((conn) => {
        if (conn.requester_id === userProfile.user_id) {
          // We initiated this - exclude them (we already swiped)
          excludedUserIds.add(conn.recipient_id);
        } else if (conn.recipient_id === userProfile.user_id) {
          // They initiated - check status
          if (conn.status === 'pending') {
            // They liked us but we haven't responded - SHOW them with badge
            likesUserIds.add(conn.requester_id);
          } else {
            // Already accepted/rejected - exclude
            excludedUserIds.add(conn.requester_id);
          }
        }
      });
    }

    // Get all other profiles - exclude by user_id AND by email to handle seed data
    let profilesQuery = supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id);
    
    // Also exclude profiles with matching email (for seed profiles with different user_ids)
    if (user.email) {
      profilesQuery = profilesQuery.neq('email', user.email);
    }
    
    const { data: otherProfiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    // Filter out already connected profiles (use user_id for comparison)
    const availableProfiles = otherProfiles?.filter(p => !excludedUserIds.has(p.user_id)) || [];

    if (availableProfiles.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
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

${preferenceContext}
`;

    const candidatesSummary = availableProfiles.map((p, i) => `
Candidate ${i + 1} (ID: ${p.id}):
- Name: ${p.full_name || 'Not specified'}
- Headline: ${p.headline || 'Not specified'}
- Bio: ${p.bio || 'Not specified'}
- Industry: ${p.industry || 'Not specified'}
- Experience Level: ${p.experience_level || 'Not specified'}
- Looking For: ${p.looking_for?.join(', ') || 'Not specified'}
- Skills: ${p.skills?.join(', ') || 'Not specified'}
- Location: ${p.location || 'Not specified'}
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
    
    // Enrich matches with full profile data and likes_you flag
    let enrichedMatches = matchResults.matches
      .slice(0, 10) // Top 10 matches
      .map((match: any) => {
        const profile = availableProfiles.find(p => p.id === match.profile_id);
        return {
          ...match,
          profile,
          likes_you: likesUserIds.has(profile?.user_id || '')
        };
      })
      .filter((m: any) => m.profile); // Ensure profile exists

    // IMPORTANT: Add profiles that liked the user but weren't returned by AI (or scored too low)
    const matchedProfileIds = new Set(enrichedMatches.map((m: any) => m.profile?.id));
    const profilesThatLikedUs = availableProfiles.filter(p => 
      likesUserIds.has(p.user_id) && !matchedProfileIds.has(p.id)
    );
    
    // Add these profiles with a default score and mark them as likes_you
    for (const profile of profilesThatLikedUs) {
      enrichedMatches.push({
        profile_id: profile.id,
        score: 85, // Give a good default score since they showed interest
        reason: "This person has shown interest in connecting with you!",
        profile,
        likes_you: true
      });
    }

    // Sort so profiles that like the user appear first
    enrichedMatches = enrichedMatches.sort((a: any, b: any) => {
      if (a.likes_you && !b.likes_you) return -1;
      if (!a.likes_you && b.likes_you) return 1;
      return b.score - a.score;
    });

    return new Response(JSON.stringify({ matches: enrichedMatches }), {
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
