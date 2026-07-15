import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CommitStrategy, useScribe } from "@elevenlabs/react";
import {
  Mic,
  MicOff,
  ArrowDownUp,
  Languages,
  History,
  Loader2,
  Volume2,
  Trash2,
  X,
  Check,
  HelpCircle,
  Sparkles,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Mail,
  Target,
  User,
  Home,
  Flame,
  Zap,
  Trophy,
  BookOpen,
  Mic2,
  Layers,
  ChevronRight,
  PlayCircle,
  Camera,
  Settings as SettingsIcon,
  Type as TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoBonjou from "@/assets/logo-traduz-facil.png";

import { CorrectionScreen } from "@/components/CorrectionScreen";
import { PracticeView } from "@/components/PracticeView";
import { LessonsView } from "@/components/LessonsView";
import { FlashcardsView } from "@/components/FlashcardsView";
import { speakWithElevenLabs, prefetchTTS } from "@/lib/tts";
import { checkMicPermission, classifyMicError, micErrorMessage } from "@/lib/mic";
import { authHeader } from "@/lib/auth-headers";
import { useI18n, UI_LANGUAGES, FONT_SCALES, type UiLang, type FontScale } from "@/lib/i18n";
import { loadProgress, computeAchievements, level, dailyGoal, recordActivity, langKeyOf, leagueOf, leagueProgress, pullProgress } from "@/lib/progress";
import { localeOf, nativeKeyFromLocale, STUDY_LANGS, type LangKey } from "@/lib/learn-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Traduz Fácil — Tradutor de Acolhimento" },
      {
        name: "description",
        content:
          "Conectando culturas e oportunidades. Tradutor de voz e texto para imigrantes no Brasil.",
      },
      { property: "og:title", content: "Traduz Fácil — Tradutor de Acolhimento" },
      {
        property: "og:description",
        content: "Conectando culturas e oportunidades.",
      },
    ],
  }),
  component: BonjouApp,
});

type Locale =
  | "pt-BR"
  | "fr-FR"
  | "ht-HT"
  | "en-US"
  | "es-ES"
  | "es-MX"
  | "es-AR"
  | "es-DO"
  | "es-CL";

const LANGUAGES: { code: Locale; flag: string; name: string; native: string }[] = [
  { code: "pt-BR", flag: "🇧🇷", name: "Português", native: "Português (Brasil)" },
  { code: "fr-FR", flag: "🇫🇷", name: "Francês", native: "Français" },
  { code: "ht-HT", flag: "🇭🇹", name: "Crioulo Haitiano", native: "Kreyòl Ayisyen" },
  { code: "en-US", flag: "🇺🇸", name: "Inglês", native: "English" },
  { code: "es-ES", flag: "🇪🇸", name: "Espanhol (Espanha)", native: "Español (España)" },
  { code: "es-MX", flag: "🇲🇽", name: "Espanhol (México/Col.)", native: "Español (MX/CO)" },
  { code: "es-AR", flag: "🇦🇷", name: "Espanhol (Argentina)", native: "Español (AR)" },
  { code: "es-DO", flag: "🇩🇴", name: "Espanhol (Rep. Dominicana)", native: "Español (RD)" },
  { code: "es-CL", flag: "🇨🇱", name: "Espanhol (Chile)", native: "Español (Chile)" },
];

const LS_LANG = "bonjou.userLang";
const LS_HISTORY = "bonjou.history";
const LS_TARGET = "bonjou.targetLang";

// Idiomas que usam gravação por arquivo para maior compatibilidade e precisão.
const FORCE_SERVER_STT: Locale[] = ["ht-HT"];

const STT_LANGUAGE_CODE: Record<Locale, string> = {
  "ht-HT": "hat",
  "pt-BR": "por",
  "fr-FR": "fra",
  "en-US": "eng",
  "es-ES": "spa",
  "es-MX": "spa",
  "es-AR": "spa",
  "es-DO": "spa",
  "es-CL": "spa",
};

// Detecta se o navegador tem Web Speech API confiável
function hasWebSpeech() {
  if (typeof window === "undefined") return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

function joinSpeech(base: string, addition: string) {
  const left = base.trim();
  const right = addition.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`.replace(/\s+/g, " ").trim();
}

function basicCleanSpeech(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function normalizeForCompare(input: string) {
  return basicCleanSpeech(input)
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function collapseRepeatedSpeech(input: string) {
  let tokens = basicCleanSpeech(input).split(/\s+/).filter(Boolean);
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let size = Math.min(6, Math.floor(tokens.length / 2)); size >= 1; size--) {
      const next: string[] = [];
      for (let i = 0; i < tokens.length;) {
        const group = tokens.slice(i, i + size);
        if (group.length < size) {
          next.push(...group);
          break;
        }
        next.push(...group);
        i += size;
        const groupKey = normalizeForCompare(group.join(" "));
        while (
          i + size <= tokens.length &&
          groupKey === normalizeForCompare(tokens.slice(i, i + size).join(" "))
        ) {
          changed = true;
          i += size;
        }
      }
      tokens = next;
      if (changed) break;
    }
    if (!changed) break;
  }
  return tokens.join(" ");
}

function cleanSpeech(input: string) {
  return collapseRepeatedSpeech(basicCleanSpeech(input));
}

function normalizeSpeech(input: string) {
  return normalizeForCompare(input);
}

function appendUniqueSpeech(base: string, addition: string) {
  const left = cleanSpeech(base);
  const right = cleanSpeech(addition);
  if (!left) return right;
  if (!right) return left;

  const leftNorm = normalizeSpeech(left);
  const rightNorm = normalizeSpeech(right);
  if (!rightNorm || leftNorm.endsWith(rightNorm)) return left;
  if (rightNorm.startsWith(leftNorm)) return right;
  return joinSpeech(left, right);
}

type HistoryItem = {
  id: string;
  source: Locale;
  target: Locale;
  original: string;
  translation: string;
  ts: number;
};

function getLang(code: Locale) {
  return LANGUAGES.find((l) => l.code === code)!;
}

function BonjouApp() {
  const [userLang, setUserLang] = useState<Locale | null>(null);
  const [targetLang, setTargetLang] = useState<Locale>("pt-BR");
  const [tab, setTab] = useState<"home" | "translator" | "practice" | "lessons" | "flashcards" | "history" | "about" | "help" | "settings">("home");
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LS_LANG) as Locale | null;
    const savedTarget = localStorage.getItem(LS_TARGET) as Locale | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setUserLang(saved);
      setTargetLang(savedTarget && savedTarget !== saved ? savedTarget : "pt-BR");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
      if (data.session) void pullProgress();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void pullProgress();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handlePickLang = (code: Locale) => {
    localStorage.setItem(LS_LANG, code);
    setUserLang(code);
    const t = code === "pt-BR" ? "en-US" : "pt-BR";
    setTargetLang(t);
    localStorage.setItem(LS_TARGET, t);
  };

  const handleChangeTarget = (code: Locale) => {
    setTargetLang(code);
    localStorage.setItem(LS_TARGET, code);
  };

  if (!hydrated || !authChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }


  if (!userLang) {
    return <Onboarding onPick={handlePickLang} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Header
        userLang={userLang}
        onChangeUserLang={(c) => {
          localStorage.setItem(LS_LANG, c);
          setUserLang(c);
        }}
      />
      <main className="flex-1 overflow-hidden">
        {tab === "home" ? (
          <HomeView
            userLang={userLang}
            onGoTranslator={() => setTab("translator")}
            onGoPractice={() => setTab("practice")}
            onGoLessons={() => setTab("lessons")}
            onGoFlashcards={() => setTab("flashcards")}
          />
        ) : tab === "translator" ? (
          <Translator
            userLang={userLang}
            targetLang={targetLang}
            onChangeTarget={handleChangeTarget}
          />
        ) : tab === "practice" ? (
          <PracticeView userLang={userLang} />
        ) : tab === "lessons" ? (
          <LessonsView userLang={userLang} onBack={() => setTab("home")} />
        ) : tab === "flashcards" ? (
          <FlashcardsView userLang={userLang} onBack={() => setTab("home")} />
        ) : tab === "history" ? (
          <HistoryView />
        ) : tab === "about" ? (
          <AboutView />
        ) : tab === "settings" ? (
          <SettingsView />
        ) : (
          <HelpView />
        )}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}

/* -------------------- Onboarding -------------------- */

function Onboarding({ onPick }: { onPick: (c: Locale) => void }) {
  const { t } = useI18n();
  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.93 0.04 240) 0%, oklch(0.97 0.025 220) 100%)",
      }}
    >
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-6 flex flex-col">
        <div className="text-center mb-7">
          <img
            src={logoBonjou}
            alt="Traduz Fácil"
            width={140}
            height={140}
            className="mx-auto mb-4 h-32 w-32 object-contain drop-shadow-xl animate-fade-in"
          />
          <h1
            className="text-4xl font-bold text-primary tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Traduz Fácil
          </h1>
          <p className="mt-2 text-sm italic text-foreground/70 max-w-xs mx-auto leading-relaxed">
            {t("onboarding.tagline")}
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-gradient-tropical text-primary-foreground p-4 shadow-card animate-fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-bold">{t("onboarding.welcomeTitle")}</h2>
          </div>
          <p className="text-[13px] leading-relaxed opacity-95">
            {t("onboarding.welcomeBody")}
          </p>
        </div>

        <p className="text-center text-sm font-medium text-foreground/80 mb-4">
          {t("onboarding.choose")}
        </p>


        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => onPick(l.code)}
              className="rounded-2xl bg-card border border-border shadow-card p-4 text-left hover:shadow-soft hover:border-primary/40 active:scale-[0.97] transition-all"
            >
              <div className="text-3xl mb-1.5">{l.flag}</div>
              <div className="font-semibold text-sm text-foreground leading-tight">
                {l.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {l.native}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Header -------------------- */

function Header({
  userLang,
  onChangeUserLang,
}: {
  userLang: Locale;
  onChangeUserLang: (c: Locale) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const lang = getLang(userLang);
  return (
    <header className="shrink-0 px-4 py-3 bg-gradient-tropical text-primary-foreground shadow-soft flex items-center justify-between gap-2 relative">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={logoBonjou}
          alt="Traduz Fácil"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl bg-white/95 p-1 shadow-soft object-contain"
        />
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="font-bold text-base tracking-tight whitespace-nowrap">Traduz Fácil</h1>
          <span className="text-[10px] opacity-85 italic truncate">{t("header.subtitle")}</span>
        </div>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition rounded-full px-3 py-1 text-sm font-medium"
        aria-label={t("header.yourLanguage")}
      >
        <span>{lang.flag}</span>
        <span className="text-xs">{lang.code}</span>
      </button>
      {open && (
        <div className="absolute right-3 top-14 z-50 bg-card border border-border rounded-2xl shadow-glow p-2 w-60 animate-fade-in">
          <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase">
            {t("header.yourLanguage")}
          </p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChangeUserLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-secondary ${
                l.code === userLang ? "bg-secondary font-semibold" : ""
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1 text-foreground">{l.name}</span>
              {l.code === userLang && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
            }}
            className="mt-1 w-full text-left text-sm px-2 py-2 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            {t("header.signOut")}
          </button>
        </div>
      )}
    </header>

  );
}

/* -------------------- Translator -------------------- */

function Translator({
  userLang,
  targetLang,
  onChangeTarget,
}: {
  userLang: Locale;
  targetLang: Locale;
  onChangeTarget: (c: Locale) => void;
}) {
  const { t } = useI18n();
  // direção: se reversed=false → traduz de userLang -> targetLang
  const [reversed, setReversed] = useState(false);
  const sourceLang = reversed ? targetLang : userLang;
  const destLang = reversed ? userLang : targetLang;

  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [imageTranslating, setImageTranslating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const recRef = useRef<any>(null);
  const realtimeTextRef = useRef("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modo conversa: detecta automaticamente o idioma falado, traduz e fala.
  const [autoMode, setAutoMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bonjou.autoMode") === "1";
  });
  const autoModeRef = useRef(autoMode);
  useEffect(() => {
    autoModeRef.current = autoMode;
    if (typeof window !== "undefined") {
      localStorage.setItem("bonjou.autoMode", autoMode ? "1" : "0");
    }
  }, [autoMode]);
  // Quando true, ao terminar a próxima tradução, fala em voz alta e reinicia o microfone.
  const pendingAutoSpeakRef = useRef(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    // VAD nativo do Scribe gerencia commits por silêncio.
    commitStrategy: CommitStrategy.VAD,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    onPartialTranscript: ({ text: partial }) => {
      setText(appendUniqueSpeech(realtimeTextRef.current, partial));
    },
    onCommittedTranscript: ({ text: committed }) => {
      const clean = (committed ?? "").trim();
      if (!clean) return;
      // Evita duplicar quando o serviço reenvia o mesmo trecho.
      const prev = normalizeSpeech(realtimeTextRef.current);
      const next = normalizeSpeech(clean);
      if (prev.endsWith(next)) {
        setText(realtimeTextRef.current);
        return;
      }
      realtimeTextRef.current = appendUniqueSpeech(realtimeTextRef.current, clean);
      setText(realtimeTextRef.current);
    },
    onConnect: () => {
      setTranscribing(false);
    },
    onError: (error) => {
      console.error("Realtime STT err", error);
      toast.error(t("toast.sttFailed"));
      setRecording(false);
      setTranscribing(false);
    },
    onDisconnect: () => {
      setRecording(false);
      setTranscribing(false);
    },
  });

  // tradução automática (debounced)
  useEffect(() => {
    if (!text.trim()) {
      setTranslation("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runTranslate(text);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sourceLang, destLang]);

  useEffect(() => {
    return () => {
      try { scribe.disconnect(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runTranslate = async (input: string) => {
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text: input, source: sourceLang, target: destLang },
      });
      if (error) throw error;
      const t = (data as any)?.translation ?? "";
      setTranslation(t);
      // Pré-carrega o áudio TTS para iniciar instantâneo ao clicar em ouvir.
      if (t) void prefetchTTS(t, destLang);
      // Gamificação: tradução concluída conta como atividade real (XP + idioma).
      if (t && input.trim()) recordActivity(3, langKeyOf(destLang));
      if (t && input.trim()) {
        saveHistory({
          id: crypto.randomUUID(),
          source: sourceLang,
          target: destLang,
          original: input.trim(),
          translation: t,
          ts: Date.now(),
        });
      }
      // Modo conversa: fala a tradução no idioma de destino e reabre o microfone.
      if (t && pendingAutoSpeakRef.current) {
        pendingAutoSpeakRef.current = false;
        const speakLocale = destLang;
        try {
          await speakWithElevenLabs(t, speakLocale);
        } catch (err) {
          console.warn("auto-speak failed", err);
        }
        // Reinicia escuta automaticamente se ainda estamos em auto e nada está em curso.
        if (autoModeRef.current && !recording && !transcribing) {
          setTimeout(() => {
            if (autoModeRef.current) void handleMic();
          }, 250);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("toast.translateError"));
    } finally {
      setTranslating(false);
    }
  };

  const swap = () => {
    setReversed((r) => !r);
    setText(translation);
    setTranslation(text);
  };

  /* -------- Voz -------- */
  const startBrowserSTT = (locale: Locale) => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new SR();
    rec.lang = locale;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    // Mantém apenas os trechos JÁ finalizados (evita duplicar "boa noite boa noite").
    let finalText = "";
    // Guarda o último trecho finalizado bruto para descartar repetições idênticas
    // que alguns navegadores emitem quando o usuário pausa entre frases iguais.
    let lastFinalChunk = "";

    rec.onresult = (ev: any) => {
      let interim = "";
      // Só percorre os resultados NOVOS (a partir do resultIndex), não tudo.
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const chunk = (result[0]?.transcript ?? "").trim();
        if (!chunk) continue;
        if (result.isFinal) {
          // Não acrescenta se for exatamente igual ao último final (eco do browser).
          if (chunk.toLowerCase() !== lastFinalChunk.toLowerCase()) {
            finalText = appendUniqueSpeech(finalText, chunk);
            lastFinalChunk = chunk;
          }
        } else {
          interim = appendUniqueSpeech(interim, chunk);
        }
      }
      setText(appendUniqueSpeech(finalText, interim));
    };
    rec.onerror = (e: any) => {
      console.error("STT err", e);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    return true;
  };

  const getRealtimeToken = async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;
    const auth = await authHeader();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ realtime: true }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.token) {
      throw new Error(data?.error || "Não consegui iniciar a escuta rápida.");
    }
    return data.token as string;
  };

  const startRealtimeSTT = async (locale: Locale) => {
    setTranscribing(true);
    realtimeTextRef.current = "";
    scribe.clearTranscripts();
    try {
      const token = await getRealtimeToken();
      await scribe.connect({
        token,
        languageCode: STT_LANGUAGE_CODE[locale],
      });
      // setTranscribing(false) acontece no onConnect quando o socket abre.
    } catch (e) {
      setTranscribing(false);
      throw e;
    }
  };

  // Mapeia ISO-639-1 detectado pelo Whisper → para qual lado do par
  // (userLang/targetLang) ele pertence. Retorna null se nenhum.
  const matchDetected = (iso: string | null | undefined): "user" | "target" | null => {
    if (!iso) return null;
    const u = userLang.split("-")[0];
    const t = targetLang.split("-")[0];
    if (iso === u) return "user";
    if (iso === t) return "target";
    return null;
  };

  const startServerSTT = async (locale: Locale, opts?: { auto?: boolean }) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const mr = new MediaRecorder(stream, { mimeType });
    mediaRef.current = mr;
    chunksRef.current = [];
    const startedAt = Date.now();
    const auto = !!opts?.auto;

    // VAD por Web Audio: auto-encerra após 1.6s de silêncio REAL (ignora respiração).
    // Só dispara depois de detectar ao menos 500ms de fala — evita parar em ruído.
    let vadCleanup: (() => void) | null = null;
    if (auto) {
      try {
        const AudioCtx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const SILENCE_RMS = 0.018;       // limiar de silêncio (≈ respiração)
        const SILENCE_MS = 1600;          // tempo de silêncio p/ encerrar
        const MIN_SPEECH_MS = 500;        // fala mínima antes de aceitar silêncio
        const MAX_DURATION_MS = 30000;    // proteção: nunca grava +30s seguidos
        let speechStartedAt = 0;
        let lastVoiceAt = 0;
        let stopped = false;
        const tick = () => {
          if (stopped || mr.state !== "recording") return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          const now = Date.now();
          if (rms > SILENCE_RMS) {
            if (!speechStartedAt) speechStartedAt = now;
            lastVoiceAt = now;
          }
          const speechMs = speechStartedAt ? now - speechStartedAt : 0;
          const silenceMs = lastVoiceAt ? now - lastVoiceAt : 0;
          const totalMs = now - startedAt;
          const shouldStop =
            (speechMs >= MIN_SPEECH_MS && silenceMs >= SILENCE_MS) ||
            totalMs >= MAX_DURATION_MS;
          if (shouldStop) {
            stopped = true;
            try { mr.stop(); } catch {}
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        vadCleanup = () => {
          stopped = true;
          try { source.disconnect(); } catch {}
          try { ctx.close(); } catch {}
        };
      } catch (e) {
        console.warn("VAD setup falhou; mic ficará aberto até stop manual", e);
      }
    }

    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = async () => {
      if (vadCleanup) vadCleanup();
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const tooShort = Date.now() - startedAt < 350;
      if (!blob.size || tooShort) {
        if (!auto) toast.error(t("toast.audioShort"));
        // Em modo auto, reabre escuta automaticamente quando áudio foi curto demais.
        if (auto && autoModeRef.current) {
          setTimeout(() => { if (autoModeRef.current) void handleMic(); }, 200);
        }
        return;
      }
      setTranscribing(true);
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      // Em modo auto, manda "auto" → Whisper detecta o idioma sozinho.
      fd.append("lang", auto ? "auto" : locale);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-whisper`;
        const auth = await authHeader();
        const resp = await fetch(url, {
          method: "POST",
          headers: { ...auth },
          body: fd,
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data?.text) {
          const said = cleanSpeech(String(data.text));
          if (!said) {
            if (auto && autoModeRef.current) {
              setTimeout(() => { if (autoModeRef.current) void handleMic(); }, 200);
            } else {
              toast.error(t("toast.audioFail"));
            }
            return;
          }
          if (auto) {
            // Decide a direção da tradução com base no idioma detectado.
            const detected = typeof data.language === "string" ? data.language.toLowerCase().slice(0, 2) : null;
            const side = matchDetected(detected);
            if (side === "user") {
              setReversed(false); // userLang → targetLang
            } else if (side === "target") {
              setReversed(true); // targetLang → userLang
            } else if (detected) {
              toast.message(`Idioma detectado (${detected}) não está no par. Traduzindo na direção atual.`);
            }
            pendingAutoSpeakRef.current = true;
          }
          setText(said);
        } else {
          toast.error(data?.error || t("toast.audioFail"));
        }
      } catch (e) {
        console.error("transcribe error", e);
        toast.error(t("toast.netError"));
      } finally {
        setTranscribing(false);
      }
    };
    mr.start(250);
  };

  const handleMic = async () => {
    if (recording) {
      // parar
      if (recRef.current) {
        try { recRef.current.stop(); } catch {}
        recRef.current = null;
      }
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
      if (scribe.isConnected) {
        try { scribe.disconnect(); } catch {}
      }
      setRecording(false);
      setTranscribing(false);
      return;
    }

    // Pré-checa permissão para dar mensagem clara antes de tentar gravar.
    const perm = await checkMicPermission();
    if (perm === "denied") {
      toast.error(micErrorMessage("denied"));
      return;
    }

    setRecording(true);
    setText("");
    setTranslation("");
    if (navigator.vibrate) navigator.vibrate(40);

    try {
      // Modo conversa: sempre usa Whisper com auto-detecção de idioma.
      if (autoModeRef.current) {
        await startServerSTT(sourceLang, { auto: true });
      } else if (FORCE_SERVER_STT.includes(sourceLang)) {
        // Crioulo usa gravação por arquivo: mais estável em celulares.
        await startServerSTT(sourceLang);
      } else if (!hasWebSpeech()) {
        await startRealtimeSTT(sourceLang);
      } else {
        const ok = startBrowserSTT(sourceLang);
        if (!ok) {
          await startRealtimeSTT(sourceLang);
        }
      }
    } catch (e) {
      console.error("mic start error", e);
      const kind = classifyMicError(e);
      toast.error(micErrorMessage(kind));
      setRecording(false);
      setTranscribing(false);
    }
  };

  const speak = (txt: string, locale: Locale) => {
    void speakWithElevenLabs(txt, locale);
  };

  const handleImagePick = async (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("toast.imageTooBig"));
      return;
    }
    setImageTranslating(true);
    setText("");
    setTranslation("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("translate-image", {
        body: {
          imageBase64: base64,
          mimeType: file.type || "image/jpeg",
          source: sourceLang,
          target: destLang,
        },
      });
      if (error) throw error;
      const original = (data as any)?.original ?? "";
      const translated = (data as any)?.translation ?? "";
      if (original) setText(original);
      if (translated) {
        setTranslation(translated);
        void prefetchTTS(translated, destLang);
        if (original) {
          saveHistory({
            id: crypto.randomUUID(),
            source: sourceLang,
            target: destLang,
            original,
            translation: translated,
            ts: Date.now(),
          });
        }
      } else {
        toast.error(t("toast.noTextInImage"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("toast.imageError"));
    } finally {
      setImageTranslating(false);
    }
  };

  const src = getLang(sourceLang);
  const dst = getLang(destLang);

  return (
    <div className="h-full flex flex-col px-4 pt-3 pb-2 overflow-hidden">
      {/* seletor de destino */}
      <div className="shrink-0 flex items-center justify-between gap-2 text-xs mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
          <span>{src.flag}</span>
          <span>{src.name}</span>
        </div>
        <span className="text-muted-foreground">→</span>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition"
        >
          <span>{dst.flag}</span>
          <span>{dst.name}</span>
        </button>
      </div>

      {/* área superior: texto original */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="flex-1 min-h-0 rounded-2xl bg-card border border-border shadow-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>{src.flag} {src.name}</span>
              {transcribing && (
                <span className="flex items-center gap-1 text-primary normal-case font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("tr.transcribing")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {text && !recording && !transcribing && (
                <button
                  onClick={() => setCorrecting(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold"
                  aria-label={t("tr.correct")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("tr.correct")}
                </button>
              )}
              {text && (
                <button
                  onClick={() => speak(text, sourceLang)}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                  aria-label={t("tr.listen")}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
              {text && (
                <button
                  onClick={() => {
                    setText("");
                    setTranslation("");
                  }}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                  aria-label={t("tr.clear")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              recording
                ? t("tr.listening")
                : transcribing
                  ? t("tr.converting")
                  : t("tr.typeHere")
            }
            className="flex-1 w-full px-3 py-2 bg-transparent resize-none outline-none text-base text-foreground placeholder:text-muted-foreground"
          />
          {(recording || transcribing) && <SoundWave />}
        </div>

        {/* botão swap */}
        <div className="shrink-0 flex justify-center -my-1.5 relative z-10">
          <button
            onClick={swap}
            className="h-10 w-10 rounded-full bg-card border border-border shadow-soft flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition active:scale-95"
            aria-label={t("tr.swap")}
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* área inferior: tradução */}
        <div className="flex-1 min-h-0 rounded-2xl bg-gradient-tropical text-primary-foreground shadow-glow flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/15">
            <div className="text-[11px] font-semibold uppercase tracking-wide opacity-90">
              {dst.flag} {dst.name}
            </div>
            <div className="flex items-center gap-1">
              {translating && <Loader2 className="h-4 w-4 animate-spin opacity-90" />}
              {translation && !translating && (
                <button
                  onClick={() => speak(translation, destLang)}
                  className="p-1.5 rounded-md hover:bg-white/20"
                  aria-label={t("tr.listen")}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 px-3 py-2 overflow-y-auto text-base leading-relaxed">
            {translation || (
              <span className="opacity-60">{t("tr.resultPlaceholder")}</span>
            )}
          </div>
        </div>
      </div>

      {/* toggle conversa automática + seletor de idioma de fala + microfone */}
      <div className="shrink-0 pt-3 pb-1 flex flex-col items-center gap-2">
        <button
          onClick={() => {
            if (recording || transcribing) return;
            setAutoMode((m) => !m);
          }}
          disabled={recording || transcribing}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition border ${
            autoMode
              ? "bg-primary text-primary-foreground border-primary shadow-soft"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          } ${recording || transcribing ? "opacity-60 cursor-not-allowed" : ""}`}
          aria-pressed={autoMode}
          title={t("tr.autoTitle")}
        >
          <Sparkles className="h-3 w-3" />
          {autoMode ? t("tr.autoOn") : t("tr.autoOff")}
        </button>
        {autoMode ? (
          <span className="text-[10px] text-muted-foreground text-center max-w-[260px]">
            {t("tr.autoHint", { a: getLang(userLang).name, b: getLang(targetLang).name })}
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("tr.iWillSpeak")}
            </span>
            <div className="inline-flex rounded-full bg-secondary p-1 gap-1">
              {[getLang(userLang), getLang(targetLang)].map((l) => {
                const active = sourceLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      if (recording || transcribing) return;
                      setReversed(l.code === targetLang);
                    }}
                    disabled={recording || transcribing}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground"
                    } ${recording || transcribing ? "opacity-60 cursor-not-allowed" : ""}`}
                    aria-pressed={active}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMic}
            className={`h-16 w-16 rounded-full flex items-center justify-center shadow-glow active:scale-95 transition-all ${
              recording
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            aria-label={recording ? t("tr.stop") : t("tr.speak")}
          >
            {recording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={imageTranslating || recording || transcribing}
            className="h-12 w-12 rounded-full flex items-center justify-center bg-card border border-border shadow-soft text-primary hover:bg-primary hover:text-primary-foreground transition active:scale-95 disabled:opacity-60"
            aria-label={t("tr.takePhoto")}
            title={t("tr.takePhotoTitle")}
          >
            <Camera className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageTranslating || recording || transcribing}
            className="h-12 w-12 rounded-full flex items-center justify-center bg-card border border-border shadow-soft text-primary hover:bg-primary hover:text-primary-foreground transition active:scale-95 disabled:opacity-60"
            aria-label={t("tr.translateImage")}
            title={t("tr.translateImageTitle")}
          >
            {imageTranslating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImagePick(f);
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImagePick(f);
              e.target.value = "";
            }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">
          {t("tr.footerHint")}
        </span>
      </div>

      {pickerOpen && (
        <TargetPicker
          current={destLang}
          exclude={sourceLang}
          onPick={(c) => {
            onChangeTarget(c);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {correcting && text.trim() && (
        <CorrectionScreen
          attempt={text.trim()}
          lang={sourceLang}
          langLabel={src.name}
          langFlag={src.flag}
          onClose={() => setCorrecting(false)}
        />
      )}
    </div>
  );
}

function SoundWave() {
  return (
    <div className="flex items-center justify-center gap-1 h-8 pb-2">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-primary"
          style={{
            height: `${10 + ((i * 7) % 18)}px`,
            animation: `typing-bounce 0.8s infinite`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function TargetPicker({
  current,
  exclude,
  onPick,
  onClose,
}: {
  current: Locale;
  exclude: Locale;
  onPick: (c: Locale) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-4 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">{t("tr.translateTo")}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.filter((l) => l.code !== exclude).map((l) => (
            <button
              key={l.code}
              onClick={() => onPick(l.code)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                l.code === current
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="text-2xl">{l.flag}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.native}</div>
              </div>
              {l.code === current && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- History -------------------- */

function saveHistory(item: HistoryItem) {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    const arr: HistoryItem[] = raw ? JSON.parse(raw) : [];
    // dedupe consecutivo
    if (arr[0]?.original === item.original && arr[0]?.translation === item.translation) {
      return;
    }
    arr.unshift(item);
    localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0, 100)));
  } catch {}
}

function HistoryView() {
  const { t } = useI18n();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const reload = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const clearAll = () => {
    localStorage.removeItem(LS_HISTORY);
    setItems([]);
    toast.success(t("hist.cleared"));
  };

  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    localStorage.setItem(LS_HISTORY, JSON.stringify(next));
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="font-bold text-foreground">{t("hist.title")}</h2>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive">
            <Trash2 className="h-4 w-4" /> {t("hist.clear")}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
            <History className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">{t("hist.empty")}</p>
          </div>
        ) : (
          items.map((it) => {
            const s = getLang(it.source);
            const d = getLang(it.target);
            return (
              <div
                key={it.id}
                className="rounded-2xl bg-card border border-border shadow-card p-3"
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">
                  <span>
                    {s.flag} {s.code} → {d.flag} {d.code}
                  </span>
                  <button
                    onClick={() => remove(it.id)}
                    className="p-1 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground italic line-clamp-2">
                  {it.original}
                </p>
                <p className="text-base font-medium text-foreground mt-1 line-clamp-3">
                  {it.translation}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------- Bottom nav -------------------- */

type TabKey = "home" | "translator" | "practice" | "lessons" | "flashcards" | "history" | "about" | "help" | "settings";

function BottomNav({
  tab,
  onChange,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}) {
  const { t } = useI18n();
  const Item = ({
    id,
    icon: Icon,
    label,
  }: {
    id: TabKey;
    icon: typeof Mic;
    label: string;
  }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => onChange(id)}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        <span className={`text-[9px] leading-tight text-center ${active ? "font-bold" : "font-medium"}`}>
          {label}
        </span>
      </button>
    );
  };
  return (
    <nav className="shrink-0 border-t border-border bg-card flex">
      <Item id="home" icon={Home} label={t("nav.home")} />
      <Item id="translator" icon={Languages} label={t("nav.translator")} />
      <Item id="practice" icon={GraduationCap} label={t("nav.practice")} />
      <Item id="history" icon={History} label={t("nav.history")} />
      <Item id="about" icon={Info} label={t("nav.about")} />
      <Item id="settings" icon={SettingsIcon} label={t("nav.settings")} />
      <Item id="help" icon={HelpCircle} label={t("nav.help")} />
    </nav>
  );
}

/* -------------------- Configurações (idioma + acessibilidade) -------------------- */

function SettingsView() {
  const { t, lang, setLang, fontScale, setFontScale } = useI18n();
  const FONT_LABELS: Record<FontScale, string> = {
    sm: t("set.font.sm"),
    md: t("set.font.md"),
    lg: t("set.font.lg"),
    xl: t("set.font.xl"),
  };
  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-foreground text-lg">{t("set.title")}</h2>
      </div>

      {/* Idioma do aplicativo */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("set.appLanguage")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("set.appLanguageHint")}</p>
        <div className="grid grid-cols-1 gap-2">
          {UI_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                l.code === lang
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="flex-1 font-semibold text-sm text-foreground">{l.native}</span>
              {l.code === lang && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* Tamanho da fonte */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("set.fontSize")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("set.fontSizeHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {FONT_SCALES.map((s) => (
            <button
              key={s}
              onClick={() => setFontScale(s)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-foreground transition ${
                s === fontScale
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span
                className={
                  s === "sm"
                    ? "text-xs"
                    : s === "md"
                      ? "text-sm"
                      : s === "lg"
                        ? "text-base"
                        : "text-lg"
                }
              >
                {FONT_LABELS[s]}
              </span>
              {s === fontScale && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-muted/40 border border-border p-3">
          <p className="text-foreground leading-relaxed">{t("set.preview")}</p>
        </div>
      </section>
    </div>
  );
}



/* -------------------- Sobre / Quem criou -------------------- */

const APP_VERSION = "1.0.0";

// Acordeão das informações legais — indicador ▶ (fechado) / ▼ (aberto),
// animação suave de abertura/fechamento e bom feedback de toque.
function LegalAccordion({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-foreground active:bg-muted hover:bg-muted/60 transition"
      >
        <span className="flex items-center gap-2">
          <span className="text-base leading-none" aria-hidden>{emoji}</span>
          {title}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0 space-y-2 text-foreground/80 text-[13px] leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}



function AboutView() {
  const { t } = useI18n();
  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <div className="text-center space-y-2 pt-2">
        <img
          src={logoBonjou}
          alt="Traduz Fácil"
          width={80}
          height={80}
          className="mx-auto h-20 w-20 rounded-2xl object-contain shadow-card"
        />
        <h2 className="font-bold text-foreground text-xl">Traduz Fácil</h2>
        <p className="text-xs text-muted-foreground">{t("about.version")} {APP_VERSION}</p>
      </div>

      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("about.aboutTitle")}</h3>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("about.aboutBody2")}
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("about.missionTitle")}</h3>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("about.missionBody")}
        </p>
        <ul className="text-sm text-foreground/80 list-disc pl-5 space-y-1 mt-2">
          <li>{t("about.missionBullet1")}</li>
          <li>{t("about.missionBullet2")}</li>
          <li>{t("about.missionBullet3")}</li>
          <li>{t("about.missionBullet4")}</li>
          <li>{t("about.missionBullet5")}</li>
        </ul>
        <p className="text-sm text-foreground/80 leading-relaxed mt-2">
          {t("about.objectiveBody")}
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("about.creatorTitle")}</h3>
        </div>
        <div>
          <p className="text-sm text-foreground font-semibold">{t("about.creatorName")}</p>
          <p className="text-xs text-muted-foreground">{t("about.creatorRole")}</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("about.creatorBio1")}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("about.creatorBio2")}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("about.creatorBio3")}
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("about.contactTitle")}</h3>
        </div>
        <p className="text-sm text-foreground/80">
          {t("about.contactBody")}
        </p>
        <a
          href="mailto:traduzfacil.app@gmail.com"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline break-all"
        >
          <Mail className="h-4 w-4 shrink-0" />
          traduzfacil.app@gmail.com
        </a>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3">
        <h3 className="font-bold text-sm text-foreground">{t("about.legalTitle")}</h3>

        {/* Bloco de confiança — antes das informações legais */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex gap-2.5">
          <span className="text-xl leading-none shrink-0" aria-hidden>🔒</span>
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold text-foreground">{t("about.dataSafeTitle")}</p>
            <p className="text-[12px] text-foreground/80 leading-relaxed">{t("about.dataSafeBody")}</p>
          </div>
        </div>

        {/* Política de Privacidade */}
        <LegalAccordion emoji="🔒" title={t("about.privacyLink")}>
          <p>{t("about.privacyIntro")}</p>
          <Link
            to="/privacidade"
            className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-primary hover:underline"
          >
            <Info className="h-4 w-4 shrink-0" />
            {t("about.readFullPolicy")}
          </Link>
        </LegalAccordion>

        {/* Resumo de Privacidade */}
        <LegalAccordion emoji="📄" title={t("about.privacySummaryTitle")}>
          <p>{t("about.privacySummary1")}</p>
          <p>{t("about.privacySummary2")}</p>
          <p>{t("about.privacySummary3")}</p>
          <p>{t("about.privacySummary4")}</p>
        </LegalAccordion>

        {/* Termos de Uso */}
        <LegalAccordion emoji="📋" title={t("about.termsTitle")}>
          <p>{t("about.terms1")}</p>
          <p>{t("about.terms2")}</p>
          <p>{t("about.terms3")}</p>
          <p>{t("about.terms4")}</p>
        </LegalAccordion>
      </section>

      <p className="text-center text-xs text-muted-foreground pt-2">
        {t("about.thanks")}
      </p>
    </div>
  );
}

/* -------------------- Tutorial visual internacional -------------------- */

// Tutorial silencioso (sem narração). Cada passo usa emojis universais para a
// demonstração visual e textos via i18n, acompanhando o idioma da interface.
const TUTORIAL_STEPS: { key: string; emoji: string; icon: React.ReactNode }[] = [
  { key: "step1", emoji: "👋", icon: <Sparkles className="h-5 w-5" /> },
  { key: "step2", emoji: "🌐", icon: <Languages className="h-5 w-5" /> },
  { key: "step3", emoji: "🎙️", icon: <Mic className="h-5 w-5" /> },
  { key: "step4", emoji: "⌨️", icon: <TypeIcon className="h-5 w-5" /> },
  { key: "step5", emoji: "📷", icon: <Camera className="h-5 w-5" /> },
  { key: "step6", emoji: "🔊", icon: <Volume2 className="h-5 w-5" /> },
  { key: "step7", emoji: "🎓", icon: <GraduationCap className="h-5 w-5" /> },
];

function VisualTutorial() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const total = TUTORIAL_STEPS.length;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setI((p) => (p + 1) % total), 4500);
    return () => clearTimeout(id);
  }, [i, playing, total]);

  const step = TUTORIAL_STEPS[i];
  const goTo = (n: number) => {
    setPlaying(false);
    setI((n + total) % total);
  };

  return (
    <div className="space-y-3">
      {/* Tela animada (silenciosa) */}
      <div className="relative w-full max-w-[280px] mx-auto aspect-[9/16] rounded-2xl bg-gradient-tropical text-primary-foreground shadow-glow overflow-hidden flex flex-col">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div key={i} className="flex-1 flex flex-col items-center justify-center text-center px-6 animate-fade-in">
          <div className="text-6xl mb-4 drop-shadow-lg">{step.emoji}</div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-90 mb-2">
            {step.icon}
            <span>{t("tut.step", { n: i + 1, total })}</span>
          </div>
          <h4 className="text-lg font-bold leading-tight">{t(`tut.${step.key}.title`)}</h4>
          <p className="text-sm opacity-95 leading-relaxed mt-2">{t(`tut.${step.key}.body`)}</p>
        </div>
        {/* Indicadores de progresso */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => goTo(idx)}
              aria-label={t("tut.step", { n: idx + 1, total })}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => goTo(i - 1)}
          className="rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm font-semibold active:scale-95 transition"
        >
          {t("tut.prev")}
        </button>
        <button
          onClick={() => {
            setPlaying(true);
            setI(0);
          }}
          className="rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm font-semibold active:scale-95 transition"
        >
          {t("tut.replay")}
        </button>
        <button
          onClick={() => goTo(i + 1)}
          className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-95 transition"
        >
          {t("tut.next")}
        </button>
      </div>
    </div>
  );
}

/* -------------------- Help / Microphone settings -------------------- */


function HelpView() {
  const { t } = useI18n();
  const [micStatus, setMicStatus] = useState<
    "idle" | "checking" | "granted" | "denied" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const testMic = async () => {
    setMicStatus("checking");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
      toast.success(t("toast.micOk"));
    } catch (e: any) {
      console.error("mic test", e);
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicStatus("denied");
        setErrorMsg(t("help.micDenied"));
      } else if (name === "NotFoundError") {
        setMicStatus("error");
        setErrorMsg(t("help.micNotFound"));
      } else {
        setMicStatus("error");
        setErrorMsg(e?.message || t("help.micGeneric"));
      }
    }
  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 space-y-4">
      <div>
        <h2 className="font-bold text-foreground text-lg">{t("help.title")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("help.subtitle")}
        </p>
      </div>

      {/* Tutorial visual internacional (silencioso, segue o idioma da interface) */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm text-foreground">{t("help.videoTitle")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("help.videoDesc")}
        </p>
        <VisualTutorial />
        <p className="text-[11px] text-muted-foreground">{t("help.videoNote")}</p>
      </section>



      <div className="rounded-2xl bg-card border border-border shadow-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-sm text-foreground">
              {t("help.testMic")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("help.testMicDesc")}
            </p>
          </div>
          <Button
            onClick={testMic}
            disabled={micStatus === "checking"}
            className="shrink-0"
          >
            {micStatus === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="ml-1.5">{t("help.test")}</span>
          </Button>
        </div>

        {micStatus === "granted" && (
          <div className="rounded-lg bg-primary/10 text-primary p-2.5 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {t("help.micGranted")}
          </div>
        )}
        {(micStatus === "denied" || micStatus === "error") && (
          <div className="rounded-lg bg-destructive/10 text-destructive p-2.5 text-sm">
            {errorMsg}
          </div>
        )}
      </div>

      {(isAndroid || isDesktop) && (
        <details open className="rounded-2xl bg-card border border-border shadow-card p-4">
          <summary className="font-semibold text-sm text-foreground cursor-pointer">
            {t("help.androidTitle")}
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-foreground/80 list-decimal pl-5">
            <li>{t("help.androidStep1")}</li>
            <li>{t("help.androidStep2")}</li>
            <li>{t("help.androidStep3")}</li>
            <li>{t("help.androidStep4")}</li>
          </ol>
        </details>
      )}

      {isIOS && (
        <details open className="rounded-2xl bg-card border border-border shadow-card p-4">
          <summary className="font-semibold text-sm text-foreground cursor-pointer">
            {t("help.iosTitle")}
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-foreground/80 list-decimal pl-5">
            <li>{t("help.iosStep1")}</li>
            <li>{t("help.iosStep2")}</li>
            <li>{t("help.iosStep3")}</li>
            <li>{t("help.iosStep4")}</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            {t("help.iosTip")}
          </p>
        </details>
      )}

      <details className="rounded-2xl bg-card border border-border shadow-card p-4">
        <summary className="font-semibold text-sm text-foreground cursor-pointer">
          {t("help.otherTitle")}
        </summary>
        <div className="mt-3 space-y-3 text-sm text-foreground/80">
          <div>
            <p className="font-semibold">{t("help.faqVoiceTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("help.faqVoiceBody")}
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("help.faqLangTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("help.faqLangBody")}
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("help.faqHistTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("help.faqHistBody")}
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function AuthGate() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center space-y-4">
        <img src={logoBonjou} alt="Traduz Fácil" className="h-20 w-auto mx-auto" />
        <h1 className="text-xl font-semibold">{t("auth.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.body")}
        </p>
        <Link
          to="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("auth.cta")}
        </Link>
      </div>
    </div>
  );
}

/* -------------------- Home dashboard -------------------- */

// Palavras do dia: cada item tem a forma em todos os idiomas + pronúncia.
// A palavra mostrada segue o idioma que o usuário está APRENDENDO e a
// tradução segue o idioma NATIVO do usuário.
type DailyWord = {
  pt: string; ht: string; fr: string; en: string; es: string;
  pron: Partial<Record<LangKey, string>>;
};
const DAILY_WORDS: DailyWord[] = [
  { pt: "Bom dia", ht: "Bonjou", fr: "Bonjour", en: "Good morning", es: "Buenos días", pron: { ht: "bon-JOU", fr: "bon-zhour", en: "good MOR-ning", es: "BUE-nos DI-as" } },
  { pt: "Muito obrigado", ht: "Mèsi anpil", fr: "Merci beaucoup", en: "Thank you very much", es: "Muchas gracias", pron: { ht: "mè-si an-PIL", fr: "mer-si bo-KOO", en: "thénk-iu ve-ri match", es: "MU-chas GRA-sias" } },
  { pt: "Como você está?", ht: "Kijan ou ye?", fr: "Comment ça va ?", en: "How are you?", es: "¿Cómo estás?", pron: { ht: "ki-JAN ou IÉ", fr: "ko-man sa va", en: "hau ar iú", es: "KO-mo es-TAS" } },
  { pt: "Por favor", ht: "Souple", fr: "S'il vous plaît", en: "Please", es: "Por favor", pron: { ht: "SOU-plé", fr: "sil vu PLÈ", en: "pliz", es: "por fa-VOR" } },
];

function localeForKey(key: LangKey): Locale {
  return localeOf(key) as Locale;
}

function flagForKey(key: LangKey): string {
  return UI_LANGUAGES.find((u) => u.code === key)?.flag ?? "🌐";
}

function getGreeting(t: (k: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t("greet.morning");
  if (h < 18) return t("greet.afternoon");
  return t("greet.evening");
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function HomeView({
  userLang,
  onGoTranslator,
  onGoPractice,
  onGoLessons,
  onGoFlashcards,
}: {
  userLang: Locale;
  onGoTranslator: () => void;
  onGoPractice: () => void;
  onGoLessons: () => void;
  onGoFlashcards: () => void;
}) {
  const { t } = useI18n(); // home-t-added
  // Palavra do dia: 100% dinâmica. O idioma estudado é selecionável; a palavra,
  // pronúncia, bandeira e áudio seguem o idioma estudado. A tradução segue o
  // idioma da interface (nativo).
  const nativeKey = nativeKeyFromLocale(userLang);
  const defaultStudyKey: LangKey = nativeKey === "pt" ? "ht" : "pt";
  const [wordLang, setWordLang] = useState<LangKey>(defaultStudyKey);
  const dw = DAILY_WORDS[dayOfYear() % DAILY_WORDS.length];
  const word = {
    word: dw[wordLang],
    pron: dw.pron[wordLang] ?? "",
    translation: dw[nativeKey],
    flag: flagForKey(wordLang),
    locale: localeForKey(wordLang),
  };
  const studyLangName = UI_LANGUAGES.find((u) => u.code === wordLang)?.native ?? wordLang;
  const [speaking, setSpeaking] = useState(false);

  // Progresso real do usuário (localStorage), atualizado ao vivo.
  const [prog, setProg] = useState(() => loadProgress());
  useEffect(() => {
    const update = () => setProg(loadProgress());
    window.addEventListener("tf-progress", update);
    return () => window.removeEventListener("tf-progress", update);
  }, []);

  const handleSpeak = async () => {
    setSpeaking(true);
    try {
      await speakWithElevenLabs(word.word, word.locale);
    } finally {
      setSpeaking(false);
    }
  };

  // Pré-carrega áudio da palavra do dia.
  useEffect(() => {
    void prefetchTTS(word.word, word.locale);
  }, [word.word, word.locale]);

  const achievements = computeAchievements(prog);
  const lvl = level(prog.xp);
  const lg = leagueOf(prog.xp);
  const lgPct = Math.round(leagueProgress(prog.xp) * 100);
  const goal = dailyGoal();
  const goalPct = Math.min(100, Math.round((prog.todayCount / goal) * 100));

  // Progresso por idioma derivado de atividades reais (byLang).
  // pct = teto suave de 60 atividades por idioma = 100%.
  const LANG_META: Record<string, { name: string; flag: string }> = {
    ht: { name: t("langname.ht"), flag: "🇭🇹" },
    pt: { name: t("langname.pt"), flag: "🇧🇷" },
    fr: { name: t("langname.fr"), flag: "🇫🇷" },
    en: { name: t("langname.en"), flag: "🇺🇸" },
    es: { name: t("langname.es"), flag: "🇪🇸" },
  };
  const langProgress = Object.entries(prog.byLang || {})
    .map(([code, count]) => ({
      code,
      name: LANG_META[code]?.name ?? code,
      flag: LANG_META[code]?.flag ?? "🌐",
      count,
      pct: Math.min(100, Math.round((count / 60) * 100)),
    }))
    .sort((a, b) => b.count - a.count);

  const content = [
    { icon: "📖", title: t("home.lessonOfDay"), sub: t("home.lessonsCompleted", { n: prog.lessonsDone.length }), onClick: onGoLessons },
    { icon: "🎙️", title: t("home.practiceTitle"), sub: t("home.practiceSub", { lang: studyLangName }), onClick: onGoPractice },
    { icon: "🃏", title: t("home.flashcardsTitle"), sub: t("home.cardsMastered", { n: prog.cardsMastered.length }), onClick: onGoFlashcards },
  ];


  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 space-y-4">
      {/* Saudação motivacional */}
      <section className="rounded-2xl bg-gradient-tropical text-primary-foreground p-5 shadow-card relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">{getGreeting(t)}</p>
        <h2 className="text-xl font-bold mt-1 leading-tight">
          {t("home.ready")}
        </h2>
        <p className="text-sm mt-2 leading-relaxed opacity-95">
          {t("home.readyBody")}
        </p>
        <div className="my-3 h-px bg-white/25" />
        <p className="text-xs italic opacity-90 leading-relaxed">
          {t("home.quote")}
          <br />
          <span className="font-semibold not-italic">— Ludwig Wittgenstein</span>
        </p>
      </section>

      {/* Palavra do dia */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.wordOfDay")}
          </span>
          <span className="text-2xl">{word.flag}</span>
        </div>
        {/* Seletor do idioma estudado (palavra do dia 100% dinâmica) */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-2 mb-1">
          {STUDY_LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => setWordLang(l.key)}
              className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                wordLang === l.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
              aria-label={UI_LANGUAGES.find((u) => u.code === l.key)?.native ?? l.label}
            >
              <span>{l.flag}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-primary leading-tight truncate">
              {word.word}
            </p>
            {word.pron && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">/{word.pron}/</p>
            )}
            {word.translation !== word.word && (
              <p className="text-sm text-foreground/80 mt-1">{word.translation}</p>
            )}
          </div>
          <button
            onClick={handleSpeak}
            disabled={speaking}
            className="shrink-0 h-12 w-12 rounded-full bg-gradient-tropical text-primary-foreground flex items-center justify-center shadow-card active:scale-95 transition disabled:opacity-60"
            aria-label={t("home.wordOfDayListen")}
          >
            {speaking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </section>


      {/* Nível, XP e Liga */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{lg.icon}</span>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{t("home.league", { name: t("league." + lg.id) })}</p>
              <p className="text-[11px] text-muted-foreground">{t("home.levelXp", { level: lvl.level, xp: prog.xp })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t("home.nextLevel")}</p>
            <p className="text-xs font-semibold text-foreground">{lvl.into}/{lvl.need} XP</p>
          </div>
        </div>
        {/* Barra de progresso do nível */}
        <div className="h-2 rounded-full bg-secondary overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-tropical rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.round((lvl.into / lvl.need) * 100))}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {lg.next === Infinity
            ? t("home.leagueMax")
            : t("home.towardNext", { n: lgPct })}
        </p>
      </section>

      {/* Sequências e meta diária (dados reais) */}
      <section>
        <h3 className="text-sm font-bold text-foreground mb-2 px-1">{t("home.streaks")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border shadow-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                {t("home.daysInRow")}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{prog.streak}</p>
            <p className="text-[11px] text-muted-foreground">{t("home.record", { n: prog.bestStreak })}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border shadow-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                {t("home.todayActivities")}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{prog.todayCount}</p>
            <p className="text-[11px] text-muted-foreground">{t("home.goal", { n: goal })}</p>
          </div>
        </div>
        {/* Barra da meta diária */}
        <div className="mt-3 rounded-2xl bg-card border border-border shadow-card p-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Target className="h-3.5 w-3.5 text-primary" /> {t("home.dailyGoal")}
            </span>
            <span className="font-semibold text-muted-foreground">{prog.todayCount}/{goal}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-tropical rounded-full transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          {goalPct >= 100 && (
            <p className="text-[11px] text-primary font-semibold mt-1">{t("home.goalDone")}</p>
          )}
        </div>
      </section>

      {/* Progresso por idioma (atividades reais) */}
      <section className="rounded-2xl bg-card border border-border shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{t("home.byLanguage")}</h3>
        </div>
        {langProgress.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("home.byLanguageEmpty")}
          </p>
        ) : (
          <div className="space-y-3">
            {langProgress.map((p) => (
              <div key={p.code}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">
                    <span className="mr-1">{p.flag}</span>
                    {p.name}
                  </span>
                  <span className="font-semibold text-muted-foreground">{t("home.activities", { n: p.count })}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-tropical rounded-full transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Conquistas */}
      <section>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{t("home.achievements")}</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`snap-start shrink-0 w-28 rounded-2xl bg-card border border-border shadow-card p-3 text-center ${
                a.unlocked ? "" : "opacity-40 grayscale"
              }`}
            >
              <div className="text-3xl mb-1">{a.icon}</div>
              <p className="text-[11px] font-semibold text-foreground leading-tight">
                {t("ach." + a.id + ".label")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Conteúdo */}
      <section>
        <div className="flex items-center gap-2 mb-2 px-1">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{t("home.content")}</h3>
        </div>
        <div className="space-y-2">
          {content.map((c) => (
            <button
              key={c.title}
              onClick={c.onClick}
              className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border shadow-card p-3 text-left hover:border-primary/40 active:scale-[0.99] transition"
            >
              <div className="text-2xl shrink-0">{c.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                <p className="text-xs text-muted-foreground truncate">{c.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* CTA tradutor */}
      <button
        onClick={onGoTranslator}
        className="w-full rounded-2xl bg-gradient-tropical text-primary-foreground py-3 font-bold shadow-card active:scale-[0.99] transition flex items-center justify-center gap-2"
      >
        <Languages className="h-5 w-5" />
        {t("home.openTranslator")}
      </button>
    </div>
  );
}
