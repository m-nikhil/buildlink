import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Group, GroupMember, GroupTimeslot, TimeslotSubscription, TimeslotConfirmation, GroupMatch, GroupJoinRequest, UserAvailability } from '@/types/group';
import { MAX_GROUPS_PER_USER, MAX_TIMESLOTS_PER_GROUP, TIMESLOT_DURATION_MINUTES, getWeekOf } from '@/types/group';

// Fetch public groups for browsing
export function usePublicGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['public-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all public groups
      const { data: groups, error } = await supabase
        .from('groups')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user's memberships to mark which groups they're already in
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const memberGroupIds = new Set((memberships ?? []).map((m: any) => m.group_id));

      // Get member counts for each group
      const groupIds = (groups ?? []).map((g: any) => g.id);
      const { data: allMembers } = groupIds.length
        ? await supabase.from('group_members').select('group_id').in('group_id', groupIds)
        : { data: [] };

      const countByGroup: Record<string, number> = {};
      (allMembers ?? []).forEach((m: any) => {
        countByGroup[m.group_id] = (countByGroup[m.group_id] ?? 0) + 1;
      });

      // Fetch owner profiles
      const ownerIds = [...new Set((groups ?? []).map((g: any) => g.owner_id))];
      const { data: ownerProfiles } = ownerIds.length
        ? await supabase.from('profiles').select('user_id, full_name, linkedin_url, avatar_url').in('user_id', ownerIds)
        : { data: [] };

      const ownerMap: Record<string, any> = {};
      (ownerProfiles ?? []).forEach((p: any) => { ownerMap[p.user_id] = p; });

      // Fetch user's pending join requests
      const { data: myRequests } = await supabase
        .from('group_join_requests')
        .select('group_id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const pendingRequestGroupIds = new Set((myRequests ?? []).map((r: any) => r.group_id));

      // Fetch timeslots for all groups (for availability filtering)
      const { data: allTimeslots } = groupIds.length
        ? await supabase.from('group_timeslots').select('group_id, day_of_week, start_time, end_time').in('group_id', groupIds)
        : { data: [] };

      const timeslotsByGroup: Record<string, any[]> = {};
      (allTimeslots ?? []).forEach((t: any) => {
        if (!timeslotsByGroup[t.group_id]) timeslotsByGroup[t.group_id] = [];
        timeslotsByGroup[t.group_id].push(t);
      });

      return (groups ?? []).map((g: any) => ({
        ...g,
        isMember: memberGroupIds.has(g.id),
        memberCount: countByGroup[g.id] ?? 0,
        ownerProfile: ownerMap[g.owner_id] ?? null,
        hasPendingRequest: pendingRequestGroupIds.has(g.id),
        timeslots: timeslotsByGroup[g.id] ?? [],
      })) as (Group & { isMember: boolean; memberCount: number; ownerProfile: any; hasPendingRequest: boolean; timeslots: any[] })[];
    },
    enabled: !!user,
  });
}

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

      // Fetch pending join requests (for owner)
      const isOwner = groupRes.data?.owner_id === user?.id;
      let joinRequests: GroupJoinRequest[] = [];
      let requestProfiles: any[] = [];
      if (isOwner) {
        const { data: requests } = await supabase
          .from('group_join_requests')
          .select('*')
          .eq('group_id', groupId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        joinRequests = (requests ?? []) as GroupJoinRequest[];

        if (joinRequests.length > 0) {
          const reqUserIds = joinRequests.map((r) => r.user_id);
          const { data: reqProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', reqUserIds);
          requestProfiles = reqProfiles ?? [];
        }
      }

      return {
        group: groupRes.data as Group,
        members: (membersRes.data ?? []) as GroupMember[],
        profiles: profiles ?? [],
        timeslots: (timeslotsRes.data ?? []) as GroupTimeslot[],
        subscriptions: (subscriptions ?? []) as TimeslotSubscription[],
        confirmations: (confirmations ?? []) as TimeslotConfirmation[],
        matches: (matches ?? []) as GroupMatch[],
        joinRequests,
        requestProfiles,
        isOwner,
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
    mutationFn: async ({ name, description, visibility, approvalRequired, timezone }: { name: string; description?: string; visibility: 'public' | 'private'; approvalRequired?: boolean; timezone?: string }) => {
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
        .insert({ name, description: description || null, visibility, owner_id: user.id, approval_required: approvalRequired ?? false, timezone: timezone ?? 'UTC' })
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
    mutationFn: async ({ groupId, dayOfWeek, startTime, label }: {
      groupId: string;
      dayOfWeek: number;
      startTime: string;
      label?: string;
    }) => {
      // Auto-calculate end time as start + 30 minutes
      const [h, m] = startTime.split(':').map(Number);
      const endMinutes = h * 60 + m + TIMESLOT_DURATION_MINUTES;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

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
      // Update the match
      const { error } = await supabase
        .from('group_matches')
        .update({ status })
        .eq('id', matchId);

      if (error) throw error;

      // Check if all matches for this group this week are now done
      const thisWeek = getWeekOf(new Date());
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeek = getWeekOf(nextWeekDate);

      const { data: allMatches } = await supabase
        .from('group_matches')
        .select('id, status')
        .eq('group_id', groupId)
        .in('week_of', [thisWeek, nextWeek]);

      const allDone = allMatches && allMatches.length > 0 && allMatches.every((m: any) => m.status !== 'scheduled');

      // If all done, notify the owner
      if (allDone) {
        const { data: group } = await supabase.from('groups').select('owner_id, name').eq('id', groupId).single();
        if (group) {
          const completed = allMatches.filter((m: any) => m.status === 'completed').length;
          const skipped = allMatches.filter((m: any) => m.status === 'skipped').length;
          await supabase.from('notifications').insert({
            user_id: group.owner_id,
            type: 'match_feedback',
            title: `All matches done in ${group.name}`,
            body: `${completed} completed, ${skipped} skipped out of ${allMatches.length} total matches this week.`,
            link: `/groups/${groupId}`,
          });
        }
      }

      return { groupId, allDone };
    },
    onSuccess: ({ groupId, allDone }) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Match updated');
      if (allDone) {
        toast.info('All matches for this week are complete!');
      }
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

// Update group (owner only)
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, description }: { groupId: string; description: string }) => {
      const { error } = await supabase
        .from('groups')
        .update({ description: description || null, updated_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success('Group updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Request to join a public group
export function useRequestJoinGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('group_join_requests').insert({
        group_id: groupId,
        user_id: user.id,
      });

      if (error) {
        if (error.message?.includes('duplicate')) throw new Error('Request already sent');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-groups'] });
      toast.success('Join request sent! The owner will review it.');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Approve a join request (owner action)
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, groupId, userId }: { requestId: string; groupId: string; userId: string }) => {
      // Update request status
      const { error: updateErr } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateErr) throw updateErr;

      // Add user as member
      const { error: insertErr } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      });

      if (insertErr) throw insertErr;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Member approved!');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Reject a join request (owner action)
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, groupId }: { requestId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Request rejected');
    },
  });
}

// Fetch user availability
export function useUserAvailability() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-availability', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return (data ?? []) as UserAvailability[];
    },
    enabled: !!user,
  });
}

// Add availability slot
export function useAddAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dayOfWeek, startTime }: { dayOfWeek: number; startTime: string }) => {
      if (!user) throw new Error('Not authenticated');

      const [h, m] = startTime.split(':').map(Number);
      const endMinutes = h * 60 + m + TIMESLOT_DURATION_MINUTES;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      const { error } = await supabase.from('user_availability').insert({
        user_id: user.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      });

      if (error) {
        if (error.message?.includes('duplicate')) throw new Error('Already added');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-availability'] });
      toast.success('Availability added');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Remove availability slot
export function useRemoveAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_availability').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-availability'] });
    },
  });
}
