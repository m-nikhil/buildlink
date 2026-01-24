-- Drop all Supabase tables that have been migrated to Firebase Firestore
-- The data will now be stored in Firestore collections:
-- connections -> Firestore 'connections' collection
-- messages -> Firestore 'messages' collection  
-- daily_swipes -> Firestore 'daily_swipes' collection
-- dismissed_profiles -> Firestore 'dismissed_profiles' collection

-- Drop messages first (references connections)
DROP TABLE IF EXISTS public.messages CASCADE;

-- Drop remaining tables
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.daily_swipes CASCADE;
DROP TABLE IF EXISTS public.dismissed_profiles CASCADE;