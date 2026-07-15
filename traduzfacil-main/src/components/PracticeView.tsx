import { useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Volume2, RotateCcw, ArrowRight, GraduationCap, Check, Keyboard, Snail } from "lucide-react";
import { toast } from "sonner";
import { speakWithElevenLabs } from "@/lib/tts";
import { recordActivity } from "@/lib/progress";
import { STUDY_LANGS, localeOf, type LangKey } from "@/lib/learn-content";
import { useI18n, UI_LANGUAGES } from "@/lib/i18n";
import {
  classifyMicError,
  micErrorMessage,
  requestMicStream,
} from "@/lib/mic";

// Nome nativo do idioma (localizado) para os botões de seleção.
function nativeLabel(key: LangKey, fallback: string): string {
  return UI_LANGUAGES.find((u) => u.code === key)?.native ?? fallback;
}

type Locale =
  | "pt-BR" | "fr-FR" | "ht-HT" | "en-US"
  | "es-ES" | "es-MX" | "es-AR" | "es-DO" | "es-CL";

type NativeKey = "ht" | "fr" | "en" | "es" | "pt";

function nativeKeyOf(l: Locale): NativeKey {
  if (l.startsWith("ht")) return "ht";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

type Phrase = {
  pt: string;
  hint: Partial<Record<NativeKey, string>>;
};

// Frases curtas e úteis no dia a dia no Brasil. Crescem em dificuldade.
const PHRASES: Phrase[] = [
  { pt: "Bom dia, tudo bem?", hint: { ht: "Bonjou, kijan ou ye?", fr: "Bonjour, ça va ?", en: "Good morning, how are you?", es: "Buenos días, ¿cómo estás?" } },
  { pt: "Muito obrigado pela ajuda.", hint: { ht: "Mèsi anpil pou èd la.", fr: "Merci beaucoup pour l'aide.", en: "Thank you very much for the help.", es: "Muchas gracias por la ayuda." } },
  { pt: "Por favor, fale mais devagar.", hint: { ht: "Tanpri, pale pi dousman.", fr: "S'il vous plaît, parlez plus lentement.", en: "Please speak more slowly.", es: "Por favor, hable más despacio." } },
  { pt: "Onde fica o ponto de ônibus?", hint: { ht: "Ki kote estasyon bis la ye?", fr: "Où est l'arrêt de bus ?", en: "Where is the bus stop?", es: "¿Dónde está la parada de autobús?" } },
  { pt: "Quanto custa esse pão?", hint: { ht: "Konbyen pen sa a koute?", fr: "Combien coûte ce pain ?", en: "How much is this bread?", es: "¿Cuánto cuesta este pan?" } },
  { pt: "Eu preciso ir ao médico.", hint: { ht: "Mwen bezwen ale kay doktè.", fr: "J'ai besoin d'aller chez le médecin.", en: "I need to go to the doctor.", es: "Necesito ir al médico." } },
  { pt: "Estou aprendendo português.", hint: { ht: "M ap aprann pòtigè.", fr: "J'apprends le portugais.", en: "I am learning Portuguese.", es: "Estoy aprendiendo portugués." } },
  { pt: "Pode repetir, por favor?", hint: { ht: "Èske ou ka repete, tanpri?", fr: "Pouvez-vous répéter, s'il vous plaît ?", en: "Can you repeat, please?", es: "¿Puede repetir, por favor?" } },
  { pt: "Hoje vou trabalhar de manhã.", hint: { ht: "Jodi a m ap travay nan maten.", fr: "Aujourd'hui je travaille le matin.", en: "Today I will work in the morning.", es: "Hoy voy a trabajar por la mañana." } },
  { pt: "Eu moro no Brasil há um ano.", hint: { ht: "M ap viv nan Brezil depi yon ane.", fr: "Je vis au Brésil depuis un an.", en: "I have lived in Brazil for one year.", es: "Vivo en Brasil desde hace un año." } },
];

function tokenize(s: string): string[] {
  return s
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function normalizeWord(w: string) {
  return w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[] = Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function similar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  // tolera 1 erro em palavras curtas, ~25% em longas
  return dist <= Math.max(1, Math.floor(maxLen * 0.25));
}

type WordResult = { word: string; status: "ok" | "close" | "wrong" };

function diffWords(expectedRaw: string[], spokenRaw: string[]): WordResult[] {
  const e = expectedRaw.map(normalizeWord);
  const s = spokenRaw.map(normalizeWord);
  const m = e.length, n = s.length;
  // LCS DP (igualdade exata normalizada)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = e[i] === s[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: WordResult[] = [];
  let i = 0, j = 0;
  while (i < m) {
    if (j < n && e[i] === s[j]) {
      out.push({ word: expectedRaw[i], status: "ok" });
      i++; j++;
    } else if (j < n && dp[i + 1][j] >= dp[i][j + 1]) {
      // palavra extra na fala — ignora
      j++;
    } else {
      // procura match aproximado nas próximas 3 palavras faladas
      let close = false;
      for (let k = j; k < Math.min(n, j + 3); k++) {
        if (similar(e[i], s[k])) { close = true; j = k + 1; break; }
      }
      out.push({ word: expectedRaw[i], status: close ? "close" : "wrong" });
      i++;
    }
  }
  return out;
}

export function PracticeView({ userLang }: { userLang: Locale }) {
  const { t } = useI18n();
  const native = nativeKeyOf(userLang);
  // Idioma de treino: PT estuda crioulo; demais estudam português.
  const [studyKey, setStudyKey] = useState<LangKey>(native === "pt" ? "ht" : "pt");
  const studyLocale = localeOf(studyKey);
  // Todos os 5 idiomas ficam disponíveis para treino (inclusive Português),
  // garantindo paridade de recursos entre todos os idiomas.
  const studyOpts = STUDY_LANGS;
  const [idx, setIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [spoken, setSpoken] = useState<string>("");
  const [result, setResult] = useState<WordResult[] | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const phrase = PHRASES[idx];
  // Texto-alvo no idioma de estudo (frase a ser lida em voz alta).
  const target = studyKey === "pt" ? phrase.pt : (phrase.hint[studyKey] ?? phrase.pt);
  // Significado mostrado no idioma nativo do usuário.
  const meaning = native === "pt" ? phrase.pt : (phrase.hint[native] ?? phrase.pt);
  const hint = meaning !== target ? meaning : undefined;

  const expectedTokens = useMemo(() => tokenize(target), [target]);

  const score = useMemo(() => {
    if (!result || result.length === 0) return null;
    const ok = result.filter((r) => r.status === "ok").length;
    const close = result.filter((r) => r.status === "close").length;
    return Math.round(((ok + close * 0.5) / result.length) * 100);
  }, [result]);

  const playPhrase = (slow = false) => {
    void speakWithElevenLabs(target, studyLocale, { slow });
  };


  const next = () => {
    setIdx((i) => (i + 1) % PHRASES.length);
    setSpoken("");
    setResult(null);
  };

  const reset = () => {
    setSpoken("");
    setResult(null);
  };

  const stopAndTranscribe = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  };

  const submitManual = () => {
    const said = manualText.trim();
    if (!said) return;
    setSpoken(said);
    setResult(diffWords(expectedTokens, tokenize(said)));
    recordActivity(3);
    setManualText("");
  };

  const startRecording = async () => {
    setSpoken("");
    setResult(null);
    // CRÍTICO: chama getUserMedia SEM await antes para preservar o
    // gesto do usuário (iOS Safari/WebView exigem isso, senão o prompt
    // nunca aparece e a gravação falha silenciosamente).
    const streamPromise = requestMicStream();
    let stream: MediaStream;
    try {
      stream = await streamPromise;
    } catch (e) {
      console.error("getUserMedia error", e);
      const kind = classifyMicError(e);
      toast.error(micErrorMessage(kind));
      setManualMode(true);
      setRecording(false);
      return;
    }
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRef.current = mr;
      chunksRef.current = [];
      const startedAt = Date.now();
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const tooShort = Date.now() - startedAt < 350;
        if (!blob.size || tooShort) {
          toast.error(t("toast.audioShort"));
          return;
        }
        setTranscribing(true);
        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        fd.append("lang", studyLocale);
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-whisper`;
          const { authHeader } = await import("@/lib/auth-headers");
          const auth = await authHeader();
          const resp = await fetch(url, {
            method: "POST",
            headers: { ...auth },
            body: fd,
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data?.text) {
            const said = String(data.text).trim();
            if (!said) {
              toast.error(t("toast.audioFail"));
              setManualMode(true);
              return;
            }
            setSpoken(said);
            setResult(diffWords(expectedTokens, tokenize(said)));
            recordActivity(4);
          } else {
            toast.error(data?.error || t("toast.audioFail"));
            setManualMode(true);
          }
        } catch (e) {
          console.error("transcribe error", e);
          toast.error(t("toast.netError"));
        } finally {
          setTranscribing(false);
        }
      };
      mr.start(250);
      setRecording(true);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (e) {
      console.error("MediaRecorder error", e);
      stream.getTracks().forEach((t) => t.stop());
      toast.error(t("toast.audioFail"));
      setManualMode(true);
      setRecording(false);
    }
  };

  const handleMic = () => {
    if (recording) stopAndTranscribe();
    else void startRecording();
  };

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-lg leading-tight">{t("practice.title")}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t("practice.subtitle")}
          </p>
        </div>
      </div>

      {/* Seletor de idioma de treino */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {studyOpts.map((l) => (
          <button
            key={l.key}
            onClick={() => { setStudyKey(l.key); setIdx(0); setSpoken(""); setResult(null); }}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
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

      {/* Frase alvo */}
      <div className="rounded-2xl bg-gradient-tropical text-primary-foreground shadow-glow p-4">
        <div className="flex items-center justify-between text-[11px] uppercase font-semibold opacity-90 mb-2">
          <span>{STUDY_LANGS.find((l) => l.key === studyKey)?.flag} {t("practice.phrase", { n: idx + 1, total: PHRASES.length })}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => playPhrase(false)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-full px-2 py-1"
              aria-label={t("practice.listen")}
            >
              <Volume2 className="h-3.5 w-3.5" />
              {t("practice.listen")}
            </button>
            <button
              onClick={() => playPhrase(true)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-full px-2 py-1"
              aria-label={t("practice.slow")}
            >
              <Snail className="h-3.5 w-3.5" />
              {t("practice.slow")}
            </button>
          </div>
        </div>
        <p className="text-xl font-bold leading-snug">{target}</p>
        {hint && (
          <p className="mt-2 text-sm italic opacity-90">↳ {hint}</p>
        )}
      </div>

      {/* Resultado palavra por palavra */}
      <div className="rounded-2xl bg-card border border-border shadow-card p-4 min-h-[120px]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase font-semibold text-muted-foreground">
            {t("practice.yourAttempt")}
          </p>
          {score !== null && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                score >= 80
                  ? "bg-primary/15 text-primary"
                  : score >= 50
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-destructive/15 text-destructive"
              }`}
            >
              {t("practice.scoreRight", { n: score })}
            </span>
          )}
        </div>

        {transcribing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("practice.analyzing")}
          </div>
        ) : result ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {result.map((r, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-md text-sm font-medium ${
                    r.status === "ok"
                      ? "bg-primary/15 text-primary"
                      : r.status === "close"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 line-through decoration-amber-500/40"
                        : "bg-destructive/15 text-destructive line-through"
                  }`}
                >
                  {r.word}
                </span>
              ))}
            </div>
            {spoken && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold">{t("practice.youSaid")}</span>{" "}
                <span className="italic">{spoken}</span>
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> {t("practice.legendCorrect")}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {t("practice.legendClose")}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> {t("practice.legendWrong")}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("practice.tapMic")}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <button
          onClick={handleMic}
          disabled={transcribing}
          className={`h-16 w-16 rounded-full flex items-center justify-center shadow-glow active:scale-95 transition-all ${
            recording
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          }`}
          aria-label={recording ? t("practice.listening") : t("practice.tapRepeat")}
        >
          {recording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {recording
            ? t("practice.listening")
            : transcribing
              ? t("practice.wait")
              : t("practice.tapRepeat")}
        </p>


        <button
          onClick={() => setManualMode((m) => !m)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <Keyboard className="h-3.5 w-3.5" />
          {manualMode ? t("practice.backToMic") : t("practice.typeAnswer")}
        </button>

        {manualMode && (
          <div className="w-full max-w-sm flex flex-col gap-2 pt-1">
            <input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }}
              placeholder={t("practice.typePlaceholder")}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={submitManual}
              disabled={!manualText.trim()}
              className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 disabled:opacity-50"
            >
              {t("practice.checkAnswer")}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={reset}
            disabled={recording || transcribing || (!result && !spoken)}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("practice.tryAgain")}
          </button>
          <button
            onClick={next}
            disabled={recording || transcribing}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            {score !== null && score >= 80 ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            {t("practice.nextPhrase")}
          </button>
        </div>
      </div>
    </div>
  );
}
