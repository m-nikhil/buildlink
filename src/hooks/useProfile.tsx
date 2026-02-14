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

// Helper to compute initials from full name
function computeInitials(fullName: string | null | undefined): string {
  if (!fullName) return 'U';
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Compute initials if full_name is being updated
      const initials = updates.full_name !== undefined 
        ? computeInitials(updates.full_name) 
        : undefined;
      
      // Use upsert to create profile if it doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { 
            user_id: user.id, 
            email: user.email,
            ...updates,
            ...(initials !== undefined && { initials }),
          },
          { onConflict: 'user_id' }
        )
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
        .select('id, user_id, initials, avatar_url, headline, bio, experience_level, industry, industry_other, looking_for, looking_for_text, skills, location, timezone, preferred_experience_levels, preferred_industries, preferred_goals, created_at, updated_at')
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
