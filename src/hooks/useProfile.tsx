import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { 
  profilesCollection, 
  getDocs,
  getDoc,
  setDoc,
  doc,
  db,
  query, 
  where,
} from '@/integrations/firebase/client';
import { FirestoreProfile } from '@/integrations/firebase/types';
import { toast } from 'sonner';

// Get current user's profile from Firestore
export function useProfile() {
  const { user, firebaseUser } = useAuth();

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
      
      const docSnap = snapshot.docs[0];
      const profile = { ...docSnap.data(), id: docSnap.id } as FirestoreProfile;
      console.log('[useProfile] Found profile:', profile);
      return profile;
    },
    enabled: !!user,
  });
}

// Update current user's profile directly in Firestore
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<FirestoreProfile>) => {
      if (!user) throw new Error('Not authenticated');
      if (!firebaseUser) throw new Error('Firebase not authenticated - please sign in again');
      
      // Get the existing profile to find the document ID
      const q = query(profilesCollection, where('user_id', '==', user.id));
      const snapshot = await getDocs(q);
      
      let docId: string;
      let existingData: Partial<FirestoreProfile> = {};
      
      if (snapshot.empty) {
        // Create new document with user_id as doc ID
        docId = user.id;
      } else {
        docId = snapshot.docs[0].id;
        existingData = snapshot.docs[0].data() as FirestoreProfile;
      }
      
      const profileRef = doc(db, 'profiles', docId);
      const now = new Date().toISOString();
      
      const profileData: Partial<FirestoreProfile> = {
        ...existingData,
        ...updates,
        id: docId,
        user_id: user.id,
        email: user.email || existingData.email,
        updated_at: now,
        last_active: now, // Update activity timestamp
        created_at: existingData.created_at || now,
      };
      
      await setDoc(profileRef, profileData, { merge: true });
      
      return profileData as FirestoreProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['firestore-profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      console.error('[useUpdateProfile] Error:', error);
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

// Create profile for new user directly in Firestore
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (profileData: Partial<FirestoreProfile>) => {
      if (!user) throw new Error('Not authenticated');
      if (!firebaseUser) throw new Error('Firebase not authenticated - please sign in again');
      
      const docId = user.id;
      const profileRef = doc(db, 'profiles', docId);
      const now = new Date().toISOString();
      
      const fullProfileData: Partial<FirestoreProfile> = {
        ...profileData,
        id: docId,
        user_id: user.id,
        email: user.email || profileData.email,
        created_at: now,
        updated_at: now,
        last_active: now, // New profiles start at top of feed
      };
      
      await setDoc(profileRef, fullProfileData, { merge: true });
      
      return fullProfileData as FirestoreProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('[useCreateProfile] Error:', error);
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
      
      let profiles = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
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
