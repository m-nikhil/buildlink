-- Fix infinite recursion in RLS policies between groups and group_members.
--
-- The cycle was:
--   groups SELECT policy -> queries group_members -> group_members SELECT policy
--   -> queries groups -> groups SELECT policy -> queries group_members -> RECURSION
--
-- Fix: use SECURITY DEFINER helper functions for all cross-table references
-- in RLS policies, so the inner queries bypass RLS entirely.

-- Helper: check if a user is a member of a group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- Helper: check if a group is public (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_public_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND visibility = 'public'
  );
$$;

-- Helper: check if a user owns a group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
$$;

-- ============================================================
-- Fix group_members policies
-- ============================================================
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Anyone can view public group members" ON public.group_members
  FOR SELECT USING (
    public.is_public_group(group_id)
  );

-- Fix "Owners can remove members" to use helper
DROP POLICY IF EXISTS "Owners can remove members" ON public.group_members;
CREATE POLICY "Owners can remove members" ON public.group_members
  FOR DELETE USING (
    public.is_group_owner(group_id, auth.uid())
  );

-- ============================================================
-- Fix groups policies that reference group_members
-- ============================================================
DROP POLICY IF EXISTS "Members can view their private groups" ON public.groups;

CREATE POLICY "Members can view their private groups" ON public.groups
  FOR SELECT USING (
    public.is_group_member(id, auth.uid())
  );

-- ============================================================
-- Fix group_timeslots policies that reference group_members/groups
-- ============================================================
DROP POLICY IF EXISTS "Members can view timeslots" ON public.group_timeslots;
CREATE POLICY "Members can view timeslots" ON public.group_timeslots
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners can manage timeslots" ON public.group_timeslots;
CREATE POLICY "Owners can manage timeslots" ON public.group_timeslots
  FOR ALL USING (
    public.is_group_owner(group_id, auth.uid())
  );

-- ============================================================
-- Fix timeslot_subscriptions policies
-- ============================================================
DROP POLICY IF EXISTS "Members can view subscriptions" ON public.timeslot_subscriptions;
CREATE POLICY "Members can view subscriptions" ON public.timeslot_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_timeslots gt
      WHERE gt.id = timeslot_subscriptions.timeslot_id
        AND public.is_group_member(gt.group_id, auth.uid())
    )
  );

-- ============================================================
-- Fix timeslot_confirmations policies that join group_members
-- ============================================================
DROP POLICY IF EXISTS "Members can view group confirmations" ON public.timeslot_confirmations;
CREATE POLICY "Members can view group confirmations" ON public.timeslot_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_timeslots gt
      WHERE gt.id = timeslot_confirmations.timeslot_id
        AND public.is_group_member(gt.group_id, auth.uid())
    )
  );

-- ============================================================
-- Fix group_matches policies that join group_members
-- ============================================================
DROP POLICY IF EXISTS "Members can view group matches" ON public.group_matches;
CREATE POLICY "Members can view group matches" ON public.group_matches
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );
