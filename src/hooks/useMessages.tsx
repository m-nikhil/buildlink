import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  db,
  messagesCollection,
  connectionsCollection,
  getMessageRef,
  getDocs, 
  setDoc,
  query, 
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { FirestoreMessage, FirestoreConnection } from '@/integrations/firebase/types';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const MAX_MESSAGES = 50;

export function useMessages(connectionId: string | undefined) {
  const { firebaseUser } = useAuth();
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connectionId || !firebaseUser) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Real-time subscription to messages
    const messagesQuery = query(
      messagesCollection,
      where('connection_id', '==', connectionId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as FirestoreMessage[];
        setMessages(msgs);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Messages subscription error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [connectionId, firebaseUser]);

  return { data: messages, isLoading, error };
}

export function useMessageCount(connectionId: string | undefined) {
  const { data: messages } = useMessages(connectionId);
  return messages?.length ?? 0;
}

export function useCanSendMessage(connectionId: string | undefined) {
  const count = useMessageCount(connectionId);
  return count < MAX_MESSAGES;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user, firebaseUser } = useAuth();

  return useMutation({
    mutationFn: async ({ connectionId, content }: { connectionId: string; content: string }) => {
      if (!user || !firebaseUser) throw new Error('Not authenticated');
      
      // Check message count
      const messagesQuery = query(
        messagesCollection,
        where('connection_id', '==', connectionId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (messagesSnapshot.size >= MAX_MESSAGES) {
        throw new Error('Message limit reached');
      }
      
      // Verify user is part of this connection
      const connectionQuery = query(
        connectionsCollection,
        where('status', '==', 'accepted')
      );
      const connectionsSnapshot = await getDocs(connectionQuery);
      
      const connection = connectionsSnapshot.docs.find(doc => {
        const data = doc.data() as FirestoreConnection;
        return doc.id === connectionId && 
          (data.requester_id === user.id || data.recipient_id === user.id);
      });
      
      if (!connection) {
        throw new Error('Connection not found or not accepted');
      }
      
      // Create message
      const messageId = crypto.randomUUID();
      const newMessage: FirestoreMessage = {
        id: messageId,
        connection_id: connectionId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
      };
      
      await setDoc(getMessageRef(messageId), newMessage);
      return newMessage;
    },
    onError: (error) => {
      if (error.message === 'Message limit reached') {
        toast.error('Message limit reached. View LinkedIn for future communication.');
      } else {
        toast.error('Failed to send message');
      }
    },
  });
}
