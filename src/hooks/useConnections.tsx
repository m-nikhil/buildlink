import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { Connection } from '@/types/profile';
import { toast } from 'sonner';

export function useConnections() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
      
      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!profile,
  });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message?: string }) => {
      if (!profile) throw new Error('Profile not found');
      
      // Check if there's an existing connection request from them to us
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('*')
        .eq('requester_id', recipientId)
        .eq('recipient_id', profile.id)
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
          requester_id: profile.id,
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

export function useConnectionStatus(recipientId: string | undefined) {
  const { data: connections } = useConnections();
  const { data: profile } = useProfile();

  if (!connections || !profile || !recipientId) return null;

  return connections.find(
    c => (c.requester_id === profile.id && c.recipient_id === recipientId) ||
         (c.recipient_id === profile.id && c.requester_id === recipientId)
  );
}
