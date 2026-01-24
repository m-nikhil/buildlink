import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDismissedProfileRef,
  getDoc,
  setDoc,
} from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { FirestoreDismissedProfile } from '@/integrations/firebase/types';

export function useDismissProfile() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');

      // Use composite ID for efficient lookup
      const dismissId = `${user.id}_${dismissedProfileId}`;
      const dismissRef = getDismissedProfileRef(dismissId);
      const dismissSnap = await getDoc(dismissRef);

      if (dismissSnap.exists()) {
        // Increment dismiss count
        const existing = dismissSnap.data() as FirestoreDismissedProfile;
        await setDoc(dismissRef, {
          ...existing,
          dismiss_count: existing.dismiss_count + 1,
          last_dismissed_at: new Date().toISOString(),
        });
      } else {
        // Create new dismiss record
        const newDismiss: FirestoreDismissedProfile = {
          id: dismissId,
          user_id: user.id,
          dismissed_profile_id: dismissedProfileId,
          dismiss_count: 1,
          last_dismissed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        await setDoc(dismissRef, newDismiss);
      }
    },
    onSuccess: () => {
      // Invalidate matches so they'll be refetched
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
