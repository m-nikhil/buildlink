import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

// Get the Monday of the week containing the given date
function getWeekOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find timeslots happening in 3 days (confirmation window just opened)
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDayOfWeek = threeDaysFromNow.getDay(); // 0=Sun..6=Sat
    const weekOf = getWeekOf(threeDaysFromNow);

    // Get all timeslots happening in 3 days
    const { data: timeslots, error: tsError } = await supabaseAdmin
      .from('group_timeslots')
      .select('*, groups!inner(id, name)')
      .eq('day_of_week', targetDayOfWeek);

    if (tsError) throw tsError;
    if (!timeslots || timeslots.length === 0) {
      return new Response(JSON.stringify({ message: 'No timeslots in 3 days', reminders_sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalReminders = 0;

    for (const timeslot of timeslots) {
      const groupName = (timeslot as any).groups?.name || 'your group';
      const dayLabel = DAY_LABELS[timeslot.day_of_week] || 'upcoming day';

      // Get all subscribers for this timeslot
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('timeslot_subscriptions')
        .select('user_id')
        .eq('timeslot_id', timeslot.id);

      if (subError || !subscriptions || subscriptions.length === 0) continue;

      // Check who already confirmed this week
      const { data: existingConfirmations } = await supabaseAdmin
        .from('timeslot_confirmations')
        .select('user_id')
        .eq('timeslot_id', timeslot.id)
        .eq('week_of', weekOf);

      const confirmedSet = new Set((existingConfirmations ?? []).map((c: any) => c.user_id));

      // Check who already got a reminder this week for this timeslot
      const { data: existingReminders } = await supabaseAdmin
        .from('notifications')
        .select('user_id')
        .eq('type', 'confirm_reminder')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .in('user_id', subscriptions.map((s: any) => s.user_id));

      const remindedSet = new Set((existingReminders ?? []).map((r: any) => r.user_id));

      // Send reminders to unconfirmed, unreminded subscribers
      const notifications = subscriptions
        .filter((s: any) => !confirmedSet.has(s.user_id) && !remindedSet.has(s.user_id))
        .map((s: any) => ({
          user_id: s.user_id,
          type: 'confirm_reminder',
          title: `Confirm for ${dayLabel}`,
          body: `Your ${groupName} 1:1 is in 3 days (${timeslot.start_time.slice(0, 5)}). Confirm now to get matched!`,
          link: `/groups/${timeslot.group_id}`,
          metadata: { timeslot_id: timeslot.id, week_of: weekOf },
        }));

      if (notifications.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (insertError) {
          console.error(`Error sending reminders for timeslot ${timeslot.id}:`, insertError);
        } else {
          totalReminders += notifications.length;
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Reminders sent',
      reminders_sent: totalReminders,
      timeslots_checked: timeslots.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Confirm reminder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
