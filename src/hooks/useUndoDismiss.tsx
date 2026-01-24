import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDismissedProfileRef,
  getDoc,
  setDoc,
  deleteDoc,
} from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { FirestoreDismissedProfile } from '@/integrations/firebase/types';

export function useUndoDismiss() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (dismissedProfileId: string) => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');

      // Use composite ID for efficient lookup
      const dismissId = `${user.id}_${dismissedProfileId}`;
      const dismissRef = getDismissedProfileRef(dismissId);
      const dismissSnap = await getDoc(dismissRef);

      if (!dismissSnap.exists()) return; // Nothing to undo

      const existing = dismissSnap.data() as FirestoreDismissedProfile;

      if (existing.dismiss_count <= 1) {
        // Delete the record entirely
        await deleteDoc(dismissRef);
      } else {
        // Decrement dismiss count
        await setDoc(dismissRef, {
          ...existing,
          dismiss_count: existing.dismiss_count - 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
