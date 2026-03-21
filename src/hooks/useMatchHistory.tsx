import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { GroupMatch } from '@/types/group';

export interface MatchWithDetails extends GroupMatch {
  partner_profile?: any;
  group_name?: string;
  my_feedback?: { rating: number; note: string | null } | null;
}

export function useMatchHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['match-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all matches involving the user
      const { data: matches, error } = await supabase
        .from('group_matches')
        .select('*')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!matches || matches.length === 0) return [];

      // Get partner user IDs
      const partnerIds = matches.map((m: any) =>
        m.user_a_id === user.id ? m.user_b_id : m.user_a_id
      );

      // Get group IDs
      const groupIds = [...new Set(matches.map((m: any) => m.group_id))];

      // Fetch profiles, groups, and feedback in parallel
      const [profilesRes, groupsRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', partnerIds),
        supabase.from('groups').select('id, name').in('id', groupIds),
        supabase.from('match_feedback').select('*').eq('user_id', user.id).in('match_id', matches.map((m: any) => m.id)),
      ]);

      const profiles = profilesRes.data ?? [];
      const groups = groupsRes.data ?? [];
      const feedbacks = feedbackRes.data ?? [];

      return matches.map((m: any): MatchWithDetails => {
        const partnerId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
        const feedback = feedbacks.find((f: any) => f.match_id === m.id);
        return {
          ...m,
          partner_profile: profiles.find((p: any) => p.user_id === partnerId),
          group_name: groups.find((g: any) => g.id === m.group_id)?.name,
          my_feedback: feedback ? { rating: feedback.rating, note: feedback.note } : null,
        };
      });
    },
    enabled: !!user,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, rating, note }: { matchId: string; rating: number; note?: string }) => {
      const { error } = await supabase.from('match_feedback').insert({
        match_id: matchId,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        rating,
        note: note?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-history'] });
      queryClient.invalidateQueries({ queryKey: ['group-detail'] });
      toast.success('Feedback submitted!');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.info('Already submitted feedback for this match');
      } else {
        toast.error(err.message);
      }
    },
  });
}
