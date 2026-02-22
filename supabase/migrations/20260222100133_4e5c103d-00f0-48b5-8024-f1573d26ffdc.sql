
-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
  ON public.profiles FOR SELECT TO authenticated 
  USING (true);

-- Fix 2: Create user_secrets table for LinkedIn tokens
CREATE TABLE IF NOT EXISTS public.user_secrets (
  user_id UUID PRIMARY KEY,
  linkedin_access_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

-- No client access - only service role can read/write
CREATE POLICY "No client access to secrets" ON public.user_secrets
  FOR ALL USING (false);

-- Migrate existing tokens from profiles to user_secrets
INSERT INTO public.user_secrets (user_id, linkedin_access_token)
SELECT user_id, linkedin_access_token 
FROM public.profiles 
WHERE linkedin_access_token IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET linkedin_access_token = EXCLUDED.linkedin_access_token;

-- Remove linkedin_access_token column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS linkedin_access_token;
