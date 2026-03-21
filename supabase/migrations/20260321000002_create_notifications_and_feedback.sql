-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('confirm_reminder', 'match_created', 'match_feedback')),
  title text NOT NULL,
  body text NOT NULL,
  link text, -- e.g. /groups/<id>
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Post-match feedback
CREATE TABLE IF NOT EXISTS public.match_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.group_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

-- Notifications: users see only their own
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role inserts notifications (via edge functions)
-- No INSERT policy for regular users; edge functions use service role

-- Feedback: users manage their own
CREATE POLICY "Users view own feedback" ON public.match_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feedback" ON public.match_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Participants can see each other's feedback
CREATE POLICY "Match participants view feedback" ON public.match_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_matches gm
      WHERE gm.id = match_feedback.match_id
      AND (gm.user_a_id = auth.uid() OR gm.user_b_id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_match_feedback_match ON public.match_feedback(match_id);
