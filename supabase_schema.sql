-- Create Users Table (extends Supabase Auth Users)
-- We will link this to auth.users via a trigger if needed, or just store profile data here.
-- For simplicity in this app, we will use a separate public.profiles table linked to auth.users.

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  cid TEXT UNIQUE,
  rating INTEGER,
  rating_short TEXT,
  rating_long TEXT,
  region TEXT,
  division TEXT,
  subdivision TEXT,
  position TEXT,
  role TEXT DEFAULT 'guest',
  ermc_access_granted boolean not null default false,
  ermc_access_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create Events Table
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vatsim_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  banner TEXT,
  link TEXT,
  type TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  airports TEXT, -- Comma separated
  routes TEXT, -- JSON string
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for Events
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

-- Only admins/service role can insert/update events (handled by backend service role)
-- No public write access for events

-- Create Roster Entries Table
CREATE TABLE public.roster_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id), -- Nullable (Open slot)
  position TEXT NOT NULL,
  airport TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Roster Entries
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;

-- Policies for Roster Entries
CREATE POLICY "Roster entries are viewable by everyone" ON public.roster_entries
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can claim open slots" ON public.roster_entries
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Claims table to support primary and standby bookings
CREATE TABLE public.roster_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_entry_id UUID REFERENCES public.roster_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('primary','standby')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.roster_claims ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX roster_claims_primary_unique ON public.roster_claims (roster_entry_id) WHERE type = 'primary';

-- Policies for roster_claims
CREATE POLICY "Claims are viewable to everyone" ON public.roster_claims
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own claims" ON public.roster_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own claims" ON public.roster_claims
  FOR DELETE USING (auth.uid() = user_id);

-- Sync roster_entries on primary claim insert/delete
CREATE OR REPLACE FUNCTION public.apply_primary_claim()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.type = 'primary') THEN
      UPDATE public.roster_entries
        SET user_id = NEW.user_id, status = 'claimed', updated_at = NOW()
        WHERE id = NEW.roster_entry_id AND user_id IS NULL;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.type = 'primary') THEN
      UPDATE public.roster_entries
        SET user_id = NULL, status = 'open', updated_at = NOW()
        WHERE id = OLD.roster_entry_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER roster_primary_claim_insert
  AFTER INSERT ON public.roster_claims
  FOR EACH ROW EXECUTE PROCEDURE public.apply_primary_claim();

CREATE TRIGGER roster_primary_claim_delete
  AFTER DELETE ON public.roster_claims
  FOR EACH ROW EXECUTE PROCEDURE public.apply_primary_claim();

-- Knocks table for coordination nudges with realtime notifications
CREATE TABLE public.knocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  roster_entry_id UUID REFERENCES public.roster_entries(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.knocks ENABLE ROW LEVEL SECURITY;

-- Policies for knocks
CREATE POLICY "Users can see knocks they sent or receive" ON public.knocks
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can create knocks they send" ON public.knocks
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Messages table for coordination chat (realtime)
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are viewable by everyone" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
