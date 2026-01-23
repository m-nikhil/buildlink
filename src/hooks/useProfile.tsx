import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { 
  profilesCollection, 
  getProfileRef,
  getDocs,
  getDoc,
  setDoc,
  query, 
  where,
} from '@/integrations/firebase/client';
import { FirestoreProfile } from '@/integrations/firebase/types';
import { toast } from 'sonner';

// Get current user's profile from Firestore
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Query by user_id field
      const q = query(profilesCollection, where('user_id', '==', user.id));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { ...doc.data(), id: doc.id } as FirestoreProfile;
    },
    enabled: !!user,
  });
}

// Update current user's profile in Firestore
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<FirestoreProfile>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get existing profile or create new one
      const q = query(profilesCollection, where('user_id', '==', user.id));
      const snapshot = await getDocs(q);
      
      let profileId: string;
      
      if (snapshot.empty) {
        // Create new profile with user.id as document ID
        profileId = user.id;
        const docRef = getProfileRef(profileId);
        await setDoc(docRef, {
          ...updates,
          id: profileId,
          user_id: user.id,
          email: user.email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Update existing profile
        profileId = snapshot.docs[0].id;
        const docRef = getProfileRef(profileId);
        await setDoc(docRef, {
          ...snapshot.docs[0].data(),
          ...updates,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
      
      // Fetch updated profile
      const updatedDoc = await getDoc(getProfileRef(profileId));
      return { ...updatedDoc.data(), id: updatedDoc.id } as FirestoreProfile;
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

// Create profile for new user in Firestore
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profileData: Partial<FirestoreProfile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const profileId = user.id;
      const docRef = getProfileRef(profileId);
      
      const newProfile: FirestoreProfile = {
        id: profileId,
        user_id: user.id,
        full_name: profileData.full_name || user.user_metadata?.full_name || null,
        email: user.email || null,
        avatar_url: profileData.avatar_url || user.user_metadata?.avatar_url || null,
        headline: profileData.headline || null,
        bio: profileData.bio || null,
        linkedin_url: profileData.linkedin_url || null,
        experience_level: profileData.experience_level || null,
        industry: profileData.industry || null,
        looking_for: profileData.looking_for || [],
        skills: profileData.skills || [],
        location: profileData.location || null,
        age: profileData.age || null,
        preferred_experience_levels: profileData.preferred_experience_levels || [],
        preferred_industries: profileData.preferred_industries || [],
        preferred_goals: profileData.preferred_goals || [],
        age_min: profileData.age_min || 18,
        age_max: profileData.age_max || 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await setDoc(docRef, newProfile);
      return newProfile;
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
