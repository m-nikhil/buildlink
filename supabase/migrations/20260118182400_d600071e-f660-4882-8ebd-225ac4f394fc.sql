-- Add LinkedIn connection request fields to track mutual consent
ALTER TABLE public.connections
ADD COLUMN requester_linkedin_requested boolean DEFAULT false,
ADD COLUMN recipient_linkedin_requested boolean DEFAULT false;