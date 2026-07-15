// TTS realista.
// Para a maioria dos idiomas: ElevenLabs multilingual_v2 (voz humana) → OpenAI tts-1 → browser.
// Para CRIOULO HAITIANO (ht): OpenAI tts-1 PRIMEIRO. ElevenLabs lê crioulo como francês
// silabado/robotizado porque multilingual_v2 não tem suporte nativo a ht — o tts-1 da OpenAI
// lê foneticamente, o que é muito mais próximo da pronúncia haitiana real.
import { authHeader } from "./auth-headers";

let currentTtsAudio: HTMLAudioElement | null = null;

// Cache em memória (texto+locale → blob URL) para tocar frases repetidas
// instantaneamente, sem nova chamada ao TTS.
const ttsCache = new Map<string, string>();
const TTS_CACHE_MAX = 30;
const cacheKey = (text: string, locale: string) => `${locale}::${text}`;
function rememberBlob(key: string, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  ttsCache.set(key, url);
  if (ttsCache.size > TTS_CACHE_MAX) {
    const oldest = ttsCache.keys().next().value as string | undefined;
    if (oldest) {
      const old = ttsCache.get(oldest);
      if (old) URL.revokeObjectURL(old);
      ttsCache.delete(oldest);
    }
  }
  return url;
}

async function tryProvider(path: string, body: unknown): Promise<Blob | null> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
    const auth = await authHeader();
    const resp = await fetch(url, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.warn(`TTS ${path} ${resp.status}`);
      return null;
    }
    const contentType = resp.headers.get("Content-Type") || "";
    if (!contentType.includes("audio/")) {
      const payload = await resp.json().catch(() => null);
      if (payload?.fallback) console.warn(`TTS ${path} fallback`, payload.reason || payload.error);
      return null;
    }
    return await resp.blob();
  } catch (e) {
    console.warn(`TTS ${path} fail`, e);
    return null;
  }
}

/**
 * Limpa texto para evitar leitura letra-por-letra ou silabada:
 * - normaliza encoding (NFC) para evitar quebras de UTF-8
 * - remove caracteres invisíveis e símbolos quebrados
 * - colapsa sequências de letras isoladas separadas por espaço (ex.: "B O N" → "BON")
 * - remove pontuação redundante e espaços antes de pontuação
 */
function cleanForSpeech(raw: string): string {
  let t = (raw || "").normalize("NFC");
  // Remove zero-width, BOM, control chars
  t = t.replace(/[\u200B-\u200F\uFEFF\u202A-\u202E]/g, "");
  // Remove replacement char (encoding quebrado)
  t = t.replace(/\uFFFD/g, "");
  // Remove emojis e pictogramas
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "");
  // Símbolos decorativos
  t = t.replace(/[•●◆■□▪▫★☆※→←↑↓⇒⇐]/g, "");
  // Normaliza aspas/traços
  t = t.replace(/[""„]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, "-");
  // Colapsa sequências de letras isoladas: "B O N J O U" → "BONJOU"
  // Aplica até 3 vezes para pegar sequências longas.
  for (let i = 0; i < 3; i++) {
    t = t.replace(/\b([A-Za-zÀ-ÿ])(?:\s+([A-Za-zÀ-ÿ])){2,}\b/g, (m) =>
      m.replace(/\s+/g, ""),
    );
  }
  // Remove pontos isolados repetidos: "a . b . c" não-natural
  t = t.replace(/\s+([,.;:!?])/g, "$1");
  // Colapsa espaços
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export async function speakWithElevenLabs(
  text: string,
  locale: string,
  opts?: { slow?: boolean },
): Promise<void> {
  if (!text || typeof window === "undefined") return;

  // Cancela áudio anterior
  if (currentTtsAudio) {
    try { currentTtsAudio.pause(); } catch {}
    currentTtsAudio = null;
  }
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }

  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;

  const isHaitian = locale?.toLowerCase().startsWith("ht");
  const slow = !!opts?.slow;
  const key = cacheKey(cleaned, locale + (slow ? ":slow" : ""));

  // Cache hit → toca instantaneamente, zero latência.
  const cached = ttsCache.get(key);
  if (cached) {
    await playUrl(cached);
    return;
  }

  // Cadeia: Haitiano → OpenAI tts-1 (rápido) → ElevenLabs → browser.
  //         Outros → ElevenLabs → OpenAI → browser.
  // Modo lento (ouvir devagar): sempre OpenAI com velocidade reduzida,
  // que pronuncia bem em qualquer idioma para treino de escuta.
  let blob: Blob | null = null;

  // Crioulo: ritmo conversacional (0.96) — fluido e natural, com melhor
  // ligação entre palavras (liaison), sem soar arrastado/robótico. Modo
  // "ouvir devagar" usa 0.7 para treino de escuta.
  const haitianSpeed = slow ? 0.7 : 0.96;

  // Voz: "alloy" para crioulo (neutra, sem estilização — carrega melhor o
  // respelling fonético + as instruções de sotaque nativo). "shimmer" demais.
  const haitianVoice = "alloy";

  if (slow) {
    blob = await tryProvider("tts-openai", {
      text: cleaned,
      locale,
      voice: isHaitian ? haitianVoice : "shimmer",
      speed: isHaitian ? haitianSpeed : 0.72,
    });
    if (!blob && !isHaitian) blob = await tryProvider("tts", { text: cleaned, locale });
  } else if (isHaitian) {
    blob = await tryProvider("tts-openai", {
      text: cleaned,
      locale,
      voice: haitianVoice,
      speed: haitianSpeed,
    });
    if (!blob) blob = await tryProvider("tts", { text: cleaned, locale });
  } else {
    // OpenAI primeiro (ElevenLabs free tier está bloqueado → retornava 502).
    blob = await tryProvider("tts-openai", {
      text: cleaned,
      locale,
      voice: "shimmer",
      speed: 1.0,
    });
    if (!blob) blob = await tryProvider("tts", { text: cleaned, locale });
  }

  // Fallback final: voz do navegador (NUNCA usa voz francesa para ht).
  if (!blob) {
    if ("speechSynthesis" in window) {
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(cleaned);
        // Para haitiano, força ht-HT e evita qualquer voz que comece com "fr".
        if (isHaitian) {
          u.lang = "ht-HT";
          const voices = window.speechSynthesis.getVoices();
          const safe = voices.find(
            (v) => !v.lang.toLowerCase().startsWith("fr"),
          );
          if (safe) u.voice = safe;
        } else {
          u.lang = locale;
        }
        u.rate = isHaitian ? 0.92 : 1.0;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
    }
    return;
  }

  const audioUrl = rememberBlob(key, blob);
  await playUrl(audioUrl);
}

async function playUrl(audioUrl: string): Promise<void> {
  const audio = new Audio(audioUrl);
  audio.preload = "auto";
  currentTtsAudio = audio;
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch((e) => {
      console.warn("audio.play falhou", e);
      resolve();
    });
  });
}

/**
 * Pré-gera o áudio TTS e armazena em cache, SEM tocar.
 * Chame logo após a tradução chegar para que o "ouvir" toque sem delay.
 */
export async function prefetchTTS(text: string, locale: string): Promise<void> {
  if (!text || typeof window === "undefined") return;
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;
  const key = cacheKey(cleaned, locale);
  if (ttsCache.has(key)) return;
  const isHaitian = locale?.toLowerCase().startsWith("ht");
  let blob: Blob | null = null;
  if (isHaitian) {
    blob = await tryProvider("tts-openai", { text: cleaned, locale, voice: "alloy", speed: 0.96 });
    if (!blob) blob = await tryProvider("tts", { text: cleaned, locale });

  } else {
    blob = await tryProvider("tts-openai", { text: cleaned, locale, voice: "shimmer", speed: 1.0 });
    if (!blob) blob = await tryProvider("tts", { text: cleaned, locale });
  }
  if (blob) rememberBlob(key, blob);
}
