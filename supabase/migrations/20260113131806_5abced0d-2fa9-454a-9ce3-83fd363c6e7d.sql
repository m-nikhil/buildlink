-- Add match preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_experience_levels experience_level[] DEFAULT ARRAY[]::experience_level[],
ADD COLUMN IF NOT EXISTS preferred_industries industry[] DEFAULT ARRAY[]::industry[],
ADD COLUMN IF NOT EXISTS preferred_goals connection_goal[] DEFAULT ARRAY[]::connection_goal[],
ADD COLUMN IF NOT EXISTS age_min integer DEFAULT 18,
ADD COLUMN IF NOT EXISTS age_max integer DEFAULT 99,
ADD COLUMN IF NOT EXISTS age integer;