import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { useAuth } from './useAuth';

export interface AIMatch {
  profile_id: string;
  score: number;
  reason: string;
  profile: Profile;
  likes_you?: boolean;
}

export interface AIMatchResult {
  matches: AIMatch[];
  daily_limit_reached?: boolean;
  swipes_used: number;
  daily_limit: number;
}

export function useAIMatches() {
  return useQuery({
    queryKey: ['ai-matches'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-match');
      
      if (error) {
        throw new Error(error.message || 'Failed to get AI matches');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data as AIMatchResult;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useRecordSwipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Upsert daily swipe count
      const { data: existing } = await supabase
        .from('daily_swipes')
        .select('id, swipe_count')
        .eq('user_id', user.id)
        .eq('swipe_date', today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('daily_swipes')
          .update({ swipe_count: (existing.swipe_count ?? 0) + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_swipes')
          .insert({ user_id: user.id, swipe_date: today, swipe_count: 1 });
      }
    },
    onSuccess: () => {
      // Update cached match data swipe count
      queryClient.setQueryData(['ai-matches'], (old: AIMatchResult | undefined) => {
        if (!old) return old;
        return { ...old, swipes_used: old.swipes_used + 1 };
      });
    },
  });
}
