import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Invite {
  id: string;
  inviter_id: string;
  referral_code: string;
  invitee_email: string | null;
  invitee_id: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

export function useMyReferralCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-referral-code', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // If no referral code exists, trigger an update to generate one
      if (!data?.referral_code) {
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select('referral_code')
          .single();
        
        if (updateError) throw updateError;
        return updated?.referral_code || null;
      }

      return data.referral_code;
    },
    enabled: !!user,
  });
}

export function useMyInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-invites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invite[];
    },
    enabled: !!user,
  });
}

export function useInviteStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invite-stats', user?.id],
    queryFn: async () => {
      if (!user) return { sent: 0, accepted: 0 };

      // Count profiles that were referred by this user
      const { count: acceptedCount, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user.id);

      if (error) {
        console.error('Error fetching invite stats:', error);
        return { sent: 0, accepted: 0 };
      }

      return {
        sent: 0, // We don't track sent emails, just accepted
        accepted: acceptedCount || 0,
      };
    },
    enabled: !!user,
  });
}

export function useCreateInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: { email?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Get user's referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.referral_code) {
        throw new Error('Could not get referral code');
      }

      const { data, error } = await supabase
        .from('invites')
        .insert({
          inviter_id: user.id,
          referral_code: profile.referral_code,
          invitee_email: email || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invites'] });
    },
  });
}
