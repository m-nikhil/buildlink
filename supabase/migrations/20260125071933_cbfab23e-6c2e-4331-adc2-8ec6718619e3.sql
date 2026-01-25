-- Drop problematic foreign key constraints that reference auth.users for profile IDs
-- These should NOT exist because recipient_id and dismissed_profile_id reference profiles, not auth.users

-- Connections table: requester_id should reference auth.users (the logged-in user)
-- but recipient_id should NOT have a FK since it references a profile's user_id

ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_recipient_id_fkey;

-- Dismissed profiles: user_id should reference auth.users (the logged-in user)
-- but dismissed_profile_id should NOT have a FK since it references a profile's user_id

ALTER TABLE public.dismissed_profiles DROP CONSTRAINT IF EXISTS dismissed_profiles_dismissed_profile_id_fkey;