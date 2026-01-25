
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  linkedin_url TEXT,
  location TEXT,
  age INTEGER,
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
  industry TEXT CHECK (industry IN ('tech', 'finance', 'healthcare', 'education', 'marketing', 'consulting', 'other')),
  looking_for TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  preferred_experience_levels TEXT[] DEFAULT '{}',
  preferred_industries TEXT[] DEFAULT '{}',
  preferred_goals TEXT[] DEFAULT '{}',
  age_min INTEGER,
  age_max INTEGER,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create connections table
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  message TEXT,
  requester_linkedin_requested BOOLEAN DEFAULT false,
  recipient_linkedin_requested BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily_swipes table
CREATE TABLE public.daily_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swipe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  swipe_count INTEGER DEFAULT 0,
  last_cursor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, swipe_date)
);

-- Create dismissed_profiles table
CREATE TABLE public.dismissed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismiss_count INTEGER DEFAULT 1,
  last_dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, dismissed_profile_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Anyone authenticated can read (for feed), users can manage their own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Connections RLS: Users can see/manage connections they're part of
CREATE POLICY "Users can view own connections" ON public.connections FOR SELECT TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create connection requests" ON public.connections FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own connections" ON public.connections FOR UPDATE TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can delete own connections" ON public.connections FOR DELETE TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Messages RLS: Users can view messages in their connections
CREATE POLICY "Users can view messages in their connections" ON public.messages FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.connections 
    WHERE connections.id = messages.connection_id 
    AND (connections.requester_id = auth.uid() OR connections.recipient_id = auth.uid())
  ));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.connections 
    WHERE connections.id = connection_id 
    AND connections.status = 'accepted'
    AND (connections.requester_id = auth.uid() OR connections.recipient_id = auth.uid())
  ));

-- Daily swipes RLS: Users can only manage their own swipe records
CREATE POLICY "Users can view own swipes" ON public.daily_swipes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own swipes" ON public.daily_swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own swipes" ON public.daily_swipes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Dismissed profiles RLS: Users can only manage their own dismissals
CREATE POLICY "Users can view own dismissals" ON public.dismissed_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dismissals" ON public.dismissed_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dismissals" ON public.dismissed_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dismissals" ON public.dismissed_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active DESC);
CREATE INDEX idx_profiles_experience_level ON public.profiles(experience_level);
CREATE INDEX idx_profiles_industry ON public.profiles(industry);
CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_messages_connection ON public.messages(connection_id, created_at);
CREATE INDEX idx_daily_swipes_user_date ON public.daily_swipes(user_id, swipe_date);
CREATE INDEX idx_dismissed_user ON public.dismissed_profiles(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_swipes_updated_at BEFORE UPDATE ON public.daily_swipes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
