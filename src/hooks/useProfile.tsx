import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, ExperienceLevel, ConnectionGoal } from '@/types/profile';
import { toast } from 'sonner';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

export function useProfiles(filters?: {
  experienceLevel?: ExperienceLevel;
  industry?: string;
  lookingFor?: ConnectionGoal;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profiles', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id ?? '');

      if (filters?.experienceLevel) {
        query = query.eq('experience_level', filters.experienceLevel);
      }

      if (filters?.industry) {
        query = query.eq('industry', filters.industry);
      }

      if (filters?.lookingFor) {
        query = query.contains('looking_for', [filters.lookingFor]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });
}
