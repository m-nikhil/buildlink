import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export interface AIMatch {
  profile_id: string;
  score: number;
  reason: string;
  profile: Profile;
  liked_you?: boolean;
}

export interface AIMatchResponse {
  matches: AIMatch[];
  swipes_used: number;
  swipes_remaining: number;
  daily_limit: number;
  daily_limit_reached?: boolean;
}

export function useAIMatches() {
  return useQuery({
    queryKey: ['ai-matches'],
    queryFn: async (): Promise<AIMatchResponse> => {
      const { data, error } = await supabase.functions.invoke('ai-match');
      
      if (error) {
        throw new Error(error.message || 'Failed to get AI matches');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return {
        matches: data.matches as AIMatch[],
        swipes_used: data.swipes_used ?? 0,
        swipes_remaining: data.swipes_remaining ?? 5,
        daily_limit: data.daily_limit ?? 5,
        daily_limit_reached: data.daily_limit_reached ?? false,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
