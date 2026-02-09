-- Add LinkedIn access token column to profiles for posting
ALTER TABLE public.profiles 
ADD COLUMN linkedin_access_token text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.linkedin_access_token IS 'OAuth access token for posting to LinkedIn on behalf of user';