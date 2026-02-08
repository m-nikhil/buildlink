-- Create table for user weekly availability
CREATE TABLE public.user_weekly_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_user_day_slot UNIQUE (user_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.user_weekly_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all availability for matching"
ON public.user_weekly_availability
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own availability"
ON public.user_weekly_availability
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability"
ON public.user_weekly_availability
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability"
ON public.user_weekly_availability
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_weekly_availability_updated_at
BEFORE UPDATE ON public.user_weekly_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add scheduled_at column to weekly_intros for the meeting time
ALTER TABLE public.weekly_intros 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN match_revealed_at TIMESTAMP WITH TIME ZONE;