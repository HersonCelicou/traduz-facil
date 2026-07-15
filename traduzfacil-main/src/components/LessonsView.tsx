import { useMemo, useState, useEffect } from "react";
import { Volume2, ArrowLeft, ArrowRight, Check, BookOpen, Lightbulb, Play } from "lucide-react";
import { speakWithElevenLabs, prefetchTTS } from "@/lib/tts";
import {
  LESSONS,
  STUDY_LANGS,
  localeOf,
  nativeKeyFromLocale,
  interpolateTip,
  type Lesson,
  type LangKey,
} from "@/lib/learn-content";
import { completeLesson, recordActivity } from "@/lib/progress";
import { useI18n, UI_LANGUAGES } from "@/lib/i18n";

type Locale = string;

// Nome nativo do idioma (localizado) para os botões de seleção.
function nativeLabel(key: LangKey, fallback: string): string {
  return UI_LANGUAGES.find((u) => u.code === key)?.native ?? fallback;
}

export function LessonsView({
  userLang,
  onBack,
}: {
  userLang: Locale;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const nativeKey = nativeKeyFromLocale(userLang);
  const [studyKey, setStudyKey] = useState<LangKey>(nativeKey === "pt" ? "ht" : "pt");
  const [lesson, setLesson] = useState<Lesson | null>(null);

  if (lesson) {
    return (
      <LessonRunner
        lesson={lesson}
        studyKey={studyKey}
        nativeKey={nativeKey}
        onBack={() => setLesson(null)}
      />
    );
  }

  // Todos os idiomas disponíveis (paridade total entre idiomas).
  const opts = STUDY_LANGS;

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-xl bg-secondary text-foreground flex items-center justify-center active:scale-95 transition"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-bold text-foreground text-lg leading-tight">{t("les.title")}</h2>
          <p className="text-[11px] text-muted-foreground">{t("les.subtitle")}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-2 px-1">
          {t("learn.iWantToLearn")}
        </p>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {opts.map((l) => (
            <button
              key={l.key}
              onClick={() => setStudyKey(l.key)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                studyKey === l.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <span>{l.flag}</span>
              {nativeLabel(l.key, l.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {LESSONS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLesson(l)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border shadow-card p-4 text-left hover:border-primary/40 active:scale-[0.99] transition"
          >
            <div className="text-3xl shrink-0">{l.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{t("lesson." + l.id + ".title")}</p>
              <p className="text-xs text-muted-foreground">{t("lesson." + l.id + ".subtitle")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("les.words", { n: l.items.length })}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

type Stage = "study" | "quiz" | "done";

function LessonRunner({
  lesson,
  studyKey,
  nativeKey,
  onBack,
}: {
  lesson: Lesson;
  studyKey: LangKey;
  nativeKey: LangKey;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const studyLocale = localeOf(studyKey);
  const studyFlag = STUDY_LANGS.find((l) => l.key === studyKey)?.flag;
  const items = useMemo(() => lesson.items.filter((it) => it[studyKey]), [lesson, studyKey]);
  const [stage, setStage] = useState<Stage>("study");

  return stage === "study" ? (
    <StudyStage
      lesson={lesson}
      items={items}
      studyKey={studyKey}
      nativeKey={nativeKey}
      studyLocale={studyLocale}
      studyFlag={studyFlag}
      onBack={onBack}
      onQuiz={() => setStage("quiz")}
    />
  ) : stage === "quiz" ? (
    <QuizStage
      lesson={lesson}
      items={items}
      studyKey={studyKey}
      nativeKey={nativeKey}
      onBack={() => setStage("study")}
      onDone={() => {
        completeLesson(lesson.id);
        setStage("done");
      }}
    />
  ) : (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="rounded-2xl bg-gradient-tropical text-primary-foreground p-6 text-center shadow-glow mt-6">
        <div className="text-5xl mb-2">✅</div>
        <p className="font-bold text-lg">{t("les.completed")}</p>
        <p className="text-sm opacity-90 mt-1">+10 XP · {t("lesson." + lesson.id + ".title")}</p>
      </div>
      <button
        onClick={onBack}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold shadow-card active:scale-[0.99] transition"
      >
        {t("les.backToLessons")}
      </button>
    </div>
  );
}

function StudyStage({
  lesson,
  items,
  studyKey,
  nativeKey,
  studyLocale,
  studyFlag,
  onBack,
  onQuiz,
}: {
  lesson: Lesson;
  items: Lesson["items"];
  studyKey: LangKey;
  nativeKey: LangKey;
  studyLocale: string;
  studyFlag?: string;
  onBack: () => void;
  onQuiz: () => void;
}) {
  const { t } = useI18n();
  // Pré-carrega o primeiro áudio.
  useEffect(() => {
    const first = items[0]?.[studyKey];
    if (first) void prefetchTTS(first as string, studyLocale);
  }, [items, studyKey, studyLocale]);

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-xl bg-secondary text-foreground flex items-center justify-center active:scale-95 transition"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-bold text-foreground text-lg leading-tight">
            {lesson.icon} {t("lesson." + lesson.id + ".title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">{t("les.wordsPhrases", { n: items.length })}</p>
        </div>
      </div>

      {/* Dica / explicação — no idioma da interface, falando sobre o idioma estudado */}
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 flex gap-2">
        <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] text-foreground/80 leading-relaxed">
          {interpolateTip(
            t("tiptpl." + lesson.id),
            lesson.items,
            studyKey,
            nativeKey,
            t("langname." + studyKey),
          )}
        </p>
      </div>

      {/* Vocabulário */}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-card border border-border shadow-card p-3"
          >
            <button
              onClick={() => void speakWithElevenLabs(it[studyKey] as string, studyLocale)}
              className="shrink-0 h-10 w-10 rounded-full bg-gradient-tropical text-primary-foreground flex items-center justify-center shadow-card active:scale-95 transition"
              aria-label={t("practice.listen")}
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">
                {studyFlag} {it[studyKey]}
              </p>
              {it.pron && studyKey === "ht" && (
                <p className="text-[11px] text-muted-foreground italic">/{it.pron}/</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{it[nativeKey]}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onQuiz}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3 font-bold shadow-card active:scale-[0.99] transition"
      >
        <Play className="h-4 w-4" /> {t("les.doExercise")}
      </button>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizStage({
  lesson,
  items,
  studyKey,
  nativeKey,
  onBack,
  onDone,
}: {
  lesson: Lesson;
  items: Lesson["items"];
  studyKey: LangKey;
  nativeKey: LangKey;
  onBack: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const questions = useMemo(() => shuffle(items).slice(0, Math.min(5, items.length)), [items]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const q = questions[qi];
  const options = useMemo(() => {
    const others = shuffle(items.filter((it) => it.pt !== q.pt)).slice(0, 3);
    return shuffle([q, ...others]);
  }, [q, items]);

  const pick = (val: string) => {
    if (picked) return;
    setPicked(val);
    if (val === q[nativeKey]) setCorrect((c) => c + 1);
    recordActivity(2);
  };

  const next = () => {
    if (qi + 1 < questions.length) {
      setQi((i) => i + 1);
      setPicked(null);
    } else {
      onDone();
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-xl bg-secondary text-foreground flex items-center justify-center active:scale-95 transition"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-bold text-foreground text-lg leading-tight">{t("les.exercise")}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t("les.question", { n: qi + 1, total: questions.length })} · {t("lesson." + lesson.id + ".title")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-tropical text-primary-foreground p-5 shadow-glow text-center">
        <p className="text-[11px] uppercase font-semibold opacity-90">{t("les.whatMeans")}</p>
        <p className="text-3xl font-extrabold mt-2 leading-tight">{q[studyKey]}</p>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const val = opt[nativeKey] as string;
          const isCorrect = val === q[nativeKey];
          const showState = picked !== null;
          return (
            <button
              key={i}
              onClick={() => pick(val)}
              disabled={picked !== null}
              className={`w-full flex items-center justify-between gap-2 rounded-2xl border p-3 text-left font-semibold transition ${
                showState && isCorrect
                  ? "bg-primary/15 border-primary text-primary"
                  : showState && picked === val
                    ? "bg-destructive/15 border-destructive text-destructive"
                    : "bg-card border-border text-foreground"
              }`}
            >
              <span>{val}</span>
              {showState && isCorrect && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3 font-bold shadow-card active:scale-[0.99] transition"
        >
          {qi + 1 < questions.length ? (
            <>{t("les.next")} <ArrowRight className="h-4 w-4" /></>
          ) : (
            <>{t("les.finishLesson", { correct, total: questions.length })} <BookOpen className="h-4 w-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
