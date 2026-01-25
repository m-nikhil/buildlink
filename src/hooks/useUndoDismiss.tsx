import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { debug } from '@/lib/debug';

export function useUndoDismiss() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dismissed_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('dismissed_profile_id', dismissedProfileId);

      if (error) {
        debug.error('[useUndoDismiss] Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
