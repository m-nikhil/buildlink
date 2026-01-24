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
        const requesterQuery = query(connectionsCollection, where('requester_id', '==', user.id));
        const recipientQuery = query(connectionsCollection, where('recipient_id', '==', user.id));

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
        setError(err instanceof Error ? err : new Error('Failed to fetch connections'));
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
      
      const requesterQuery = query(connectionsCollection, where('requester_id', '==', user.id));
      const recipientQuery = query(connectionsCollection, where('recipient_id', '==', user.id));

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
      if (!user || !firebaseUser) throw new Error('Not authenticated');
      
      // Check if there's an existing connection request from them to us
      const existingQuery = query(
        connectionsCollection, 
        where('requester_id', '==', recipientId),
        where('recipient_id', '==', user.id)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      // If they already liked us, update to accepted (mutual match!)
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingConnection = { ...existingDoc.data(), id: existingDoc.id } as FirestoreConnection;
        
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
        requester_id: user.id,
        recipient_id: recipientId,
        status: 'pending',
        message: message || null,
        requester_linkedin_requested: false,
        recipient_linkedin_requested: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await setDoc(getConnectionRef(connectionId), newConnection);
      return newConnection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      if ((data as FirestoreConnection & { isMutualMatch?: boolean }).isMutualMatch) {
        toast.success("It's a match! You're now connected 🎉");
      } else {
        toast.success('Connection request sent!');
      }
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Connection request already sent');
      } else {
        toast.error('Failed to send connection request');
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
        const dismissId = `${connection.requester_id}_${user.id}`;
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
            dismissed_profile_id: user.id,
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
      const isRequester = connection.requester_id === user.id;
      
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
  const { user } = useAuth();

  if (!connections || !user || !recipientId) return null;

  return connections.find(
    c => (c.requester_id === user.id && c.recipient_id === recipientId) ||
         (c.recipient_id === user.id && c.requester_id === recipientId)
  );
}
