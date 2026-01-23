import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useDismissProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already dismissed
      const { data: existing, error: fetchError } = await supabase
        .from('dismissed_profiles')
        .select('id, dismiss_count')
        .eq('user_id', user.id)
        .eq('dismissed_profile_id', dismissedProfileId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Increment dismiss count
        const { error: updateError } = await supabase
          .from('dismissed_profiles')
          .update({
            dismiss_count: existing.dismiss_count + 1,
            last_dismissed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new dismiss record
        const { error: insertError } = await supabase
          .from('dismissed_profiles')
          .insert({
            user_id: user.id,
            dismissed_profile_id: dismissedProfileId,
            dismiss_count: 1,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      // Invalidate matches so they'll be refetched
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
