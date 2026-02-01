-- Create weekly_intros table for storing weekly matches
CREATE TABLE public.weekly_intros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  matched_user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  video_call_url TEXT,
  intro_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_intros ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly intros"
ON public.weekly_intros
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can update their own weekly intros"
ON public.weekly_intros
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- Only edge functions (service role) can insert matches
CREATE POLICY "Service role can insert weekly intros"
ON public.weekly_intros
FOR INSERT
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_intros_updated_at
BEFORE UPDATE ON public.weekly_intros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_weekly_intros_user_week ON public.weekly_intros(user_id, week_start);
CREATE INDEX idx_weekly_intros_matched_user ON public.weekly_intros(matched_user_id);