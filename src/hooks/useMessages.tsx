import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { debug } from '@/lib/debug';

export type Message = Tables<'messages'>;

const MAX_MESSAGES = 50;

export function useMessages(connectionId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connectionId || !user) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Initial fetch
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      if (error) {
        debug.error('Messages fetch error:', error);
        setError(error);
      } else {
        setMessages(data || []);
        setError(null);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          debug.log('[useMessages] Realtime update:', payload);
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, user]);

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ connectionId, content }: { connectionId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check message count
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId);
      
      if (countError) throw countError;
      
      if ((count || 0) >= MAX_MESSAGES) {
        throw new Error('Message limit reached');
      }
      
      // Verify user is part of an accepted connection
      const { data: connection, error: connError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('status', 'accepted')
        .maybeSingle();
      
      if (connError) throw connError;
      
      if (!connection || (connection.requester_id !== user.id && connection.recipient_id !== user.id)) {
        throw new Error('Connection not found or not accepted');
      }
      
      // Create message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          connection_id: connectionId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
