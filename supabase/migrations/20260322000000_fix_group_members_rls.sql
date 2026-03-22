-- Fix infinite recursion in group_members SELECT policy.
-- The old policy queried group_members from within a group_members policy,
-- causing infinite recursion. We use a SECURITY DEFINER helper function
-- to break the cycle.

-- Helper function that bypasses RLS to check membership
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

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Members can view other members in their groups (uses SECURITY DEFINER to avoid recursion)
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

-- Also allow viewing members of public groups (for browse feature)
CREATE POLICY "Anyone can view public group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND visibility = 'public')
  );

-- Allow browsing public groups (add policy if not exists)
-- The existing "View public groups" policy covers SELECT for public groups.
-- Add a policy so authenticated users can view any public group for browsing.
