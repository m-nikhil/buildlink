import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useDismissProfile() {
  const queryClient = useQueryClient();
  const { data: userProfile } = useProfile();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!userProfile) throw new Error('User profile not found');

      // Check if there's a pending connection from them to us (they liked us)
      const { data: pendingConnection } = await supabase
        .from('connections')
        .select('id')
        .eq('requester_id', dismissedProfileId)
        .eq('recipient_id', userProfile.id)
        .eq('status', 'pending')
        .maybeSingle();

      // If they had liked us, delete that connection
      if (pendingConnection) {
        await supabase
          .from('connections')
          .delete()
          .eq('id', pendingConnection.id);
      }

      // Check if already dismissed
      const { data: existing, error: fetchError } = await supabase
        .from('dismissed_profiles')
        .select('id, dismiss_count')
        .eq('user_id', userProfile.id)
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
            user_id: userProfile.id,
            dismissed_profile_id: dismissedProfileId,
            dismiss_count: 1,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      // Invalidate matches and connections so they'll be refetched
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}
