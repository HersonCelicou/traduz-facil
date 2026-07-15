// OpenAI Text-to-Speech (tts-1) — voz natural, ótima pronúncia em crioulo haitiano.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";
import { normalizeHaitianForTTS } from "../_shared/haitian-phonetics.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ttsFallbackResponse(reason = "SERVICE_UNAVAILABLE") {
  return new Response(
    JSON.stringify({
      error: "Não consegui gerar o áudio. Tente de novo.",
      fallback: true,
      reason,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("OPENAI_API_KEY não configurada");
      return ttsFallbackResponse("OPENAI_KEY_MISSING");
    }
    if (!/^sk-/.test(apiKey)) {
      console.error(`OPENAI_API_KEY com formato inválido (prefixo: ${apiKey.slice(0, 3)}). Esperado "sk-".`);
      return ttsFallbackResponse("OPENAI_KEY_INVALID");
    }

    const { text, voice, locale, speed } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vozes disponíveis: alloy, echo, fable, onyx, nova, shimmer
    const ALLOWED_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const requested = typeof voice === "string" ? voice : "shimmer";
    const v = ALLOWED_VOICES.includes(requested) ? requested : "shimmer";

    // Sanitiza: remove emojis, símbolos estranhos e caracteres não-falados
    // que confundem o TTS (especialmente em crioulo, onde podem virar pronúncia francesa).
    const isHaitian = (locale as string)?.toLowerCase().startsWith("ht");

    let sanitized = text
      // Remove emojis e pictogramas
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "")
      // Remove símbolos diversos
      .replace(/[•●◆■□▪▫★☆※→←↑↓⇒⇐]/g, "")
      // Normaliza aspas/traços tipográficos
      .replace(/[""„]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, ", ")
      // Colapsa espaços
      .replace(/\s+/g, " ")
      .trim();

    // Refinamento GLOBAL de pronúncia para crioulo haitiano: aplica
    // respelling fonético baseado em ortografia francesa (que cobre ~90%
    // dos sons haitianos) + micro-pausas naturais. Funciona automaticamente
    // em QUALQUER frase futura, sem precisar de correções caso a caso.
    if (isHaitian) {
      sanitized = normalizeHaitianForTTS(sanitized);
    }

    const trimmed = sanitized.slice(0, 4000);
    // Velocidade levemente reduzida no crioulo para clareza.
    const finalSpeed = typeof speed === "number" ? speed : isHaitian ? 0.96 : 1.0;

    // gpt-4o-mini-tts: aceita o parâmetro `instructions`, que permite guiar
    // sotaque/entonação/ritmo SEM alterar as palavras. É a maior alavanca de
    // qualidade para crioulo haitiano (elimina sotaque francês/inglês/português)
    // e custa praticamente o mesmo que tts-1 por caractere.
    const model = "gpt-4o-mini-tts";

    // Instruções de pronúncia. NUNCA mudam as palavras — só o "como falar".
    // Foco: fluidez, ligação entre palavras (liaison), ritmo natural e
    // entonação expressiva — reduzindo ao máximo o aspecto robótico.
    const haitianInstructions =
      "Speak in Haitian Creole (Kreyòl Ayisyen) like a warm, expressive native " +
      "Caribbean speaker having a real conversation. Read every word EXACTLY as " +
      "written — never add, remove, reorder or change any word. " +
      "Delivery: smooth and FLOWING, connecting words naturally (liaison) so it " +
      "never sounds choppy, mechanical or syllable-by-syllable. Use a natural, " +
      "lively rhythm with gentle rising and falling intonation, light stress on " +
      "important words, and short natural breaths only at commas and periods. " +
      "Pronounce 'j' as the soft French /ʒ/ (like 'jour'), never English /dʒ/. " +
      "Pronounce 'r' soft and light; pronounce 'l' clearly. Pronounce vowels " +
      "open and clear like a Caribbean speaker. Any hyphens inside words are " +
      "ONLY pronunciation hints: read each hyphenated word as ONE smooth, " +
      "connected word — never pause between its syllables. Pause ONLY at commas " +
      "and periods. Avoid a monotone, robotic, French, Portuguese or English accent.";

    // Demais idiomas: entrega natural e expressiva (a voz já é nativa do modelo).
    const naturalInstructions =
      "Read every word EXACTLY as written, without adding or changing words. " +
      "Speak naturally and fluidly, like a real person in conversation: warm " +
      "tone, natural rhythm, expressive but gentle intonation, smooth liaison " +
      "between words, and brief pauses only at punctuation. Avoid a flat, " +
      "monotone or robotic delivery.";

    const body: Record<string, unknown> = {
      model,
      voice: v,
      input: trimmed,
      response_format: "mp3",
      speed: finalSpeed,
    };
    body.instructions = isHaitian ? haitianInstructions : naturalInstructions;

    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OpenAI TTS error", resp.status, errText);
      return ttsFallbackResponse(`OPENAI_${resp.status}`);
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
    console.error("tts-openai fatal", e);
    return ttsFallbackResponse("SERVICE_FAILED");
  }
});
