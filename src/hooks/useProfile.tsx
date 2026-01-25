import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { debug } from '@/lib/debug';

export type Profile = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// Get current user's profile from Supabase
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) {
        debug.log('[useProfile] No user, returning null');
        return null;
      }
      
      debug.log('[useProfile] Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        debug.error('[useProfile] Error fetching profile:', error);
        throw error;
      }
      
      debug.log('[useProfile] Found profile:', data);
      return data;
    },
    enabled: !!user,
  });
}

// Update current user's profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const now = new Date().toISOString();
      
      if (existing) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: now,
            last_active: now,
          })
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            ...updates,
            user_id: user.id,
            email: user.email,
            created_at: now,
            updated_at: now,
            last_active: now,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      debug.error('[useUpdateProfile] Error:', error);
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

// Create profile for new user
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profileData: ProfileInsert) => {
      if (!user) throw new Error('Not authenticated');
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...profileData,
          user_id: user.id,
          email: user.email,
          created_at: now,
          updated_at: now,
          last_active: now,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      debug.error('[useCreateProfile] Error:', error);
      toast.error('Failed to create profile: ' + error.message);
    },
  });
}

// Fetch all profiles with optional filters
export function useProfiles(filters?: {
  experienceLevel?: string;
  industry?: string;
  lookingFor?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profiles', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('last_active', { ascending: false });
      
      if (filters?.experienceLevel) {
        query = query.eq('experience_level', filters.experienceLevel);
      }
      
      if (filters?.industry) {
        query = query.eq('industry', filters.industry);
      }
      
      if (filters?.lookingFor) {
        query = query.contains('looking_for', [filters.lookingFor]);
      }
      
      // Exclude current user
      if (user?.id) {
        query = query.neq('user_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });
}
