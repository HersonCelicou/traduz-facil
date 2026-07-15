// Edge function: Transcrição de áudio (crioulo haitiano e português)
// Gera token para STT em tempo real e mantém fallback por arquivo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ISO 639-3 codes
const LANG_MAP: Record<string, string> = {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body?.realtime) {
        const tokenResp = await fetch(
          "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
          {
            method: "POST",
            headers: { "xi-api-key": apiKey },
          },
        );

        if (!tokenResp.ok) {
          const detail = await tokenResp.text();
          console.error("ElevenLabs realtime token error:", tokenResp.status, detail);
          return new Response(
            JSON.stringify({ error: "Não consegui iniciar a escuta rápida." }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const data = await tokenResp.json();
        return new Response(JSON.stringify({ token: data.token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const inForm = await req.formData();
    const audio = inForm.get("audio") as Blob | null;
    const lang = (inForm.get("lang") as string) || "ht-HT";

    if (!audio || typeof (audio as Blob).arrayBuffer !== "function") {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' file in form data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiForm = new FormData();
    apiForm.append("file", audio, "audio.webm");
    // scribe_v2 tem precisão muito superior em crioulo haitiano e idiomas de baixa cobertura.
    apiForm.append("model_id", "scribe_v2");
    apiForm.append("language_code", LANG_MAP[lang] ?? "eng");
    apiForm.append("tag_audio_events", "false");
    apiForm.append("diarize", "false");

    const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: apiForm,
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("ElevenLabs STT error:", resp.status, t);
      return new Response(
        JSON.stringify({ error: "Não consegui processar o áudio. Tente de novo." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await resp.json();
    return new Response(
      JSON.stringify({ text: data.text ?? "", language: data.language_code }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("transcribe error:", e);
    return new Response(
      JSON.stringify({ error: "Não consegui processar o áudio. Tente de novo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
