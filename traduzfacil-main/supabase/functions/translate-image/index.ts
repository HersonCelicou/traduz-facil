// Edge function: traduz texto extraído de uma imagem usando Lovable AI (Gemini com visão).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  "pt-BR": "Português (Brasil)",
  "fr-FR": "Francês (França)",
  "ht-HT": "Kreyòl Ayisyen (Crioulo Haitiano)",
  "en-US": "Inglês (EUA)",
  "es-ES": "Espanhol (Espanha)",
  "es-MX": "Espanhol (México/Colômbia)",
  "es-AR": "Espanhol (Argentina)",
  "es-DO": "Espanhol (Rep. Dominicana)",
  "es-CL": "Espanhol (Chile)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const { imageBase64, mimeType, target, source } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Imagem ausente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Limite servidor: ~8 MB binário ≈ 11_000_000 chars base64.
    if (imageBase64.length > 11_000_000) {
      return new Response(JSON.stringify({ error: "Imagem muito grande (máx 8 MB)." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const safeMime = typeof mimeType === "string" && ALLOWED_MIME.has(mimeType) ? mimeType : null;
    if (!safeMime) {
      return new Response(JSON.stringify({ error: "Tipo de imagem inválido. Use JPEG, PNG, WEBP ou GIF." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LANG_NAMES[target]) {
      return new Response(JSON.stringify({ error: "Idioma de destino inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const targetName = LANG_NAMES[target];
    const sourceName = source && LANG_NAMES[source] ? LANG_NAMES[source] : "o idioma detectado na imagem";

    const systemPrompt = `Você é um tradutor profissional do app "Traduz Fácil".
Receberá uma imagem que contém texto (placa, cardápio, documento, mensagem, etc.).
Tarefa:
1. Leia TODO o texto visível na imagem em ${sourceName}.
2. Traduza para ${targetName} de forma natural e coloquial.
Responda no formato JSON estrito:
{"original":"texto exatamente como aparece na imagem","translation":"a tradução em ${targetName}"}
Sem markdown, sem comentários, apenas o JSON.`;

    const dataUrl = `data:${safeMime};base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Leia o texto da imagem e traduza para ${targetName}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas traduções em pouco tempo. Aguarde um momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    let original = "";
    let translation = "";
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      original = String(parsed.original ?? "").trim();
      translation = String(parsed.translation ?? "").trim();
    } catch {
      translation = raw;
    }

    return new Response(JSON.stringify({ original, translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-image error:", e);
    return new Response(JSON.stringify({ error: "Não consegui ler a imagem agora. Tente de novo." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
