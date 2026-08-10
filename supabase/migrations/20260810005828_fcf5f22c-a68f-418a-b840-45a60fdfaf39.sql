CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'رحّال',
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  destination_id text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
GRANT SELECT ON public.user_challenges TO anon;
GRANT SELECT, INSERT ON public.user_challenges TO authenticated;
GRANT ALL ON public.user_challenges TO service_role;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_challenges_public_read" ON public.user_challenges FOR SELECT USING (true);
CREATE POLICY "user_challenges_insert_own" ON public.user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_trip_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, destination_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_trip_items TO authenticated;
GRANT ALL ON public.user_trip_items TO service_role;
ALTER TABLE public.user_trip_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_trip_items_own" ON public.user_trip_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_redemptions TO authenticated;
GRANT ALL ON public.user_redemptions TO service_role;
ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_redemptions_own" ON public.user_redemptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, 'رحّال'), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.recalc_user_points(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET points = GREATEST(0,
        COALESCE((SELECT SUM(points) FROM public.user_challenges WHERE user_id = _user_id), 0)
        - COALESCE((SELECT SUM(points) FROM public.user_redemptions WHERE user_id = _user_id), 0)),
      updated_at = now()
  WHERE p.id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.points_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_user_points(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER user_challenges_points AFTER INSERT OR UPDATE OR DELETE ON public.user_challenges
FOR EACH ROW EXECUTE FUNCTION public.points_changed();

CREATE TRIGGER user_redemptions_points AFTER INSERT OR UPDATE OR DELETE ON public.user_redemptions
FOR EACH ROW EXECUTE FUNCTION public.points_changed();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.points_changed() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.recalc_user_points(uuid) FROM anon, authenticated, public;