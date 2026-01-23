import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  db, 
  profilesCollection, 
  getProfileRef,
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  type QueryConstraint
} from '@/integrations/firebase/client';
import { FirestoreProfile, ProfileFilters, PaginationCursor } from '@/integrations/firebase/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Timestamp, DocumentSnapshot, doc as firestoreDoc } from 'firebase/firestore';

const PAGE_SIZE = 50;

// Fetch profiles with filters and pagination
export function useFirestoreProfiles(
  filters?: ProfileFilters,
  cursor?: PaginationCursor,
  excludeIds?: string[]
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['firestore-profiles', filters, cursor?.lastDoc, excludeIds],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [];

      // Apply filters using composite indexes
      if (filters?.experience_level) {
        constraints.push(where('experience_level', '==', filters.experience_level));
      }
      
      if (filters?.industry) {
        constraints.push(where('industry', '==', filters.industry));
      }

      if (filters?.looking_for) {
        constraints.push(where('looking_for', 'array-contains', filters.looking_for));
      }

      // Order by created_at for consistent pagination
      constraints.push(orderBy('created_at', 'asc'));
      
      // Apply keyset pagination cursor
      if (cursor?.lastDoc) {
        const cursorTimestamp = Timestamp.fromDate(new Date(cursor.lastDoc));
        constraints.push(startAfter(cursorTimestamp));
      }

      // Limit results
      constraints.push(limit(PAGE_SIZE));

      const q = query(profilesCollection, ...constraints);
      const snapshot = await getDocs(q);

      let profiles = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as FirestoreProfile[];

      // Client-side filtering for excludeIds and current user
      if (excludeIds && excludeIds.length > 0) {
        profiles = profiles.filter(p => !excludeIds.includes(p.id));
      }
      
      if (user?.id) {
        profiles = profiles.filter(p => p.user_id !== user.id);
      }

      // Apply age filter client-side (Firestore doesn't support range queries with other filters well)
      if (filters?.age_min || filters?.age_max) {
        profiles = profiles.filter(p => {
          if (!p.age) return true;
          if (filters.age_min && p.age < filters.age_min) return false;
          if (filters.age_max && p.age > filters.age_max) return false;
          return true;
        });
      }

      // Get last document for next page cursor
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastVisible ? {
        lastDoc: lastVisible.data().created_at
      } : undefined;

      return {
        profiles,
        nextCursor,
        hasMore: snapshot.docs.length === PAGE_SIZE
      };
    },
    enabled: !!user,
  });
}

// Get single profile from Firestore
export function useFirestoreProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: ['firestore-profile', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      const docRef = getProfileRef(profileId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { ...docSnap.data(), id: docSnap.id } as FirestoreProfile;
    },
    enabled: !!profileId,
  });
}

// Sync profile to Firestore (upsert)
export function useSyncProfileToFirestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: FirestoreProfile) => {
      const docRef = getProfileRef(profile.id);
      await setDoc(docRef, {
        ...profile,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firestore-profiles'] });
    },
    onError: (error) => {
      console.error('Failed to sync profile to Firestore:', error);
      toast.error('Failed to sync profile');
    },
  });
}

// Batch sync profiles (for initial migration or bulk updates)
export function useBatchSyncProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profiles: FirestoreProfile[]) => {
      const promises = profiles.map(profile => {
        const docRef = getProfileRef(profile.id);
        return setDoc(docRef, {
          ...profile,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      });
      
      await Promise.all(promises);
      return profiles;
    },
    onSuccess: (profiles) => {
      queryClient.invalidateQueries({ queryKey: ['firestore-profiles'] });
      toast.success(`Synced ${profiles.length} profiles to Firestore`);
    },
    onError: (error) => {
      console.error('Failed to batch sync profiles:', error);
      toast.error('Failed to sync profiles');
    },
  });
}
