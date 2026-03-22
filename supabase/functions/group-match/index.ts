import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get the Monday of the given date's week
function getWeekOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Send match notification to both users
async function notifyMatch(
  supabaseAdmin: any,
  userAId: string,
  userBId: string,
  groupId: string,
  groupName: string,
  reason: string,
  profiles: any[],
) {
  const profileA = profiles.find((p: any) => p.user_id === userAId);
  const profileB = profiles.find((p: any) => p.user_id === userBId);
  const nameA = profileA?.full_name?.split(' ')[0] || 'Someone';
  const nameB = profileB?.full_name?.split(' ')[0] || 'Someone';

  const notifications = [
    {
      user_id: userAId,
      type: 'match_created',
      title: `New match in ${groupName}`,
      body: `You've been matched with ${nameB}! ${reason}`,
      link: `/groups/${groupId}`,
    },
    {
      user_id: userBId,
      type: 'match_created',
      title: `New match in ${groupName}`,
      body: `You've been matched with ${nameA}! ${reason}`,
      link: `/groups/${groupId}`,
    },
  ];

  const { error } = await supabaseAdmin.from('notifications').insert(notifications);
  if (error) console.error('Error sending match notifications:', error);
}

// Generate a Jitsi video call URL
function generateVideoCallUrl(matchId: string): string {
  const roomName = `BuildLink-Group-${matchId.substring(0, 12)}`;
  return `https://meet.jit.si/${roomName}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function can be called:
    // 1. By a cron job (service role, no auth header) to match all timeslots
    // 2. By an admin/owner to trigger matching for a specific timeslot

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const targetTimeslotId = body.timeslot_id; // optional: match only this timeslot

    // Determine the week we're matching for.
    // The scheduler runs 1 day before the timeslot, so we figure out which
    // timeslots happen tomorrow.
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay(); // 0=Sun..6=Sat
    const weekOf = getWeekOf(tomorrow);

    // Find timeslots happening tomorrow (or a specific one)
    let timeslotQuery = supabaseAdmin
      .from('group_timeslots')
      .select('*, groups!inner(id, name, owner_id)');

    if (targetTimeslotId) {
      timeslotQuery = timeslotQuery.eq('id', targetTimeslotId);
    } else {
      timeslotQuery = timeslotQuery.eq('day_of_week', tomorrowDayOfWeek);
    }

    const { data: timeslots, error: tsError } = await timeslotQuery;
    if (tsError) throw tsError;
    if (!timeslots || timeslots.length === 0) {
      return new Response(JSON.stringify({ message: 'No timeslots to match for tomorrow', matches_created: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalMatchesCreated = 0;

    for (const timeslot of timeslots) {
      const groupId = timeslot.group_id;

      // Get confirmed users for this timeslot and week
      const { data: confirmations, error: confError } = await supabaseAdmin
        .from('timeslot_confirmations')
        .select('user_id')
        .eq('timeslot_id', timeslot.id)
        .eq('week_of', weekOf);

      if (confError) {
        console.error(`Error fetching confirmations for timeslot ${timeslot.id}:`, confError);
        continue;
      }

      if (!confirmations || confirmations.length < 2) {
        console.log(`Timeslot ${timeslot.id}: only ${confirmations?.length ?? 0} confirmed, need at least 2`);
        continue;
      }

      const confirmedUserIds = confirmations.map((c: any) => c.user_id);

      // Check which users already have a match this week for this timeslot
      const { data: existingMatches } = await supabaseAdmin
        .from('group_matches')
        .select('user_a_id, user_b_id')
        .eq('timeslot_id', timeslot.id)
        .eq('week_of', weekOf);

      const alreadyMatchedUsers = new Set<string>();
      existingMatches?.forEach((m: any) => {
        alreadyMatchedUsers.add(m.user_a_id);
        alreadyMatchedUsers.add(m.user_b_id);
      });

      // Filter out already matched users
      const unmatchedUserIds = confirmedUserIds.filter((uid: string) => !alreadyMatchedUsers.has(uid));

      if (unmatchedUserIds.length < 2) {
        console.log(`Timeslot ${timeslot.id}: only ${unmatchedUserIds.length} unmatched users`);
        continue;
      }

      // Fetch profiles of unmatched users
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('user_id', unmatchedUserIds);

      if (profError || !profiles || profiles.length < 2) {
        console.error(`Error fetching profiles for timeslot ${timeslot.id}:`, profError);
        continue;
      }

      // Get LAST WEEK's matches in this group to enforce cooldown
      // (don't match the same pair two weeks in a row)
      const lastWeekDate = new Date(tomorrow);
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      const lastWeekOf = getWeekOf(lastWeekDate);

      const { data: lastWeekMatches } = await supabaseAdmin
        .from('group_matches')
        .select('user_a_id, user_b_id')
        .eq('group_id', groupId)
        .eq('week_of', lastWeekOf);

      const recentPairs = new Set<string>();
      lastWeekMatches?.forEach((m: any) => {
        recentPairs.add(`${m.user_a_id}_${m.user_b_id}`);
        recentPairs.add(`${m.user_b_id}_${m.user_a_id}`);
      });

      // Use AI to generate optimal pairings
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      const profileSummaries = profiles.map((p: any, i: number) => `
User ${i + 1} (user_id: ${p.user_id}):
- Name: ${p.full_name || 'Not specified'}
- Headline: ${p.headline || 'Not specified'}
- Bio: ${p.bio || 'Not specified'}
- Industry: ${p.industry || 'Not specified'}
- Experience Level: ${p.experience_level || 'Not specified'}
- Looking For: ${p.looking_for?.join(', ') || 'Not specified'}
- Skills: ${p.skills?.join(', ') || 'Not specified'}
- Location: ${p.location || 'Not specified'}
`).join('\n');

      const pastPairsList = Array.from(recentPairs)
        .filter(pair => {
          const [a, b] = pair.split('_');
          return unmatchedUserIds.includes(a) && unmatchedUserIds.includes(b);
        })
        .slice(0, 50) // Limit context
        .map(pair => {
          const [a, b] = pair.split('_');
          const nameA = profiles.find((p: any) => p.user_id === a)?.full_name || a;
          const nameB = profiles.find((p: any) => p.user_id === b)?.full_name || b;
          return `${nameA} <-> ${nameB}`;
        });

      const systemPrompt = `You are a matchmaker for a professional networking group called "${(timeslot as any).groups?.name || 'Unknown'}".

Given a list of users who confirmed availability for a weekly 1:1, create optimal pairings based on profile likeness and complementarity.

Rules:
1. Each user can only be in ONE pair
2. If odd number of users, one person is left out (pick the one who would have the weakest match)
3. NEVER repeat pairings from last week (listed below) - this is a HARD REQUIREMENT
4. Prioritize: shared interests > complementary skills > industry overlap > experience level compatibility
5. Provide a short reason for each pairing

${pastPairsList.length > 0 ? `\nLast week's pairings (MUST NOT repeat):\n${pastPairsList.join('\n')}` : ''}`;

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
            { role: 'user', content: `Users available for matching:\n${profileSummaries}\n\nCreate optimal 1:1 pairings.` }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'create_pairings',
                description: 'Create 1:1 match pairings from the confirmed users',
                parameters: {
                  type: 'object',
                  properties: {
                    pairs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          user_a_id: { type: 'string', description: 'user_id of first person' },
                          user_b_id: { type: 'string', description: 'user_id of second person' },
                          reason: { type: 'string', description: 'Brief reason for this pairing (1 sentence)' }
                        },
                        required: ['user_a_id', 'user_b_id', 'reason'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['pairs'],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'create_pairings' } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI error for timeslot ${timeslot.id}:`, response.status, errorText);
        // Fallback: random pairing with cooldown check
        const shuffled = [...unmatchedUserIds].sort(() => Math.random() - 0.5);
        const usedFallback = new Set<string>();
        for (let i = 0; i < shuffled.length; i++) {
          if (usedFallback.has(shuffled[i])) continue;
          for (let j = i + 1; j < shuffled.length; j++) {
            if (usedFallback.has(shuffled[j])) continue;
            // Skip if this pair was matched last week
            if (recentPairs.has(`${shuffled[i]}_${shuffled[j]}`)) continue;
            const matchId = crypto.randomUUID();
            await supabaseAdmin.from('group_matches').insert({
              id: matchId,
              group_id: groupId,
              timeslot_id: timeslot.id,
              user_a_id: shuffled[i],
              user_b_id: shuffled[j],
              week_of: weekOf,
              match_reason: 'Randomly paired (AI unavailable)',
              video_call_url: generateVideoCallUrl(matchId),
              status: 'scheduled',
            });
            await notifyMatch(supabaseAdmin, shuffled[i], shuffled[j], groupId, (timeslot as any).groups?.name || 'your group', 'Randomly paired', profiles);
            usedFallback.add(shuffled[i]);
            usedFallback.add(shuffled[j]);
            totalMatchesCreated++;
            break;
          }
        }
        continue;
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall?.function?.arguments) {
        console.error(`Invalid AI response for timeslot ${timeslot.id}`);
        continue;
      }

      const pairingResult = JSON.parse(toolCall.function.arguments);
      const usedUserIds = new Set<string>();

      for (const pair of pairingResult.pairs) {
        // Validate both users are in the confirmed list and not already used
        if (
          !unmatchedUserIds.includes(pair.user_a_id) ||
          !unmatchedUserIds.includes(pair.user_b_id) ||
          usedUserIds.has(pair.user_a_id) ||
          usedUserIds.has(pair.user_b_id) ||
          pair.user_a_id === pair.user_b_id
        ) {
          console.warn(`Skipping invalid pair: ${pair.user_a_id} <-> ${pair.user_b_id}`);
          continue;
        }

        const matchId = crypto.randomUUID();
        const { error: insertError } = await supabaseAdmin.from('group_matches').insert({
          id: matchId,
          group_id: groupId,
          timeslot_id: timeslot.id,
          user_a_id: pair.user_a_id,
          user_b_id: pair.user_b_id,
          week_of: weekOf,
          match_reason: pair.reason,
          video_call_url: generateVideoCallUrl(matchId),
          status: 'scheduled',
        });

        if (insertError) {
          console.error(`Error inserting match:`, insertError);
          continue;
        }

        await notifyMatch(supabaseAdmin, pair.user_a_id, pair.user_b_id, groupId, (timeslot as any).groups?.name || 'your group', pair.reason, profiles);
        usedUserIds.add(pair.user_a_id);
        usedUserIds.add(pair.user_b_id);
        totalMatchesCreated++;
      }
    }

    return new Response(JSON.stringify({
      message: `Matching complete`,
      matches_created: totalMatchesCreated,
      timeslots_processed: timeslots.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Group match error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
