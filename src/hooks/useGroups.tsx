import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Group, GroupMember, GroupTimeslot, TimeslotSubscription, TimeslotConfirmation, GroupMatch } from '@/types/group';
import { MAX_GROUPS_PER_USER, MAX_TIMESLOTS_PER_GROUP, getWeekOf } from '@/types/group';

// Fetch groups the current user is a member of
export function useMyGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const groupIds = memberships.map((m: any) => m.group_id);
      const { data: groups, error: grpErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (grpErr) throw grpErr;

      return (groups ?? []).map((g: any) => ({
        ...g,
        myRole: memberships.find((m: any) => m.group_id === g.id)?.role ?? 'member',
      })) as (Group & { myRole: 'owner' | 'member' })[];
    },
    enabled: !!user,
  });
}

// Fetch a single group with members, timeslots, and subscriptions
export function useGroupDetail(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const [groupRes, membersRes, timeslotsRes] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('group_members').select('*').eq('group_id', groupId),
        supabase.from('group_timeslots').select('*').eq('group_id', groupId).order('day_of_week').order('start_time'),
      ]);

      if (groupRes.error) throw groupRes.error;

      // Fetch profiles for all members
      const memberUserIds = (membersRes.data ?? []).map((m: any) => m.user_id);
      const { data: profiles } = memberUserIds.length
        ? await supabase.from('profiles').select('*').in('user_id', memberUserIds)
        : { data: [] };

      // Fetch subscriptions for all timeslots
      const timeslotIds = (timeslotsRes.data ?? []).map((t: any) => t.id);
      const { data: subscriptions } = timeslotIds.length
        ? await supabase.from('timeslot_subscriptions').select('*').in('timeslot_id', timeslotIds)
        : { data: [] };

      // Fetch confirmations for the current & next week
      const thisWeek = getWeekOf(new Date());
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeek = getWeekOf(nextWeekDate);

      const { data: confirmations } = timeslotIds.length
        ? await supabase
            .from('timeslot_confirmations')
            .select('*')
            .in('timeslot_id', timeslotIds)
            .in('week_of', [thisWeek, nextWeek])
        : { data: [] };

      // Fetch matches for the current & next week
      const { data: matches } = await supabase
        .from('group_matches')
        .select('*')
        .eq('group_id', groupId)
        .in('week_of', [thisWeek, nextWeek])
        .order('created_at', { ascending: false });

      return {
        group: groupRes.data as Group,
        members: (membersRes.data ?? []) as GroupMember[],
        profiles: profiles ?? [],
        timeslots: (timeslotsRes.data ?? []) as GroupTimeslot[],
        subscriptions: (subscriptions ?? []) as TimeslotSubscription[],
        confirmations: (confirmations ?? []) as TimeslotConfirmation[],
        matches: (matches ?? []) as GroupMatch[],
        isOwner: groupRes.data?.owner_id === user?.id,
        isMember: (membersRes.data ?? []).some((m: any) => m.user_id === user?.id),
      };
    },
    enabled: !!groupId && !!user,
  });
}

// Create a new group
export function useCreateGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, visibility }: { name: string; description?: string; visibility: 'public' | 'private' }) => {
      if (!user) throw new Error('Not authenticated');

      // Check group limit
      const { count } = await supabase
        .from('groups')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if ((count ?? 0) >= MAX_GROUPS_PER_USER) {
        throw new Error(`You can create up to ${MAX_GROUPS_PER_USER} groups`);
      }

      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name, description: description || null, visibility, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Add owner as a member
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'owner',
      });

      return group as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success('Group created!');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Join a group via invite code
export function useJoinGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data: group, error: findErr } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (findErr || !group) throw new Error('Invalid invite code');

      // Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('You are already a member of this group');

      const { error } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      });

      if (error) throw error;
      return group as Group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success(`Joined "${group.name}"!`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Leave a group
export function useLeaveGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success('Left the group');
    },
  });
}

// Delete a group (owner only)
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success('Group deleted');
    },
  });
}

// Add a timeslot to a group
export function useAddTimeslot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, dayOfWeek, startTime, endTime, label }: {
      groupId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      label?: string;
    }) => {
      // Check timeslot limit
      const { count } = await supabase
        .from('group_timeslots')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if ((count ?? 0) >= MAX_TIMESLOTS_PER_GROUP) {
        throw new Error(`Max ${MAX_TIMESLOTS_PER_GROUP} timeslots per group`);
      }

      const { data, error } = await supabase
        .from('group_timeslots')
        .insert({
          group_id: groupId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          label: label || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GroupTimeslot;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', vars.groupId] });
      toast.success('Timeslot added');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Remove a timeslot
export function useRemoveTimeslot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId }: { timeslotId: string; groupId: string }) => {
      const { error } = await supabase.from('group_timeslots').delete().eq('id', timeslotId);
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });
}

// Subscribe to a timeslot
export function useSubscribeTimeslot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId }: { timeslotId: string; groupId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('timeslot_subscriptions').insert({
        timeslot_id: timeslotId,
        user_id: user.id,
      });

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Subscribed to timeslot');
    },
  });
}

// Unsubscribe from a timeslot
export function useUnsubscribeTimeslot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId }: { timeslotId: string; groupId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('timeslot_subscriptions')
        .delete()
        .eq('timeslot_id', timeslotId)
        .eq('user_id', user.id);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });
}

// Confirm availability for a timeslot this week
export function useConfirmTimeslot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId, weekOf }: { timeslotId: string; groupId: string; weekOf: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('timeslot_confirmations').insert({
        timeslot_id: timeslotId,
        user_id: user.id,
        week_of: weekOf,
      });

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Confirmed for this week!');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.info('Already confirmed');
      } else {
        toast.error(err.message);
      }
    },
  });
}

// Withdraw confirmation
export function useUnconfirmTimeslot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId, weekOf }: { timeslotId: string; groupId: string; weekOf: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('timeslot_confirmations')
        .delete()
        .eq('timeslot_id', timeslotId)
        .eq('user_id', user.id)
        .eq('week_of', weekOf);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });
}

// Update match status (completed / skipped)
export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, status, groupId }: { matchId: string; status: 'completed' | 'skipped'; groupId: string }) => {
      const { error } = await supabase
        .from('group_matches')
        .update({ status })
        .eq('id', matchId);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Match updated');
    },
  });
}

// Trigger matching for a specific timeslot (owner action)
export function useTriggerMatching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeslotId, groupId }: { timeslotId: string; groupId: string }) => {
      const { data, error } = await supabase.functions.invoke('group-match', {
        body: { timeslot_id: timeslotId },
      });

      if (error) throw new Error(error.message || 'Failed to run matching');
      if (data?.error) throw new Error(data.error);
      return { ...data, groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', result.groupId] });
      toast.success(`Matching complete! ${result.matches_created} matches created.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
