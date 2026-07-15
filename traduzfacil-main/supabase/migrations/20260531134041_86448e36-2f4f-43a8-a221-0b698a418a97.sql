-- Tabela de progresso/gamificação do usuário (sincronização entre dispositivos)
CREATE TABLE public.user_progress (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_active_day date,
  today_count integer NOT NULL DEFAULT 0,
  today_day date,
  total_actions integer NOT NULL DEFAULT 0,
  lessons_done text[] NOT NULL DEFAULT '{}',
  cards_mastered text[] NOT NULL DEFAULT '{}',
  by_lang jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permissões via Data API (escopo por usuário; sem acesso anônimo)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own progress"
  ON public.user_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own progress"
  ON public.user_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own progress"
  ON public.user_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger de updated_at (função set_updated_at já existe)
CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ranking público (top jogadores por XP). Security definer para ler nome +
-- XP de todos sem expor as linhas inteiras via RLS. Não expõe e-mail nem PII.
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE (display_name text, xp integer, total_actions integer, rnk bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p.display_name, 'Anônimo') AS display_name,
    up.xp,
    up.total_actions,
    ROW_NUMBER() OVER (ORDER BY up.xp DESC, up.total_actions DESC) AS rnk
  FROM public.user_progress up
  LEFT JOIN public.profiles p ON p.id = up.user_id
  WHERE up.xp > 0
  ORDER BY up.xp DESC, up.total_actions DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;