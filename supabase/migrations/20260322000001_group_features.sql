-- ============================================================
-- 1. Add approval_required to groups
-- ============================================================
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Group join requests (for public groups with approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view their requests" ON public.group_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Owners can see requests for their groups
CREATE POLICY "Owners can view group requests" ON public.group_join_requests
  FOR SELECT USING (
    public.is_group_owner(group_id, auth.uid())
  );

-- Authenticated users can create requests
CREATE POLICY "Users can request to join" ON public.group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owners can update request status (approve/reject)
CREATE POLICY "Owners can update requests" ON public.group_join_requests
  FOR UPDATE USING (
    public.is_group_owner(group_id, auth.uid())
  );

-- Users can delete their own pending requests
CREATE POLICY "Users can cancel their requests" ON public.group_join_requests
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

CREATE INDEX idx_group_join_requests_group ON public.group_join_requests(group_id, status);
CREATE INDEX idx_group_join_requests_user ON public.group_join_requests(user_id);

-- ============================================================
-- 3. User availability (for browse filtering)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time)
);

ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can view availability (needed for browse filtering)
CREATE POLICY "Anyone can view availability" ON public.user_availability
  FOR SELECT USING (true);

-- Users manage their own availability
CREATE POLICY "Users can insert availability" ON public.user_availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update availability" ON public.user_availability
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete availability" ON public.user_availability
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_availability_user ON public.user_availability(user_id);
CREATE INDEX idx_user_availability_day ON public.user_availability(day_of_week, start_time);

-- ============================================================
-- 4. Allow authenticated users to insert notifications
--    (needed for owner notifications when all pairs complete)
-- ============================================================
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. Add notification type for all_pairs_done
-- ============================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('confirm_reminder', 'match_created', 'match_feedback', 'all_pairs_done', 'join_request'));

-- ============================================================
-- 6. Weekly scheduler: invoke group-match edge function daily
--    The edge function checks which timeslots happen tomorrow
--    and creates matches for confirmed users.
--    Runs every day at 20:00 UTC (evening before match day).
-- ============================================================
SELECT cron.schedule(
  'daily-group-matching',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/group-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
