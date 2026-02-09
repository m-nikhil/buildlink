import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile } from '@/types/profile';

interface ConnectionWithProfile {
  connectionId: string;
  profile: Profile;
  connectedAt: string;
}

export function useFirstConnection() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['first-connection', user?.id],
    queryFn: async (): Promise<ConnectionWithProfile | null> => {
      if (!user) return null;

      // Get first accepted connection (oldest by updated_at)
      const { data: connection, error: connError } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('updated_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (connError || !connection) return null;

      // Get the other user's profile
      const otherUserId = connection.requester_id === user.id 
        ? connection.recipient_id 
        : connection.requester_id;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', otherUserId)
        .maybeSingle();

      if (profileError || !profile) return null;

      return {
        connectionId: connection.id,
        profile: profile as Profile,
        connectedAt: connection.updated_at || connection.created_at || '',
      };
    },
    enabled: !!user,
  });
}
