import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { debug } from '@/lib/debug';

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

// Map technical errors to user-friendly messages
function getUserFriendlyError(error: Error | null, data: any): string {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('non-2xx') || message.includes('500') || message.includes('internal')) {
    return 'Our matching service is temporarily unavailable. Please try again in a moment.';
  }
  
  if (message.includes('unauthorized') || message.includes('401') || message.includes('auth')) {
    return 'Please sign in again to see your matches.';
  }
  
  if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
    return 'Connection issue. Please check your internet and try again.';
  }
  
  if (data?.error) {
    // Server returned a specific error message
    if (data.error.includes('profile')) {
      return 'Complete your profile to get personalized matches.';
    }
    return data.error;
  }
  
  return 'Unable to load matches right now. Please try again.';
}

export function useAIMatches() {
  return useQuery({
    queryKey: ['ai-matches'],
    queryFn: async (): Promise<AIMatchResponse> => {
      const { data, error } = await supabase.functions.invoke('ai-match');
      
      if (error) {
        debug.error('[useAIMatches] Edge function error:', error);
        throw new Error(getUserFriendlyError(error, data));
      }
      
      if (data?.error) {
        debug.error('[useAIMatches] API error:', data.error);
        throw new Error(getUserFriendlyError(null, data));
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
