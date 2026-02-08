-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';