import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { 
  profilesCollection, 
  getDocs,
  query, 
  where,
} from '@/integrations/firebase/client';
import { FirestoreProfile } from '@/integrations/firebase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Get current user's profile from Firestore (read-only via client)
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('[useProfile] No user, returning null');
        return null;
      }
      
      console.log('[useProfile] Fetching profile for user:', user.id);
      
      // Query by user_id field
      const q = query(profilesCollection, where('user_id', '==', user.id));
      const snapshot = await getDocs(q);
      
      console.log('[useProfile] Snapshot empty:', snapshot.empty, 'docs:', snapshot.docs.length);
      
      if (snapshot.empty) {
        console.log('[useProfile] No profile found');
        return null;
      }
      
      const doc = snapshot.docs[0];
      const profile = { ...doc.data(), id: doc.id } as FirestoreProfile;
      console.log('[useProfile] Found profile:', profile);
      return profile;
    },
    enabled: !!user,
  });
}

// Update current user's profile via Edge Function (bypasses Firestore security rules)
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<FirestoreProfile>) => {
      if (!user || !session) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('sync-profile-firestore', {
        body: {
          action: 'update-profile',
          profileData: updates,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.profile as FirestoreProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['firestore-profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

// Create profile for new user via Edge Function
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();

  return useMutation({
    mutationFn: async (profileData: Partial<FirestoreProfile>) => {
      if (!user || !session) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('sync-profile-firestore', {
        body: {
          action: 'update-profile',
          profileData,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.profile as FirestoreProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast.error('Failed to create profile: ' + error.message);
    },
  });
}


// Fetch all profiles from Firestore with optional filters
export function useProfiles(filters?: {
  experienceLevel?: string;
  industry?: string;
  lookingFor?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['firestore-profiles', filters],
    queryFn: async () => {
      // Build query with filters
      let q = query(profilesCollection);
      
      if (filters?.experienceLevel) {
        q = query(q, where('experience_level', '==', filters.experienceLevel));
      }
      
      if (filters?.industry) {
        q = query(q, where('industry', '==', filters.industry));
      }
      
      if (filters?.lookingFor) {
        q = query(q, where('looking_for', 'array-contains', filters.lookingFor));
      }
      
      const snapshot = await getDocs(q);
      
      let profiles = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as FirestoreProfile[];
      
      // Exclude current user
      if (user?.id) {
        profiles = profiles.filter(p => p.user_id !== user.id);
      }
      
      return profiles;
    },
    enabled: !!user,
  });
}
