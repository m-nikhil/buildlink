import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get the start of the current week (Monday)
function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Generate a simple video call URL (using Jitsi Meet as a free option)
function generateVideoCallUrl(introId: string): string {
  const roomName = `buildlink-intro-${introId.slice(0, 8)}`;
  return `https://meet.jit.si/${roomName}`;
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

    // Create client with user's auth for reading
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create service role client for inserting (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const weekStart = getWeekStart();

    // Check if user already has an intro this week
    const { data: existingIntro, error: existingError } = await supabaseUser
      .from('weekly_intros')
      .select('*')
      .eq('week_start', weekStart)
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing intro:', existingError);
    }

    if (existingIntro) {
      return new Response(JSON.stringify({ 
        message: 'You already have an intro for this week',
        intro: existingIntro 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current user's profile
    const { data: userProfile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found. Please complete your profile first.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all existing connections
    const { data: connections } = await supabaseUser
      .from('connections')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    const connectedUserIds = new Set<string>();
    connections?.forEach(conn => {
      if (conn.requester_id === user.id) {
        connectedUserIds.add(conn.recipient_id);
      } else {
        connectedUserIds.add(conn.requester_id);
      }
    });

    // Get past intro matches to avoid repetition
    const { data: pastIntros } = await supabaseUser
      .from('weekly_intros')
      .select('matched_user_id, user_id')
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`);

    const pastMatchUserIds = new Set<string>();
    pastIntros?.forEach(intro => {
      if (intro.user_id === user.id) {
        pastMatchUserIds.add(intro.matched_user_id);
      } else {
        pastMatchUserIds.add(intro.user_id);
      }
    });

    // Get available profiles (exclude self, connected users, past intros)
    let profilesQuery = supabaseUser
      .from('profiles')
      .select('*')
      .neq('user_id', user.id);

    if (user.email) {
      profilesQuery = profilesQuery.neq('email', user.email);
    }

    const { data: availableProfiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    // Filter out connected users and past intros
    const candidateProfiles = availableProfiles?.filter(p => 
      !connectedUserIds.has(p.user_id) && !pastMatchUserIds.has(p.user_id)
    ) || [];

    if (candidateProfiles.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No available matches found. You may have already connected with or been introduced to all available users.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to find the best match
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a professional matchmaker for a weekly networking intro feature. Given a user's profile and a list of candidates, select THE SINGLE BEST match for a meaningful one-on-one introduction.

Consider these factors:
1. Complementary goals (mentors with mentees, hiring managers with job seekers)
2. Shared or adjacent industries for relevant conversations
3. Compatible experience levels for mutual benefit
4. Geographic proximity when possible
5. Skill complementarity

Select the ONE candidate who would provide the most valuable connection for a weekly intro.`;

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
- Preferred Industries: ${userProfile.preferred_industries?.join(', ') || 'Any'}
- Preferred Experience: ${userProfile.preferred_experience_levels?.join(', ') || 'Any'}
- Preferred Goals: ${userProfile.preferred_goals?.join(', ') || 'Any'}
`;

    const candidatesSummary = candidateProfiles.slice(0, 20).map((p, i) => `
Candidate ${i + 1} (user_id: ${p.user_id}):
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
          { role: 'user', content: `${userProfileSummary}\n\nCandidate Profiles:\n${candidatesSummary}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'select_best_match',
              description: 'Select the single best match for a weekly intro',
              parameters: {
                type: 'object',
                properties: {
                  selected_user_id: { 
                    type: 'string', 
                    description: 'The user_id of the selected best match' 
                  },
                  match_reason: { 
                    type: 'string', 
                    description: 'Brief explanation of why this is the best match (1-2 sentences)' 
                  }
                },
                required: ['selected_user_id', 'match_reason'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'select_best_match' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const matchResult = JSON.parse(toolCall.function.arguments);
    const matchedUserId = matchResult.selected_user_id;

    // Verify the matched user exists in our candidates
    const matchedProfile = candidateProfiles.find(p => p.user_id === matchedUserId);
    if (!matchedProfile) {
      // Fallback to random selection if AI returned invalid ID
      const randomIndex = Math.floor(Math.random() * candidateProfiles.length);
      const fallbackProfile = candidateProfiles[randomIndex];
      
      const introId = crypto.randomUUID();
      const videoCallUrl = generateVideoCallUrl(introId);

      const { data: newIntro, error: insertError } = await supabaseAdmin
        .from('weekly_intros')
        .insert({
          id: introId,
          user_id: user.id,
          matched_user_id: fallbackProfile.user_id,
          week_start: weekStart,
          video_call_url: videoCallUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ 
        intro: newIntro,
        match_reason: 'Selected for potential networking synergy'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the intro with video call URL
    const introId = crypto.randomUUID();
    const videoCallUrl = generateVideoCallUrl(introId);

    const { data: newIntro, error: insertError } = await supabaseAdmin
      .from('weekly_intros')
      .insert({
        id: introId,
        user_id: user.id,
        matched_user_id: matchedUserId,
        week_start: weekStart,
        video_call_url: videoCallUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Auto-create connection when intro is created
    const { error: connectionError } = await supabaseAdmin
      .from('connections')
      .insert({
        requester_id: user.id,
        recipient_id: matchedUserId,
        status: 'accepted', // Auto-accept for weekly intros
        message: 'Connected via Weekly Intro'
      });

    if (connectionError) {
      console.error('Connection creation error:', connectionError);
      // Don't throw - intro was created successfully
    }

    return new Response(JSON.stringify({ 
      intro: newIntro,
      match_reason: matchResult.match_reason
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Weekly intro match error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
