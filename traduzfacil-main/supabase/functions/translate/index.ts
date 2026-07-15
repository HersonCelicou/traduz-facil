// Edge function: tradução entre idiomas (Bonjou Brasil)
// Usa Lovable AI Gateway (Gemini) — sem stream, retorna JSON {translation}
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
  "es-MX": "Espanhol (México/Colômbia, neutro latino-americano)",
  "es-AR": "Espanhol (Argentina, rio-platense)",
  "es-DO": "Espanhol (República Dominicana, caribenho)",
  "es-CL": "Espanhol (Chile)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const { text, source, target } = await req.json();
    if (!text || !target || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Texto ou idioma ausente." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!LANG_NAMES[target] || (source && !LANG_NAMES[source])) {
      return new Response(
        JSON.stringify({ error: "Idioma não suportado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (text.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Texto muito longo (máx. 2000 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Curto-circuito: se já está no idioma de destino, devolve sem chamar IA.
    // Evita que o modelo "ajuste" pronomes (ex.: trocar "ou" por "nou").
    if (source && source === target) {
      return new Response(JSON.stringify({ translation: text.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const sourceName = source ? LANG_NAMES[source] : "auto-detectado";
    const targetName = LANG_NAMES[target];
    const isHaitian = target === "ht-HT";

    const systemPrompt = isHaitian
      ? `Ou se yon tradiktè pwofesyonèl ayisyen natifnatal. Tradui tèks la soti nan ${sourceName} pou rive nan kreyòl ayisyen natif, natirèl ak modèn.
RÈG ABSOLI — FIDELITE:
- Reponn SÈLMAN ak tradiksyon final la, san eksplikasyon, san gimè, san prefiks.
- PA JANM chanje pwonon yo. Si orijinal la di "ou" (tu/vous), KENBE "ou". Pa janm mete "nou" pou "ou" oswa vis vèsa. Menm bagay pou "mwen", "li", "nou", "yo".
- Si tèks la deja an kreyòl ayisyen kòrèk, RETOUNEN L EGZAKTMAN MENM JAN AN, san chanje yon sèl mo.
- Pa janm melanje ak franse. Itilize vokabilè ayisyen otantik.
- Itilize ekriti ofisyèl IPN 1979 (è, ò, ou, an, en, on).
- Pale tankou yon Ayisyen reyèl ki ap pale chak jou.`
      : `Você é um tradutor profissional do app "Traduz Fácil", criado para ajudar imigrantes a se comunicarem no Brasil.
Traduza o texto a seguir de ${sourceName} para ${targetName}.
Regras importantes:
- Responda SOMENTE com a tradução final, sem explicações, sem aspas, sem prefixos como "Tradução:".
- Mantenha o tom natural, coloquial e acolhedor.
- NUNCA troque pronomes (eu/tu/você/nós/eles) por outros. Preserve o sujeito original.
- Para variantes de espanhol, respeite o sotaque/léxico da região indicada.
- Se o texto já estiver no idioma de destino, devolva-o EXATAMENTE como está, sem modificar palavras.`;

    // Para crioulo haitiano, prefere OpenAI GPT-4.1-mini (melhor em kreyòl).
    // Se OpenAI não estiver disponível, faz fallback para Lovable AI Gateway (Gemini).
    const useOpenAI = Boolean(isHaitian && OPENAI_API_KEY && /^sk-/.test(OPENAI_API_KEY));
    if (!useOpenAI && !LOVABLE_API_KEY) {
      console.error("Nenhuma chave de IA configurada (OPENAI_API_KEY ou LOVABLE_API_KEY)");
      return new Response(
        JSON.stringify({ error: "Serviço de tradução indisponível no momento." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    async function callAI(provider: "openai" | "lovable") {
      const endpoint = provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://ai.gateway.lovable.dev/v1/chat/completions";
      const authKey = provider === "openai" ? OPENAI_API_KEY! : LOVABLE_API_KEY!;
      const model = provider === "openai" ? "gpt-4.1-mini" : "google/gemini-3-flash-preview";
      return await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
      });
    }

    let response = await callAI(useOpenAI ? "openai" : "lovable");

    // Fallback: se OpenAI falhar (quota/auth), tenta Lovable AI Gateway.
    if (!response.ok && useOpenAI && LOVABLE_API_KEY) {
      const errText = await response.text().catch(() => "");
      console.warn(`OpenAI falhou (${response.status}): ${errText.slice(0, 200)}. Fallback Lovable AI.`);
      response = await callAI("lovable");
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas traduções em pouco tempo. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: "Não consegui traduzir agora. Tente de novo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
