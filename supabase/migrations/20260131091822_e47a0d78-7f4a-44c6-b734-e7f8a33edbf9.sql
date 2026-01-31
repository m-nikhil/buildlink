-- Add preferred_locations column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_locations TEXT[] DEFAULT NULL;