// OpenAI Whisper STT — superior para crioulo haitiano (ht) e idiomas com sotaque.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Whisper usa códigos ISO-639-1 (2 letras). "ht" = Haitian Creole.
const LANG_MAP: Record<string, string> = {
  "ht-HT": "ht",
  "pt-BR": "pt",
  "fr-FR": "fr",
  "en-US": "en",
  "es-ES": "es",
  "es-MX": "es",
  "es-AR": "es",
  "es-DO": "es",
  "es-CL": "es",
};

// ElevenLabs Scribe v2 usa ISO 639-3 (3 letras).
const ELEVEN_LANG_MAP: Record<string, string> = {
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

// Prompt de contexto para reforçar idioma e estilo (especialmente útil em crioulo).
const PROMPT_HINTS: Record<string, string> = {
  ht: "Sa a se yon konvèsasyon nan kreyòl ayisyen. Itilize òtograf ofisyèl ayisyen.",
  pt: "Esta é uma conversa em português do Brasil.",
  fr: "Ceci est une conversation en français.",
  en: "This is an English conversation.",
  es: "Esta es una conversación en español.",
};

async function transcribeWithElevenLabs(audio: Blob, lang: string) {
  const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!elevenKey) return null;
  const apiForm = new FormData();
  apiForm.append("file", audio, "audio.webm");
  apiForm.append("model_id", "scribe_v2");
  apiForm.append("language_code", ELEVEN_LANG_MAP[lang] ?? "eng");
  apiForm.append("tag_audio_events", "false");
  apiForm.append("diarize", "false");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": elevenKey },
    body: apiForm,
  });
  if (!r.ok) {
    console.error("ElevenLabs STT fallback error:", r.status, await r.text());
    return null;
  }
  const d = await r.json();
  return String(d.text ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const openaiUsable = !!apiKey && /^sk-/.test(apiKey);

    const inForm = await req.formData();
    const audio = inForm.get("audio") as Blob | null;
    const lang = (inForm.get("lang") as string) || "ht-HT";

    if (!audio || typeof (audio as Blob).arrayBuffer !== "function") {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' file in form data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // "auto" = detecção automática (Whisper identifica sozinho).
    // Útil para modo conversa, onde dois falantes alternam idiomas.
    const isAuto = lang === "auto";
    const isHaitian = !isAuto && (lang === "ht-HT" || lang.toLowerCase().startsWith("ht"));
    const langCode = isAuto ? null : (isHaitian ? "ht" : (LANG_MAP[lang] ?? "en"));

    // PRIMÁRIO: OpenAI Whisper. Em modo auto, omite "language" para deixar
    // o modelo detectar (retorna o ISO-639-1 detectado em response.language).
    if (openaiUsable) {
      const apiForm = new FormData();
      apiForm.append("file", audio, "audio.webm");
      apiForm.append("model", "whisper-1");
      if (langCode) apiForm.append("language", langCode);
      apiForm.append("response_format", "json");
      apiForm.append("temperature", "0");
      if (langCode && PROMPT_HINTS[langCode]) apiForm.append("prompt", PROMPT_HINTS[langCode]);

      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: apiForm,
      });

      if (resp.ok) {
        const data = await resp.json();
        // Whisper retorna language em ISO-639-1 ("portuguese","haitian creole" varia
        // por versão; whisper-1 retorna o código curto em response.language como "pt").
        const detected = typeof data.language === "string" ? data.language.toLowerCase().slice(0, 2) : (langCode ?? null);
        return new Response(
          JSON.stringify({ text: data.text ?? "", language: detected }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.warn("Whisper STT falhou:", resp.status, await resp.text());
    }

    // FALLBACK: ElevenLabs Scribe v2 (caso Whisper falhe ou sem chave OpenAI).
    const t = await transcribeWithElevenLabs(audio, lang);
    if (t !== null) {
      return new Response(
        JSON.stringify({ text: t, language: langCode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Não consegui processar o áudio. Tente de novo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transcribe-whisper error:", e);
    return new Response(
      JSON.stringify({ error: "Não consegui processar o áudio. Tente de novo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
