import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { debug } from '@/lib/debug';

export function useDismissProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already dismissed
      const { data: existing } = await supabase
        .from('dismissed_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed_profile_id', dismissedProfileId)
        .maybeSingle();

      if (existing) {
        // Increment dismiss count
        const { error } = await supabase
          .from('dismissed_profiles')
          .update({
            dismiss_count: (existing.dismiss_count || 0) + 1,
            last_dismissed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) {
          debug.error('[useDismissProfile] Update error:', error);
          throw error;
        }
      } else {
        // Create new dismiss record
        const { error } = await supabase
          .from('dismissed_profiles')
          .insert({
            user_id: user.id,
            dismissed_profile_id: dismissedProfileId,
            dismiss_count: 1,
            last_dismissed_at: new Date().toISOString(),
          });
        
        if (error) {
          debug.error('[useDismissProfile] Insert error:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      // Invalidate matches so they'll be refetched
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
