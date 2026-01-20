export const SUPABASE_SQL = `
CREATE TABLE IF NOT EXISTS public.profiles (
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
  role TEXT DEFAULT 'guest',
  position TEXT,
  ermc_access_granted boolean not null default false,
  ermc_access_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vatsim_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  banner TEXT,
  link TEXT,
  type TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  airports TEXT,
  routes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.roster_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  position TEXT NOT NULL,
  airport TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roster entries are viewable by everyone" ON public.roster_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can claim open slots" ON public.roster_entries FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.roster_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_entry_id UUID REFERENCES public.roster_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('primary','standby')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.roster_claims ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS roster_claims_primary_unique ON public.roster_claims (roster_entry_id) WHERE type = 'primary';
CREATE POLICY "Claims are viewable to everyone" ON public.roster_claims FOR SELECT USING (true);
CREATE POLICY "Users can insert their own claims" ON public.roster_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own claims" ON public.roster_claims FOR DELETE USING (auth.uid() = user_id);

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

DROP TRIGGER IF EXISTS roster_primary_claim_insert ON public.roster_claims;
CREATE TRIGGER roster_primary_claim_insert
AFTER INSERT ON public.roster_claims
FOR EACH ROW EXECUTE PROCEDURE public.apply_primary_claim();

DROP TRIGGER IF EXISTS roster_primary_claim_delete ON public.roster_claims;
CREATE TRIGGER roster_primary_claim_delete
AFTER DELETE ON public.roster_claims
FOR EACH ROW EXECUTE PROCEDURE public.apply_primary_claim();

CREATE TABLE IF NOT EXISTS public.knocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  roster_entry_id UUID REFERENCES public.roster_entries(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.knocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see knocks they sent or receive" ON public.knocks FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
CREATE POLICY "Users can create knocks they send" ON public.knocks FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are viewable by everyone" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can insert their own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact requests" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view contact requests" ON public.contact_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'staff' OR role = 'admin'))
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
