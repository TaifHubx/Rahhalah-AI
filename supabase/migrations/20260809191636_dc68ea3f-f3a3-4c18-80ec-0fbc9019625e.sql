REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.points_changed() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.recalc_user_points(uuid) FROM anon, authenticated, public;