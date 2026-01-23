-- FULL MIGRATION: Move profiles to Firestore, use auth.users directly

-- Step 1: Drop existing foreign key constraints
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_requester_id_fkey;
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_recipient_id_fkey;
ALTER TABLE public.daily_swipes DROP CONSTRAINT IF EXISTS daily_swipes_user_id_fkey;
ALTER TABLE public.dismissed_profiles DROP CONSTRAINT IF EXISTS dismissed_profiles_user_id_fkey;
ALTER TABLE public.dismissed_profiles DROP CONSTRAINT IF EXISTS dismissed_profiles_dismissed_profile_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_connection_id_fkey;

-- Step 2: Migrate data - update connections to use user_id instead of profile.id
UPDATE public.connections c
SET requester_id = p.user_id
FROM public.profiles p
WHERE c.requester_id = p.id;

UPDATE public.connections c
SET recipient_id = p.user_id
FROM public.profiles p
WHERE c.recipient_id = p.id;

-- Step 3: Migrate daily_swipes to use auth user_id
UPDATE public.daily_swipes ds
SET user_id = p.user_id
FROM public.profiles p
WHERE ds.user_id = p.id;

-- Step 4: Migrate dismissed_profiles to use auth user_id
UPDATE public.dismissed_profiles dp
SET user_id = p.user_id
FROM public.profiles p
WHERE dp.user_id = p.id;

UPDATE public.dismissed_profiles dp
SET dismissed_profile_id = p.user_id
FROM public.profiles p
WHERE dp.dismissed_profile_id = p.id;

-- Step 5: Migrate messages sender_id to use auth user_id
UPDATE public.messages m
SET sender_id = p.user_id
FROM public.profiles p
WHERE m.sender_id = p.id;

-- Step 6: Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can delete connections they're part of" ON public.connections;
DROP POLICY IF EXISTS "Users can update connections they're part of" ON public.connections;
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;

DROP POLICY IF EXISTS "Users can insert their own swipe counts" ON public.daily_swipes;
DROP POLICY IF EXISTS "Users can update their own swipe counts" ON public.daily_swipes;
DROP POLICY IF EXISTS "Users can view their own swipe counts" ON public.daily_swipes;

DROP POLICY IF EXISTS "Users can delete their own dismissed profiles" ON public.dismissed_profiles;
DROP POLICY IF EXISTS "Users can insert their own dismissed profiles" ON public.dismissed_profiles;
DROP POLICY IF EXISTS "Users can update their own dismissed profiles" ON public.dismissed_profiles;
DROP POLICY IF EXISTS "Users can view their own dismissed profiles" ON public.dismissed_profiles;

DROP POLICY IF EXISTS "Users can send messages to their connections" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their connections" ON public.messages;

-- Step 7: Create new simplified RLS policies using auth.uid() directly

-- Connections policies
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they received"
ON public.connections FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their connections"
ON public.connections FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Daily swipes policies
CREATE POLICY "Users can view their own swipes"
ON public.daily_swipes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own swipes"
ON public.daily_swipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own swipes"
ON public.daily_swipes FOR UPDATE
USING (auth.uid() = user_id);

-- Dismissed profiles policies
CREATE POLICY "Users can view their dismissed profiles"
ON public.dismissed_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert dismissed profiles"
ON public.dismissed_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their dismissed profiles"
ON public.dismissed_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their dismissed profiles"
ON public.dismissed_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view their connection messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = connection_id
    AND c.status = 'accepted'
    AND (c.requester_id = auth.uid() OR c.recipient_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to connections"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = connection_id
    AND c.status = 'accepted'
    AND (c.requester_id = auth.uid() OR c.recipient_id = auth.uid())
  )
);

-- Step 8: Drop handle_new_user trigger (profiles will be created in Firestore)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 9: Drop profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;