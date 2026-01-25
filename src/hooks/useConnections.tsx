import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Connection } from '@/types/profile';
import { toast } from 'sonner';

export function useConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
      
      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!user,
  });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if there's an existing connection request from them to us
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('*')
        .eq('requester_id', recipientId)
        .eq('recipient_id', user.id)
        .single();
      
      // If they already liked us, update to accepted (mutual match!)
      if (existingConnection) {
        const { data, error } = await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('id', existingConnection.id)
          .select()
          .single();
        
        if (error) throw error;
        return { ...data, isMutualMatch: true } as Connection & { isMutualMatch?: boolean };
      }
      
      // Otherwise create a new pending request
      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          recipient_id: recipientId,
          message,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Connection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      if ((data as Connection & { isMutualMatch?: boolean }).isMutualMatch) {
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

  return useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: 'accepted' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Connection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success(`Connection ${data.status === 'accepted' ? 'accepted' : 'declined'}`);
    },
    onError: () => {
      toast.error('Failed to respond to connection request');
    },
  });
}

export function useDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);
      
      if (error) throw error;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch connection to determine if user is requester or recipient
      const { data: connection, error: fetchError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError || !connection) throw new Error('Connection not found');

      const isRequester = connection.requester_id === user.id;
      const updateField = isRequester ? 'requester_linkedin_requested' : 'recipient_linkedin_requested';

      const { data, error } = await supabase
        .from('connections')
        .update({ [updateField]: true })
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
