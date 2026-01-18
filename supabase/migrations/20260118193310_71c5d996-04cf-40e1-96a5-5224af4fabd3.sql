-- Create table to track daily swipe usage
CREATE TABLE public.daily_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swipe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  swipe_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, swipe_date)
);

-- Enable RLS
ALTER TABLE public.daily_swipes ENABLE ROW LEVEL SECURITY;

-- Users can view their own swipe counts
CREATE POLICY "Users can view their own swipe counts"
ON public.daily_swipes
FOR SELECT
USING (auth.uid() IN (
  SELECT profiles.user_id FROM profiles WHERE profiles.id = daily_swipes.user_id
));

-- Users can insert their own swipe counts
CREATE POLICY "Users can insert their own swipe counts"
ON public.daily_swipes
FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT profiles.user_id FROM profiles WHERE profiles.id = daily_swipes.user_id
));

-- Users can update their own swipe counts
CREATE POLICY "Users can update their own swipe counts"
ON public.daily_swipes
FOR UPDATE
USING (auth.uid() IN (
  SELECT profiles.user_id FROM profiles WHERE profiles.id = daily_swipes.user_id
));

-- Add index for faster lookups
CREATE INDEX idx_daily_swipes_user_date ON public.daily_swipes(user_id, swipe_date);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_swipes_updated_at
BEFORE UPDATE ON public.daily_swipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();