-- ============================================
-- Migration: 20260113121453_48654770-40d3-4725-ac52-ff9c42db24b0.sql
-- ============================================

-- Create enum for experience levels
CREATE TYPE public.experience_level AS ENUM ('entry', 'mid', 'senior', 'executive');

-- Create enum for goals
CREATE TYPE public.connection_goal AS ENUM ('mentorship', 'collaboration', 'networking', 'hiring', 'job_seeking');

-- Create enum for industries
CREATE TYPE public.industry AS ENUM ('tech', 'finance', 'healthcare', 'education', 'marketing', 'consulting', 'other');

-- Create profiles table with extended fields
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  linkedin_url TEXT,
  experience_level experience_level DEFAULT 'mid',
  industry industry DEFAULT 'tech',
  looking_for connection_goal[] DEFAULT ARRAY['networking']::connection_goal[],
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create connections table for connection requests
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(requester_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Profiles policies: anyone can view, users can update their own
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Connections policies
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
TO authenticated
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
TO authenticated
WITH CHECK (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update connections they're part of"
ON public.connections FOR UPDATE
TO authenticated
USING (
  recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Migration: 20260113131806_5abced0d-2fa9-454a-9ce3-83fd363c6e7d.sql
-- ============================================

-- Add match preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_experience_levels experience_level[] DEFAULT ARRAY[]::experience_level[],
ADD COLUMN IF NOT EXISTS preferred_industries industry[] DEFAULT ARRAY[]::industry[],
ADD COLUMN IF NOT EXISTS preferred_goals connection_goal[] DEFAULT ARRAY[]::connection_goal[],
ADD COLUMN IF NOT EXISTS age_min integer DEFAULT 18,
ADD COLUMN IF NOT EXISTS age_max integer DEFAULT 99,
ADD COLUMN IF NOT EXISTS age integer;

-- ============================================
-- Migration: 20260113133720_083c1d53-c726-40de-9a35-6c7f9b93f2ca.sql
-- ============================================

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_messages_connection_id ON public.messages(connection_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their connections
CREATE POLICY "Users can view messages from their connections"
ON public.messages
FOR SELECT
USING (
  connection_id IN (
    SELECT c.id FROM public.connections c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE (c.requester_id = p.id OR c.recipient_id = p.id)
    AND c.status = 'accepted'
  )
);

-- Users can send messages to their connections
CREATE POLICY "Users can send messages to their connections"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND connection_id IN (
    SELECT c.id FROM public.connections c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE (c.requester_id = p.id OR c.recipient_id = p.id)
    AND c.status = 'accepted'
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- Migration: 20260118181903_dfd7066d-80a9-4fb6-99b3-9cd13f03c7b5.sql
-- ============================================

-- Allow users to delete connections they're part of
CREATE POLICY "Users can delete connections they're part of"
ON public.connections
FOR DELETE
USING (
  requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================
-- Migration: 20260118182400_d600071e-f660-4882-8ebd-225ac4f394fc.sql
-- ============================================

-- Add LinkedIn connection request fields to track mutual consent
ALTER TABLE public.connections
ADD COLUMN requester_linkedin_requested boolean DEFAULT false,
ADD COLUMN recipient_linkedin_requested boolean DEFAULT false;

-- ============================================
-- Migration: 20260125075748_1f0a3e58-7506-4724-9b3f-8ca86d66ef10.sql
-- ============================================

-- Add is_seed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_seed boolean DEFAULT false;

-- Update existing seed profiles (they have specific emails ending in @buildlink.test)
UPDATE public.profiles 
SET is_seed = true 
WHERE email LIKE '%@buildlink.test';

-- ============================================
-- Migration: 20260125080634_b2680b37-0725-44cd-8c61-df09ece81dd9.sql
-- ============================================

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- Migration: 20260131070159_050d8d38-4af1-47a3-861f-c413017ff34e.sql
-- ============================================

-- Remove the old industry check constraint to allow LinkedIn's 148 industries
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_industry_check;

-- ============================================
-- Migration: 20260131074224_0d911fc4-f577-4619-8ea7-254bc99eac9b.sql
-- ============================================

-- Add a free text field for "what looking for" description
ALTER TABLE public.profiles
ADD COLUMN looking_for_text text;

-- ============================================
-- Migration: 20260131074722_5536e160-61fe-4a20-a998-8d0f429158f7.sql
-- ============================================

-- Add a free text field for custom industry input
ALTER TABLE public.profiles
ADD COLUMN industry_other text;

-- ============================================
-- Migration: 20260131091822_e47a0d78-7f4a-44c6-b734-e7f8a33edbf9.sql
-- ============================================

-- Add preferred_locations column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_locations TEXT[] DEFAULT NULL;

-- ============================================
-- Migration: 20260131093917_79a212fa-abce-45b1-b0c3-03300f56be56.sql
-- ============================================

-- Add initials column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initials text;

-- Update existing profiles to compute initials from full_name
UPDATE public.profiles 
SET initials = UPPER(
  COALESCE(
    SUBSTRING(full_name FROM '^[A-Za-z]') || 
    COALESCE(SUBSTRING(full_name FROM ' ([A-Za-z])'), ''),
    'U'
  )
)
WHERE full_name IS NOT NULL AND initials IS NULL;

-- ============================================
-- Migration: 20260201010054_115dfd95-cf54-4559-b164-2413e5cd8645.sql
-- ============================================

-- Create weekly_intros table for storing weekly matches
CREATE TABLE public.weekly_intros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  matched_user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  video_call_url TEXT,
  intro_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_intros ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly intros"
ON public.weekly_intros
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can update their own weekly intros"
ON public.weekly_intros
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- Only edge functions (service role) can insert matches
CREATE POLICY "Service role can insert weekly intros"
ON public.weekly_intros
FOR INSERT
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_intros_updated_at
BEFORE UPDATE ON public.weekly_intros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_weekly_intros_user_week ON public.weekly_intros(user_id, week_start);
CREATE INDEX idx_weekly_intros_matched_user ON public.weekly_intros(matched_user_id);

-- ============================================
-- Migration: 20260208221952_9bc6abc5-998f-4ef3-9e39-932d08651295.sql
-- ============================================

-- Create table for user weekly availability
CREATE TABLE public.user_weekly_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_user_day_slot UNIQUE (user_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.user_weekly_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all availability for matching"
ON public.user_weekly_availability
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own availability"
ON public.user_weekly_availability
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability"
ON public.user_weekly_availability
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability"
ON public.user_weekly_availability
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_weekly_availability_updated_at
BEFORE UPDATE ON public.user_weekly_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add scheduled_at column to weekly_intros for the meeting time
ALTER TABLE public.weekly_intros 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN match_revealed_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- Migration: 20260208225220_07f04a5b-ccda-49c0-9e40-d4e86dc8d4db.sql
-- ============================================

-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- ============================================
-- Migration: 20260208233530_ed5638c3-e9fa-4d47-ab05-bafe26cfc490.sql
-- ============================================

-- Add password column to weekly_intros table for video call security
ALTER TABLE public.weekly_intros 
ADD COLUMN video_call_password text;

-- ============================================
-- Migration: 20260209013319_31fd692e-b23c-4955-b183-ded589b2ffec.sql
-- ============================================

-- Create invites table to track referrals
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  invitee_email TEXT,
  invitee_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_invites_inviter ON public.invites(inviter_id);
CREATE INDEX idx_invites_referral_code ON public.invites(referral_code);
CREATE INDEX idx_invites_invitee ON public.invites(invitee_id);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Users can view their own sent invites
CREATE POLICY "Users can view own invites"
ON public.invites
FOR SELECT
USING (auth.uid() = inviter_id);

-- Users can create invites
CREATE POLICY "Users can create invites"
ON public.invites
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

-- Add referral_code column to profiles for tracking who referred them
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create function to generate unique referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text || NOW()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate referral codes
CREATE TRIGGER set_referral_code
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- ============================================
-- Migration: 20260209042036_ed6162f7-f224-42b0-949c-0400680e2254.sql
-- ============================================

-- Drop the existing SELECT policy that only applies to authenticated users
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a new policy that truly allows anyone (including anon) to view profiles
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
TO anon, authenticated
USING (true);

-- ============================================
-- Migration: 20260209061714_bd3bb27d-a33f-40b4-9e74-808e01cc771d.sql
-- ============================================

-- Add LinkedIn access token column to profiles for posting
ALTER TABLE public.profiles 
ADD COLUMN linkedin_access_token text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.linkedin_access_token IS 'OAuth access token for posting to LinkedIn on behalf of user';

-- ============================================
-- Migration: 20260222100133_4e5c103d-00f0-48b5-8024-f1573d26ffdc.sql
-- ============================================


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


-- ============================================
-- Migration: 20260321000000_create_groups.sql
-- ============================================

-- Enable pgcrypto for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group timeslots (max 10 per group, enforced in app)
CREATE TABLE IF NOT EXISTS public.group_timeslots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Timeslot subscriptions (users subscribe to timeslots for matching)
CREATE TABLE IF NOT EXISTS public.timeslot_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timeslot_id uuid NOT NULL REFERENCES public.group_timeslots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timeslot_id, user_id)
);

-- RLS policies
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_timeslots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeslot_subscriptions ENABLE ROW LEVEL SECURITY;

-- Groups: anyone authenticated can view public groups; members can view private groups
CREATE POLICY "View public groups" ON public.groups
  FOR SELECT USING (visibility = 'public' OR auth.uid() = owner_id);

CREATE POLICY "Members can view their private groups" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
  );

CREATE POLICY "Owners can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups" ON public.groups
  FOR DELETE USING (auth.uid() = owner_id);

-- Group members: members can view other members in their groups
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

-- Group timeslots: members can view; owners can manage
CREATE POLICY "Members can view timeslots" ON public.group_timeslots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_timeslots.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Owners can manage timeslots" ON public.group_timeslots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_timeslots.group_id AND owner_id = auth.uid())
  );

-- Timeslot subscriptions: members can view; users manage their own
CREATE POLICY "Members can view subscriptions" ON public.timeslot_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_timeslots gt
      JOIN public.group_members gm ON gm.group_id = gt.group_id
      WHERE gt.id = timeslot_subscriptions.timeslot_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can subscribe" ON public.timeslot_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe" ON public.timeslot_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_timeslots_group_id ON public.group_timeslots(group_id);
CREATE INDEX idx_timeslot_subscriptions_timeslot_id ON public.timeslot_subscriptions(timeslot_id);
CREATE INDEX idx_timeslot_subscriptions_user_id ON public.timeslot_subscriptions(user_id);


-- ============================================
-- Migration: 20260321000001_create_confirmations_and_matches.sql
-- ============================================

-- Timeslot confirmations: users reconfirm each week
CREATE TABLE IF NOT EXISTS public.timeslot_confirmations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timeslot_id uuid NOT NULL REFERENCES public.group_timeslots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of date NOT NULL, -- The Monday of the week this confirmation is for
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timeslot_id, user_id, week_of)
);

-- Group matches: 1:1 pairings generated by the scheduler
CREATE TABLE IF NOT EXISTS public.group_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  timeslot_id uuid NOT NULL REFERENCES public.group_timeslots(id) ON DELETE CASCADE,
  user_a_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of date NOT NULL, -- The Monday of the week
  match_reason text, -- AI-generated reason why they're matched
  video_call_url text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timeslot_id, user_a_id, week_of),
  UNIQUE(timeslot_id, user_b_id, week_of)
);

-- RLS
ALTER TABLE public.timeslot_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_matches ENABLE ROW LEVEL SECURITY;

-- Confirmations: users manage their own
CREATE POLICY "Users can view their confirmations" ON public.timeslot_confirmations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Members can view group confirmations" ON public.timeslot_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_timeslots gt
      JOIN public.group_members gm ON gm.group_id = gt.group_id
      WHERE gt.id = timeslot_confirmations.timeslot_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can confirm" ON public.timeslot_confirmations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unconfirm" ON public.timeslot_confirmations
  FOR DELETE USING (auth.uid() = user_id);

-- Matches: participants can view their matches
CREATE POLICY "Users can view their matches" ON public.group_matches
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Members can view group matches" ON public.group_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_matches.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their match status" ON public.group_matches
  FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Indexes
CREATE INDEX idx_timeslot_confirmations_timeslot ON public.timeslot_confirmations(timeslot_id, week_of);
CREATE INDEX idx_timeslot_confirmations_user ON public.timeslot_confirmations(user_id, week_of);
CREATE INDEX idx_group_matches_users ON public.group_matches(user_a_id, week_of);
CREATE INDEX idx_group_matches_users_b ON public.group_matches(user_b_id, week_of);
CREATE INDEX idx_group_matches_timeslot ON public.group_matches(timeslot_id, week_of);
CREATE INDEX idx_group_matches_group ON public.group_matches(group_id, week_of);


-- ============================================
-- Migration: 20260321000002_create_notifications_and_feedback.sql
-- ============================================

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('confirm_reminder', 'match_created', 'match_feedback')),
  title text NOT NULL,
  body text NOT NULL,
  link text, -- e.g. /groups/<id>
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Post-match feedback
CREATE TABLE IF NOT EXISTS public.match_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.group_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

-- Notifications: users see only their own
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role inserts notifications (via edge functions)
-- No INSERT policy for regular users; edge functions use service role

-- Feedback: users manage their own
CREATE POLICY "Users view own feedback" ON public.match_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feedback" ON public.match_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Participants can see each other's feedback
CREATE POLICY "Match participants view feedback" ON public.match_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_matches gm
      WHERE gm.id = match_feedback.match_id
      AND (gm.user_a_id = auth.uid() OR gm.user_b_id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_match_feedback_match ON public.match_feedback(match_id);


