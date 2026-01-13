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

    // Get all other profiles
    const { data: otherProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id);

    if (profilesError) {
      throw profilesError;
    }

    if (!otherProfiles || otherProfiles.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a professional networking matchmaker. Given a user's profile and a list of potential connections, analyze compatibility and return the top matches ranked by relevance.

Consider these factors when matching:
1. Complementary goals (e.g., mentors match with mentees, hiring managers with job seekers)
2. Industry alignment or cross-industry synergy potential
3. Experience level compatibility (mentorship pairs or peer collaboration)
4. Skill complementarity
5. Location proximity (when relevant)

Be thoughtful about WHY each match would be valuable for both parties.`;

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
`;

    const candidatesSummary = otherProfiles.map((p, i) => `
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
    
    // Enrich matches with full profile data
    const enrichedMatches = matchResults.matches
      .filter((m: any) => m.score >= 50) // Only return good matches
      .slice(0, 10) // Top 10 matches
      .map((match: any) => {
        const profile = otherProfiles.find(p => p.id === match.profile_id);
        return {
          ...match,
          profile
        };
      })
      .filter((m: any) => m.profile); // Ensure profile exists

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
