import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDailySwipeRef,
  getDoc,
  setDoc,
} from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { FirestoreDailySwipe } from '@/integrations/firebase/types';

export function useTrackSwipe() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const swipeId = `${user.id}_${today}`;
      const swipeRef = getDailySwipeRef(swipeId);
      const swipeSnap = await getDoc(swipeRef);

      if (swipeSnap.exists()) {
        // Increment swipe count
        const existing = swipeSnap.data() as FirestoreDailySwipe;
        await setDoc(swipeRef, {
          ...existing,
          swipe_count: existing.swipe_count + 1,
          updated_at: new Date().toISOString(),
        });
        return existing.swipe_count + 1;
      } else {
        // Create new record for today
        const newSwipe: FirestoreDailySwipe = {
          id: swipeId,
          user_id: user.id,
          swipe_date: today,
          swipe_count: 1,
          last_cursor: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await setDoc(swipeRef, newSwipe);
        return 1;
      }
    },
    onSuccess: () => {
      // Invalidate matches to get updated remaining count
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
    },
  });
}
