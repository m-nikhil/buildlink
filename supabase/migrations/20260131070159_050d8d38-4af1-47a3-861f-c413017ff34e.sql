-- Remove the old industry check constraint to allow LinkedIn's 148 industries
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_industry_check;