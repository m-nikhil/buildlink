import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUndoDismiss() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Find the dismissal record
      const { data: existing, error: fetchError } = await supabase
        .from('dismissed_profiles')
        .select('id, dismiss_count')
        .eq('user_id', user.id)
        .eq('dismissed_profile_id', dismissedProfileId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) return; // Nothing to undo

      if (existing.dismiss_count <= 1) {
        // Delete the record entirely
        const { error: deleteError } = await supabase
          .from('dismissed_profiles')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
      } else {
        // Decrement dismiss count
        const { error: updateError } = await supabase
          .from('dismissed_profiles')
          .update({
            dismiss_count: existing.dismiss_count - 1,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
