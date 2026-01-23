import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Message } from '@/types/message';
import { toast } from 'sonner';
import { useEffect } from 'react';

const MAX_MESSAGES = 50;

export function useMessages(connectionId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: async () => {
      if (!connectionId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!connectionId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`messages-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', connectionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, queryClient]);

  return query;
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
      if ((count ?? 0) >= MAX_MESSAGES) {
        throw new Error('Message limit reached');
      }
      
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
      return data as Message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.connectionId] });
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
