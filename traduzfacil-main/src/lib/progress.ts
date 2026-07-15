// Progresso real do usuário, salvo localmente (localStorage) E sincronizado
// com o banco de dados (tabela user_progress) para persistir entre sessões e
// dispositivos. Controla: ofensiva (dias seguidos), atividades de hoje, metas
// diárias, lições concluídas, domínio de flashcards e conquistas desbloqueadas.
import { supabase } from "@/integrations/supabase/client";

export type Progress = {
  streak: number;
  bestStreak: number;
  lastActiveDay: string; // YYYY-MM-DD
  todayCount: number;
  todayDay: string;
  totalActions: number;
  lessonsDone: string[];     // ids de lições concluídas
  cardsMastered: string[];   // chaves "deckId:pt" dominadas
  xp: number;
  byLang: Record<string, number>; // atividades por idioma (ht, fr, en, es, pt)
};

const KEY = "tf_progress_v1";
const DAILY_GOAL = 20;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

function blank(): Progress {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDay: "",
    todayCount: 0,
    todayDay: todayStr(),
    totalActions: 0,
    lessonsDone: [],
    cardsMastered: [],
    xp: 0,
    byLang: {},
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const p = { ...blank(), ...JSON.parse(raw) } as Progress;
    // Reseta contagem se virou o dia
    if (p.todayDay !== todayStr()) {
      p.todayDay = todayStr();
      p.todayCount = 0;
    }
    return p;
  } catch {
    return blank();
  }
}

function save(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("tf-progress"));
    schedulePush(p); // sincroniza com o banco (debounced)
  } catch {
    /* ignore */
  }
}

// ============================================================
// SINCRONIZAÇÃO COM O BANCO (tabela user_progress)
// Garante que XP, conquistas, ofensiva e progresso persistam entre
// sessões e dispositivos, não apenas no localStorage.
// ============================================================

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Agenda um envio ao banco (debounced) para não chamar a cada ação. */
function schedulePush(p: Progress) {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushToDB(p);
  }, 1200);
}

/** Envia o estado atual ao banco (upsert por user_id). Silencioso se deslogado. */
async function pushToDB(p: Progress): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        xp: p.xp,
        streak: p.streak,
        best_streak: p.bestStreak,
        last_active_day: p.lastActiveDay || null,
        today_count: p.todayCount,
        today_day: p.todayDay || null,
        total_actions: p.totalActions,
        lessons_done: p.lessonsDone,
        cards_mastered: p.cardsMastered,
        by_lang: p.byLang,
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* offline ou sem sessão: mantém apenas no localStorage */
  }
}

/** Mescla local e remoto sem perder progresso (sempre o maior/união). */
function mergeProgress(local: Progress, remote: Progress): Progress {
  const lessons = Array.from(new Set([...local.lessonsDone, ...remote.lessonsDone]));
  const cards = Array.from(new Set([...local.cardsMastered, ...remote.cardsMastered]));
  const byLang: Record<string, number> = { ...remote.byLang };
  for (const [k, v] of Object.entries(local.byLang || {})) {
    byLang[k] = Math.max(byLang[k] || 0, v);
  }
  // Dia mais recente determina contagem do dia.
  const sameDay = local.todayDay === remote.todayDay;
  return {
    streak: Math.max(local.streak, remote.streak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    lastActiveDay:
      local.lastActiveDay > remote.lastActiveDay ? local.lastActiveDay : remote.lastActiveDay,
    todayDay: local.todayDay >= remote.todayDay ? local.todayDay : remote.todayDay,
    todayCount: sameDay
      ? Math.max(local.todayCount, remote.todayCount)
      : local.todayDay >= remote.todayDay
        ? local.todayCount
        : remote.todayCount,
    totalActions: Math.max(local.totalActions, remote.totalActions),
    lessonsDone: lessons,
    cardsMastered: cards,
    xp: Math.max(local.xp, remote.xp),
    byLang,
  };
}

/**
 * Carrega o progresso do banco, mescla com o local e grava o resultado.
 * Chame uma vez logo após o login. Dispara o evento "tf-progress" para a UI.
 */
export async function pullProgress(): Promise<Progress | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const local = loadProgress();

    if (error || !data) {
      // Primeira vez: envia o que já existe localmente para o banco.
      await pushToDB(local);
      return local;
    }

    const remote: Progress = {
      streak: data.streak ?? 0,
      bestStreak: data.best_streak ?? 0,
      lastActiveDay: data.last_active_day ?? "",
      todayCount: data.today_count ?? 0,
      todayDay: data.today_day ?? todayStr(),
      totalActions: data.total_actions ?? 0,
      lessonsDone: (data.lessons_done as string[]) ?? [],
      cardsMastered: (data.cards_mastered as string[]) ?? [],
      xp: data.xp ?? 0,
      byLang: (data.by_lang as Record<string, number>) ?? {},
    };

    const merged = mergeProgress(local, remote);
    localStorage.setItem(KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("tf-progress"));
    // Reenvia o mesclado para o banco caso o local tivesse algo a mais.
    await pushToDB(merged);
    return merged;
  } catch {
    return null;
  }
}

/** Normaliza um locale ("ht-HT", "pt-BR") para a chave curta de idioma. */
export function langKeyOf(locale: string): string {
  const l = (locale || "").toLowerCase();
  if (l.startsWith("ht")) return "ht";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

/**
 * Registra uma atividade (tradução, lição, flashcard, prática).
 * Atualiza ofensiva, contagem do dia, XP e contagem por idioma.
 */
export function recordActivity(xp = 5, lang?: string): Progress {
  const p = loadProgress();
  const today = todayStr();

  // Ofensiva (streak)
  if (p.lastActiveDay !== today) {
    const diff = p.lastActiveDay ? dayDiff(p.lastActiveDay, today) : 999;
    if (diff === 1) p.streak += 1;
    else p.streak = 1;
    p.lastActiveDay = today;
    if (p.streak > p.bestStreak) p.bestStreak = p.streak;
  }

  if (p.todayDay !== today) {
    p.todayDay = today;
    p.todayCount = 0;
  }
  p.todayCount += 1;
  p.totalActions += 1;
  p.xp += xp;
  if (lang) {
    const key = langKeyOf(lang);
    p.byLang[key] = (p.byLang[key] || 0) + 1;
  }
  save(p);
  return p;
}

export function completeLesson(id: string): Progress {
  const p = loadProgress();
  if (!p.lessonsDone.includes(id)) {
    p.lessonsDone.push(id);
    save(p);
  }
  return recordActivity(10);
}

export function masterCard(deckId: string, pt: string, known: boolean): Progress {
  const p = loadProgress();
  const key = `${deckId}:${pt}`;
  const idx = p.cardsMastered.indexOf(key);
  if (known && idx === -1) p.cardsMastered.push(key);
  if (!known && idx !== -1) p.cardsMastered.splice(idx, 1);
  save(p);
  return p;
}

export function isCardMastered(deckId: string, pt: string): boolean {
  return loadProgress().cardsMastered.includes(`${deckId}:${pt}`);
}

export function dailyGoal(): number {
  return DAILY_GOAL;
}

export function level(xp: number): { level: number; into: number; need: number } {
  // Nível cresce a cada 100 XP, com leve curva.
  const lvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const base = (lvl - 1) * (lvl - 1) * 50;
  const next = lvl * lvl * 50;
  return { level: lvl, into: xp - base, need: next - base };
}

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  unlocked: boolean;
};

export function computeAchievements(p: Progress): Achievement[] {
  return [
    { id: "first", icon: "🏆", label: "Primeiro passo", desc: "Faça sua 1ª atividade", unlocked: p.totalActions >= 1 },
    { id: "streak3", icon: "🔥", label: "3 dias seguidos", desc: "Ofensiva de 3 dias", unlocked: p.bestStreak >= 3 },
    { id: "streak7", icon: "⚡", label: "7 dias seguidos", desc: "Ofensiva de 7 dias", unlocked: p.bestStreak >= 7 },
    { id: "lesson1", icon: "📖", label: "Estudante", desc: "Conclua 1 lição", unlocked: p.lessonsDone.length >= 1 },
    { id: "lesson5", icon: "🎓", label: "Dedicado", desc: "Conclua 5 lições", unlocked: p.lessonsDone.length >= 5 },
    { id: "cards10", icon: "🃏", label: "Memória boa", desc: "Domine 10 cartões", unlocked: p.cardsMastered.length >= 10 },
    { id: "cards30", icon: "🧠", label: "Vocabulário forte", desc: "Domine 30 cartões", unlocked: p.cardsMastered.length >= 30 },
    { id: "actions50", icon: "🌍", label: "Comunicador", desc: "50 atividades", unlocked: p.totalActions >= 50 },
    { id: "actions200", icon: "🚀", label: "Fluência a caminho", desc: "200 atividades", unlocked: p.totalActions >= 200 },
  ];
}

// ============================================================
// LIGAS — progressão por XP acumulado (Bronze → Diamante)
// ============================================================
export type League = {
  id: string;
  name: string;
  icon: string;
  /** XP mínimo para entrar na liga */
  min: number;
  /** XP necessário para a próxima liga (Infinity na última) */
  next: number;
  /** classe de cor (token do design system) */
  color: string;
};

const LEAGUES: Array<Omit<League, "next">> = [
  { id: "bronze", name: "Bronze", icon: "🥉", min: 0, color: "#cd7f32" },
  { id: "prata", name: "Prata", icon: "🥈", min: 500, color: "#9ca3af" },
  { id: "ouro", name: "Ouro", icon: "🥇", min: 1500, color: "#eab308" },
  { id: "platina", name: "Platina", icon: "💠", min: 3500, color: "#22d3ee" },
  { id: "diamante", name: "Diamante", icon: "💎", min: 7000, color: "#a78bfa" },
];

/** Retorna a liga atual do usuário a partir do XP. */
export function leagueOf(xp: number): League {
  let idx = 0;
  for (let i = 0; i < LEAGUES.length; i++) {
    if (xp >= LEAGUES[i].min) idx = i;
  }
  const cur = LEAGUES[idx];
  const next = idx < LEAGUES.length - 1 ? LEAGUES[idx + 1].min : Infinity;
  return { ...cur, next };
}

/** Progresso (0..1) dentro da liga atual rumo à próxima. */
export function leagueProgress(xp: number): number {
  const lg = leagueOf(xp);
  if (lg.next === Infinity) return 1;
  return Math.max(0, Math.min(1, (xp - lg.min) / (lg.next - lg.min)));
}
