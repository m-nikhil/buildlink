-- Add is_seed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_seed boolean DEFAULT false;

-- Update existing seed profiles (they have specific emails ending in @buildlink.test)
UPDATE public.profiles 
SET is_seed = true 
WHERE email LIKE '%@buildlink.test';