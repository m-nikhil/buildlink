import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useTrackSwipe() {
  const queryClient = useQueryClient();
  const { data: userProfile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!userProfile) throw new Error('User profile not found');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Try to get existing record for today
      const { data: existing, error: fetchError } = await supabase
        .from('daily_swipes')
        .select('id, swipe_count')
        .eq('user_id', userProfile.id)
        .eq('swipe_date', today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Increment swipe count
        const { error: updateError } = await supabase
          .from('daily_swipes')
          .update({ swipe_count: existing.swipe_count + 1 })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        return existing.swipe_count + 1;
      } else {
        // Create new record for today
        const { error: insertError } = await supabase
          .from('daily_swipes')
          .insert({
            user_id: userProfile.id,
            swipe_date: today,
            swipe_count: 1,
          });

        if (insertError) throw insertError;
        return 1;
      }
    },
    onSuccess: () => {
      // Invalidate matches to get updated remaining count
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
