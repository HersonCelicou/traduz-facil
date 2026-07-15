// Edge function: Text-to-Speech via ElevenLabs
// Otimizado para Crioulo Haitiano (ht) com voz humana premium + normalização fonética.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";
import { normalizeHaitianForTTS } from "../_shared/haitian-phonetics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Vozes multilíngues — uma voz adequada por idioma para soar nativo.
// Todas suportam eleven_multilingual_v2 e foram escolhidas pela naturalidade
// (entonação, ritmo, timbre) específica do idioma alvo.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — natural em PT/ES
const HAITIAN_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte — entonação suave, não-francesa
const VOICE_BY_LOCALE: Record<string, string> = {
  "ht": HAITIAN_VOICE_ID,
  "ht-HT": HAITIAN_VOICE_ID,
  "pt": "EXAVITQu4vr4xnSDxMaL",      // Sarah
  "pt-BR": "EXAVITQu4vr4xnSDxMaL",
  "fr": "XrExE9yKIg1WjnnlVkGX",      // Matilda — francesa nativa
  "fr-FR": "XrExE9yKIg1WjnnlVkGX",
  "en": "21m00Tcm4TlvDq8ikWAM",      // Rachel
  "en-US": "21m00Tcm4TlvDq8ikWAM",
  "es": "EXAVITQu4vr4xnSDxMaL",      // Sarah
  "es-ES": "EXAVITQu4vr4xnSDxMaL",
  "es-MX": "EXAVITQu4vr4xnSDxMaL",
  "es-AR": "EXAVITQu4vr4xnSDxMaL",
  "es-DO": "EXAVITQu4vr4xnSDxMaL",
  "es-CL": "EXAVITQu4vr4xnSDxMaL",
};

const LANG_CODE_MAP: Record<string, string> = {
  "ht": "ht", "ht-HT": "ht",
  "pt": "pt", "pt-BR": "pt",
  "fr": "fr", "fr-FR": "fr",
  "en": "en", "en-US": "en",
  "es": "es", "es-ES": "es", "es-MX": "es", "es-AR": "es", "es-DO": "es", "es-CL": "es",
};

function ttsFallbackResponse(reason = "SERVICE_UNAVAILABLE") {
  return new Response(
    JSON.stringify({
      error: "Não consegui gerar o áudio. Tente de novo.",
      fallback: true,
      reason,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const { text, voiceId, locale } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "text obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const langCode = locale ? LANG_CODE_MAP[locale] ?? null : null;
    const isHaitian = langCode === "ht";

    // Voz nativa por idioma. Se o cliente pediu uma voz específica conhecida, respeita;
    // caso contrário, escolhe automaticamente a melhor voz para o locale.
    const ALLOWED_VOICE_IDS = new Set<string>(Object.values(VOICE_BY_LOCALE));
    const fallback = (locale && VOICE_BY_LOCALE[locale]) || DEFAULT_VOICE_ID;
    const vid = typeof voiceId === "string" && ALLOWED_VOICE_IDS.has(voiceId) ? voiceId : fallback;

    // Sanitiza: remove emojis e símbolos que causam pronúncia errada
    // (especialmente em crioulo, onde podem virar leitura francesa).
    let sanitized = text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "")
      .replace(/[•●◆■□▪▫★☆※→←↑↓⇒⇐]/g, "")
      .replace(/[""„]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    // Para haitiano: aplica respelling fonético GLOBAL antes do TTS para
    // soar como nativo (corrige "ji" → /ʒi/, "mwen" → "mou-ain", evita
    // nasalização errada, adiciona micro-pausas naturais).
    if (isHaitian) {
      sanitized = normalizeHaitianForTTS(sanitized);
    }
    const trimmed = sanitized.slice(0, 1500);

    // Modelo fixo: eleven_multilingual_v2 (qualidade máxima, 29 idiomas incl. crioulo haitiano).
    // Nota: multilingual_v2 NÃO aceita language_code — o modelo detecta o idioma do texto.
    const model_id = "eleven_multilingual_v2";

    const body: Record<string, unknown> = {
      text: trimmed,
      model_id,
      voice_settings: {
        // Haitiano: stability baixa (mais expressivo/humano), style alto
        // (entonação real), speaker_boost para clareza, speed levemente reduzida.
        stability: isHaitian ? 0.40 : 0.5,
        similarity_boost: isHaitian ? 0.85 : 0.8,
        style: isHaitian ? 0.55 : 0.35,
        use_speaker_boost: true,
        speed: isHaitian ? 0.92 : 1.0,
      },
    };

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("ElevenLabs TTS error", resp.status, errText);
      return ttsFallbackResponse(`ELEVENLABS_${resp.status}`);
    }

    const buf = await resp.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("tts fatal", e);
    return ttsFallbackResponse("SERVICE_FAILED");
  }
});
