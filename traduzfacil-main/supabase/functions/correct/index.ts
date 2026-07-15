// Edge function: correção de pronúncia/escrita (Bonjou Brasil)
// Recebe { attempt, lang, reference? } e devolve { corrected, words: [{word, ok, suggestion, reason}] }
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
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const { attempt, lang, reference } = await req.json();
    if (!attempt || !lang || typeof attempt !== "string") {
      return new Response(JSON.stringify({ error: "Tentativa ou idioma ausente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LANG_NAMES[lang]) {
      return new Response(JSON.stringify({ error: "Idioma não suportado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (attempt.length > 2000 || (typeof reference === "string" && reference.length > 2000)) {
      return new Response(
        JSON.stringify({ error: "Texto muito longo (máx. 2000 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const langName = LANG_NAMES[lang];

    const systemPrompt = `Você é um professor de idiomas paciente do app "Bonjou Brasil".
Sua tarefa: analisar uma TENTATIVA do aluno em ${langName}${reference ? " comparando com uma FRASE-MODELO" : ""}, identificar erros de pronúncia/ortografia/gramática palavra por palavra e devolver SOMENTE um JSON válido (sem markdown, sem cercas \`\`\`).

Formato OBRIGATÓRIO da resposta:
{
  "corrected": "frase corrigida final em ${langName}",
  "words": [
    { "word": "palavra_corrigida", "ok": true | false, "original": "como_o_aluno_escreveu_ou_null", "suggestion": "dica_curta_em_português_brasileiro_ou_null", "reason": "motivo_curto_em_português_ou_null" }
  ]
}

Regras:
- "words" cobre a frase CORRIGIDA na ordem natural de leitura.
- "ok": true quando a palavra do aluno está perfeita; false quando ele errou (ortografia, acento, gênero, conjugação ou palavra ausente/trocada).
- Quando ok=false, "original" mostra o que o aluno disse (ou null se omitiu), e "suggestion" dá uma dica MUITO curta (ex.: "falta acento", "use feminino", "pronuncie 'on' nasal").
- "reason" é opcional, máximo 8 palavras em português.
- NÃO inclua pontuação como itens separados; mantenha junto à palavra anterior se necessário.
- Se a tentativa estiver perfeita, todas as words devem ter ok=true.
- Responda APENAS com o JSON, nada mais.`;

    const userContent = reference
      ? `FRASE-MODELO (${langName}): ${reference}\nTENTATIVA DO ALUNO: ${attempt}`
      : `TENTATIVA DO ALUNO em ${langName}: ${attempt}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas correções em pouco tempo. Aguarde." }),
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
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return new Response(
      JSON.stringify({
        corrected: parsed.corrected ?? attempt,
        words: Array.isArray(parsed.words) ? parsed.words : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("correct error:", e);
    return new Response(
      JSON.stringify({ error: "Não consegui corrigir agora. Tente de novo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
