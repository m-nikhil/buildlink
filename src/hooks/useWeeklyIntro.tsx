import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile } from '@/types/profile';

export interface WeeklyIntro {
  id: string;
  user_id: string;
  matched_user_id: string;
  week_start: string;
  status: 'pending' | 'accepted' | 'completed' | 'skipped';
  video_call_url: string | null;
  video_call_password: string | null;
  intro_completed_at: string | null;
  scheduled_at: string | null;
  match_revealed_at: string | null;
  created_at: string;
  updated_at: string;
  matched_profile?: Profile;
}

// Get the start of the current week (Monday) in UTC to match server
function getWeekStart(): string {
  const now = new Date();
  // Create a UTC date to ensure consistency with server
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = utcNow.getUTCDay();
  const diff = utcNow.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

export function useCurrentWeeklyIntro() {
  const { user } = useAuth();
  const weekStart = getWeekStart();

  return useQuery({
    queryKey: ['weekly-intro', user?.id, weekStart],
    queryFn: async () => {
      if (!user) return null;

      // Get intro where user is either the user_id or matched_user_id
      const { data, error } = await supabase
        .from('weekly_intros')
        .select('*')
        .eq('week_start', weekStart)
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get the matched profile
      const matchedUserId = data.user_id === user.id ? data.matched_user_id : data.user_id;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, initials, avatar_url, headline, bio, experience_level, industry, industry_other, looking_for, looking_for_text, skills, location, timezone, preferred_experience_levels, preferred_industries, preferred_goals, created_at, updated_at')
        .eq('user_id', matchedUserId)
        .single();

      if (profileError) {
        console.error('Error fetching matched profile:', profileError);
      }

      return {
        ...data,
        matched_profile: profileData as Profile | undefined,
      } as WeeklyIntro;
    },
    enabled: !!user,
  });
}

export function useGenerateWeeklyIntro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('weekly-intro-match');
      
      if (error) throw new Error(error.message || 'Failed to generate intro');
      if (data?.error) throw new Error(data.error);
      
      // Handle no_match case - not an error, just no available matches
      if (data?.no_match) {
        return { no_match: true, message: data.message };
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (!data?.no_match) {
        queryClient.invalidateQueries({ queryKey: ['weekly-intro'] });
      }
    },
  });
}

export function useUpdateIntroStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ introId, status }: { introId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'completed') {
        updates.intro_completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('weekly_intros')
        .update(updates)
        .eq('id', introId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-intro'] });
    },
  });
}

export function useWeeklyIntroHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-intro-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('weekly_intros')
        .select('*')
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .order('week_start', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as WeeklyIntro[];
    },
    enabled: !!user,
  });
}
