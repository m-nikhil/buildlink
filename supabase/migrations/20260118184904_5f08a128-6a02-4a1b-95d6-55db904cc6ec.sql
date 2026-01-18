-- Create table to track dismissed profiles
CREATE TABLE public.dismissed_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dismissed_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismiss_count INTEGER NOT NULL DEFAULT 1,
  last_dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dismissed_profile_id)
);

-- Enable Row Level Security
ALTER TABLE public.dismissed_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own dismissed profiles
CREATE POLICY "Users can view their own dismissed profiles" 
ON public.dismissed_profiles 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = dismissed_profiles.user_id));

-- Users can insert their own dismissed profiles
CREATE POLICY "Users can insert their own dismissed profiles" 
ON public.dismissed_profiles 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = dismissed_profiles.user_id));

-- Users can update their own dismissed profiles
CREATE POLICY "Users can update their own dismissed profiles" 
ON public.dismissed_profiles 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = dismissed_profiles.user_id));

-- Create index for faster lookups
CREATE INDEX idx_dismissed_profiles_user_id ON public.dismissed_profiles(user_id);
CREATE INDEX idx_dismissed_profiles_last_dismissed ON public.dismissed_profiles(last_dismissed_at);