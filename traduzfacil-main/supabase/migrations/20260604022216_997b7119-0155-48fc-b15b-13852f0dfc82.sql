REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;