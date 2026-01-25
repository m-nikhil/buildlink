import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { debug } from '@/lib/debug';

export type Connection = Tables<'connections'>;
export type ConnectionInsert = TablesInsert<'connections'>;

export function useConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        debug.error('[useConnections] Error fetching:', error);
        throw error;
      }

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
      
      debug.log('[useSendConnectionRequest] Starting mutation...', { recipientId, message });
      
      // Check for existing request from the other person (mutual match case)
      const { data: existingRequest } = await supabase
        .from('connections')
        .select('*')
        .eq('requester_id', recipientId)
        .eq('recipient_id', user.id)
        .maybeSingle();
      
      if (existingRequest) {
        // Mutual match! Accept the connection
        debug.log('[useSendConnectionRequest] Mutual match! Accepting connection...');
        
        const { data, error } = await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', existingRequest.id)
          .select()
          .single();
        
        if (error) throw error;
        return { ...data, isMutualMatch: true };
      }
      
      // Create new pending request
      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          recipient_id: recipientId,
          status: 'pending',
          message: message || null,
        })
        .select()
        .single();
      
      if (error) {
        debug.error('[useSendConnectionRequest] Insert error:', error);
        throw error;
      }
      
      debug.log('[useSendConnectionRequest] Connection created successfully!');
      return data;
    },
    onSuccess: (data) => {
      debug.log('[useSendConnectionRequest] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      if ((data as Connection & { isMutualMatch?: boolean }).isMutualMatch) {
        toast.success("It's a match! You're now connected 🎉");
      } else {
        toast.success('Connection request sent!');
      }
    },
    onError: (error) => {
      debug.error('[useSendConnectionRequest] Error:', error);
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('Connection request already sent');
      } else {
        toast.error(`Failed to send connection request: ${error.message}`);
      }
    },
  });
}

export function useRespondToConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (accept) {
        // Accept: update status
        const { data, error } = await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', connectionId)
          .select()
          .single();
        
        if (error) throw error;
        return { accepted: true, data };
      } else {
        // Decline: get the connection first to find requester
        const { data: connection } = await supabase
          .from('connections')
          .select('requester_id')
          .eq('id', connectionId)
          .single();
        
        if (connection) {
          // Track the dismissal
          const { data: existingDismiss } = await supabase
            .from('dismissed_profiles')
            .select('*')
            .eq('user_id', user.id)
            .eq('dismissed_profile_id', connection.requester_id)
            .maybeSingle();
          
          if (existingDismiss) {
            await supabase
              .from('dismissed_profiles')
              .update({
                dismiss_count: (existingDismiss.dismiss_count || 0) + 1,
                last_dismissed_at: new Date().toISOString(),
              })
              .eq('id', existingDismiss.id);
          } else {
            await supabase
              .from('dismissed_profiles')
              .insert({
                user_id: user.id,
                dismissed_profile_id: connection.requester_id,
                dismiss_count: 1,
                last_dismissed_at: new Date().toISOString(),
              });
          }
        }
        
        // Delete the connection
        const { error } = await supabase
          .from('connections')
          .delete()
          .eq('id', connectionId);
        
        if (error) throw error;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Not authenticated');
      
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

      // Get connection to determine if user is requester or recipient
      const { data: connection, error: fetchError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError) throw fetchError;
      if (!connection) throw new Error('Connection not found');

      const isRequester = connection.requester_id === user.id;
      
      const { data, error } = await supabase
        .from('connections')
        .update({
          [isRequester ? 'requester_linkedin_requested' : 'recipient_linkedin_requested']: true,
          updated_at: new Date().toISOString(),
        })
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
