-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group timeslots (max 10 per group, enforced in app)
CREATE TABLE IF NOT EXISTS public.group_timeslots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Timeslot subscriptions (users subscribe to timeslots for matching)
CREATE TABLE IF NOT EXISTS public.timeslot_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timeslot_id uuid NOT NULL REFERENCES public.group_timeslots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timeslot_id, user_id)
);

-- RLS policies
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_timeslots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeslot_subscriptions ENABLE ROW LEVEL SECURITY;

-- Groups: anyone authenticated can view public groups; members can view private groups
CREATE POLICY "View public groups" ON public.groups
  FOR SELECT USING (visibility = 'public' OR auth.uid() = owner_id);

CREATE POLICY "Members can view their private groups" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
  );

CREATE POLICY "Owners can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups" ON public.groups
  FOR DELETE USING (auth.uid() = owner_id);

-- Group members: members can view other members in their groups
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

-- Group timeslots: members can view; owners can manage
CREATE POLICY "Members can view timeslots" ON public.group_timeslots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_timeslots.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Owners can manage timeslots" ON public.group_timeslots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_timeslots.group_id AND owner_id = auth.uid())
  );

-- Timeslot subscriptions: members can view; users manage their own
CREATE POLICY "Members can view subscriptions" ON public.timeslot_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_timeslots gt
      JOIN public.group_members gm ON gm.group_id = gt.group_id
      WHERE gt.id = timeslot_subscriptions.timeslot_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can subscribe" ON public.timeslot_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe" ON public.timeslot_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_timeslots_group_id ON public.group_timeslots(group_id);
CREATE INDEX idx_timeslot_subscriptions_timeslot_id ON public.timeslot_subscriptions(timeslot_id);
CREATE INDEX idx_timeslot_subscriptions_user_id ON public.timeslot_subscriptions(user_id);
