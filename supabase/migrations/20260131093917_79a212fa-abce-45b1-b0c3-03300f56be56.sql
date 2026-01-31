-- Add initials column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initials text;

-- Update existing profiles to compute initials from full_name
UPDATE public.profiles 
SET initials = UPPER(
  COALESCE(
    SUBSTRING(full_name FROM '^[A-Za-z]') || 
    COALESCE(SUBSTRING(full_name FROM ' ([A-Za-z])'), ''),
    'U'
  )
)
WHERE full_name IS NOT NULL AND initials IS NULL;