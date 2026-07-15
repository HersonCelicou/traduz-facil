REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;