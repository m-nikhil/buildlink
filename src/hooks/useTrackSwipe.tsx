import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { debug } from '@/lib/debug';

export function useTrackSwipe() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if we have a record for today
      const { data: existing } = await supabase
        .from('daily_swipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('swipe_date', today)
        .maybeSingle();

      if (existing) {
        // Increment swipe count
        const newCount = (existing.swipe_count || 0) + 1;
        const { error } = await supabase
          .from('daily_swipes')
          .update({ swipe_count: newCount })
          .eq('id', existing.id);

        if (error) {
          debug.error('[useTrackSwipe] Update error:', error);
          throw error;
        }
        return newCount;
      } else {
        // Create new record for today
        const { error } = await supabase
          .from('daily_swipes')
          .insert({
            user_id: user.id,
            swipe_date: today,
            swipe_count: 1,
          });

        if (error) {
          debug.error('[useTrackSwipe] Insert error:', error);
          throw error;
        }
        return 1;
      }
    },
    onSuccess: () => {
      // Invalidate matches to get updated remaining count
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
