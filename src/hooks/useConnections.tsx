import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  db,
  connectionsCollection,
  getConnectionRef,
  getDismissedProfileRef,
  getDocs, 
  getDoc,
  setDoc,
  deleteDoc,
  query, 
  where,
  onSnapshot,
} from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { FirestoreConnection, FirestoreDismissedProfile } from '@/integrations/firebase/types';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

// Generate unique connection ID
const generateConnectionId = () => crypto.randomUUID();

export function useConnections() {
  const { user, firebaseUser } = useAuth();
  const [connections, setConnections] = useState<FirestoreConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !firebaseUser) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to connections where user is requester or recipient
    // Firestore doesn't support OR queries across fields, so we need two queries
    const fetchConnections = async () => {
      try {
        const currentUserId = firebaseUser.uid;
        const requesterQuery = query(connectionsCollection, where('requester_id', '==', currentUserId));
        const recipientQuery = query(connectionsCollection, where('recipient_id', '==', currentUserId));

        const [requesterSnapshot, recipientSnapshot] = await Promise.all([
          getDocs(requesterQuery),
          getDocs(recipientQuery),
        ]);

        const allConnections: FirestoreConnection[] = [];
        const seenIds = new Set<string>();

        requesterSnapshot.docs.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            allConnections.push({ ...doc.data(), id: doc.id } as FirestoreConnection);
          }
        });

        recipientSnapshot.docs.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            allConnections.push({ ...doc.data(), id: doc.id } as FirestoreConnection);
          }
        });

        setConnections(allConnections);
        setError(null);
      } catch (err) {
        console.error('[useConnections] Error fetching:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        // Make error message user-friendly
        let userFriendlyMessage = 'Unable to load connections. Please try again.';
        if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
          userFriendlyMessage = 'Setting up your connections... Please refresh in a moment.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
          userFriendlyMessage = 'Please sign in again to view your connections.';
        } else if (errorMessage.includes('network') || errorMessage.includes('offline')) {
          userFriendlyMessage = 'Check your internet connection and try again.';
        }
        
        setError(new Error(userFriendlyMessage));
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [user?.id, firebaseUser]);

  return { 
    data: connections, 
    isLoading, 
    error,
    refetch: async () => {
      if (!user || !firebaseUser) return;
      
      const currentUserId = firebaseUser.uid;
      const requesterQuery = query(connectionsCollection, where('requester_id', '==', currentUserId));
      const recipientQuery = query(connectionsCollection, where('recipient_id', '==', currentUserId));

      const [requesterSnapshot, recipientSnapshot] = await Promise.all([
        getDocs(requesterQuery),
        getDocs(recipientQuery),
      ]);

      const allConnections: FirestoreConnection[] = [];
      const seenIds = new Set<string>();

      requesterSnapshot.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          allConnections.push({ ...doc.data(), id: doc.id } as FirestoreConnection);
        }
      });

      recipientSnapshot.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          allConnections.push({ ...doc.data(), id: doc.id } as FirestoreConnection);
        }
      });

      setConnections(allConnections);
    }
  };
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message?: string }) => {
      console.log('[useSendConnectionRequest] Starting mutation...', { recipientId, message });
      
      if (!user || !firebaseUser) {
        console.error('[useSendConnectionRequest] Not authenticated:', { user: !!user, firebaseUser: !!firebaseUser });
        throw new Error('Not authenticated');
      }
      
      // Use Firebase UID for Firestore operations (must match auth.uid in rules)
      const currentUserId = firebaseUser.uid;
      console.log('[useSendConnectionRequest] Using Firebase UID:', currentUserId);
      
      // Check if there's an existing connection request from them to us
      console.log('[useSendConnectionRequest] Checking for existing request...');
      const existingQuery = query(
        connectionsCollection, 
        where('requester_id', '==', recipientId),
        where('recipient_id', '==', currentUserId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      console.log('[useSendConnectionRequest] Existing requests found:', existingSnapshot.size);
      
      // If they already liked us, update to accepted (mutual match!)
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingConnection = { ...existingDoc.data(), id: existingDoc.id } as FirestoreConnection;
        console.log('[useSendConnectionRequest] Mutual match! Accepting connection...');
        
        await setDoc(getConnectionRef(existingConnection.id), {
          ...existingConnection,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        });
        
        return { ...existingConnection, status: 'accepted' as const, isMutualMatch: true };
      }
      
      // Otherwise create a new pending request
      const connectionId = generateConnectionId();
      const newConnection: FirestoreConnection = {
        id: connectionId,
        requester_id: currentUserId,
        recipient_id: recipientId,
        status: 'pending',
        message: message || null,
        requester_linkedin_requested: false,
        recipient_linkedin_requested: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('[useSendConnectionRequest] Creating new connection:', newConnection);
      
      try {
        await setDoc(getConnectionRef(connectionId), newConnection);
        console.log('[useSendConnectionRequest] Connection created successfully!');
      } catch (err) {
        console.error('[useSendConnectionRequest] Firestore setDoc error:', err);
        throw err;
      }
      
      return newConnection;
    },
    onSuccess: (data) => {
      console.log('[useSendConnectionRequest] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      if ((data as FirestoreConnection & { isMutualMatch?: boolean }).isMutualMatch) {
        toast.success("It's a match! You're now connected 🎉");
      } else {
        toast.success('Connection request sent!');
      }
    },
    onError: (error) => {
      console.error('[useSendConnectionRequest] Error:', error);
      console.error('[useSendConnectionRequest] Error message:', error.message);
      console.error('[useSendConnectionRequest] Error stack:', error.stack);
      if (error.message.includes('duplicate')) {
        toast.error('Connection request already sent');
      } else {
        toast.error(`Failed to send connection request: ${error.message}`);
      }
    },
  });
}

export function useRespondToConnection() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');

      const connectionRef = getConnectionRef(connectionId);
      const connectionSnap = await getDoc(connectionRef);
      
      if (!connectionSnap.exists()) {
        throw new Error('Connection not found');
      }
      
      const connection = { ...connectionSnap.data(), id: connectionSnap.id } as FirestoreConnection;

      if (accept) {
        // Accept: update status to accepted
        await setDoc(connectionRef, {
          ...connection,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        });
        
        return { accepted: true, data: { ...connection, status: 'accepted' as const } };
      } else {
        // Decline: create/update dismiss record for the requester
        const currentUserId = firebaseUser.uid;
        const dismissId = `${connection.requester_id}_${currentUserId}`;
        const dismissRef = getDismissedProfileRef(dismissId);
        const dismissSnap = await getDoc(dismissRef);

        if (dismissSnap.exists()) {
          const existingDismiss = dismissSnap.data() as FirestoreDismissedProfile;
          await setDoc(dismissRef, {
            ...existingDismiss,
            dismiss_count: existingDismiss.dismiss_count + 1,
            last_dismissed_at: new Date().toISOString(),
          });
        } else {
          const newDismiss: FirestoreDismissedProfile = {
            id: dismissId,
            user_id: connection.requester_id,
            dismissed_profile_id: currentUserId,
            dismiss_count: 1,
            last_dismissed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          await setDoc(dismissRef, newDismiss);
        }

        // Delete the connection
        await deleteDoc(connectionRef);
        return { accepted: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
      toast.success(result.accepted ? 'Connection accepted!' : 'Request declined');
    },
    onError: () => {
      toast.error('Failed to respond to connection request');
    },
  });
}

export function useDisconnect() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!firebaseUser) throw new Error('Not authenticated');
      
      await deleteDoc(getConnectionRef(connectionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ai-matches'] });
      toast.success('Disconnected successfully');
    },
    onError: () => {
      toast.error('Failed to disconnect');
    },
  });
}

export function useRequestLinkedIn() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');

      const connectionRef = getConnectionRef(connectionId);
      const connectionSnap = await getDoc(connectionRef);

      if (!connectionSnap.exists()) throw new Error('Connection not found');

      const connection = { ...connectionSnap.data(), id: connectionSnap.id } as FirestoreConnection;
      const isRequester = connection.requester_id === firebaseUser.uid;
      
      await setDoc(connectionRef, {
        ...connection,
        [isRequester ? 'requester_linkedin_requested' : 'recipient_linkedin_requested']: true,
        updated_at: new Date().toISOString(),
      });

      return connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('LinkedIn connection requested!');
    },
    onError: () => {
      toast.error('Failed to request LinkedIn connection');
    },
  });
}

export function useConnectionStatus(recipientId: string | undefined) {
  const { data: connections } = useConnections();
  const { firebaseUser } = useAuth();

  if (!connections || !firebaseUser || !recipientId) return null;

  const currentUserId = firebaseUser.uid;
  return connections.find(
    c => (c.requester_id === currentUserId && c.recipient_id === recipientId) ||
         (c.recipient_id === currentUserId && c.requester_id === recipientId)
  );
}
