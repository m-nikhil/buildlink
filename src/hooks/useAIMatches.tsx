import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export interface AIMatch {
  profile_id: string;
  score: number;
  reason: string;
  profile: Profile;
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
      
      return data.matches as AIMatch[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
