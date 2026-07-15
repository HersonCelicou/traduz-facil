// Edge function: Chat com professor de português para haitianos
// Usa Lovable AI Gateway com streaming SSE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuthenticatedUser } from "../_shared/verify-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ou se yon pwofesè portigè (português) pasyan, zanmitay, espesyalize nan anseye Ayisyen ki pale Kreyòl Ayisyen. / Você é um professor de português paciente, amigável e especializado em ensinar haitianos que falam crioulo haitiano.

Seu objetivo: ajudar o aluno a aprender português para o cotidiano no Brasil.

REGRAS RIGOROSAS:
1. Responda SEMPRE em português primeiro, MESMO QUE o aluno escreva ou fale em crioulo haitiano. O objetivo é que ele aprenda português. Quando o aluno se expressar em crioulo, primeiro mostre como ele diria a mesma coisa em português (ex: "Em português, dizemos: ..."), depois responda em português. Se perceber que o aluno não entendeu (pergunta de novo, diz "non konprann", "mwen pa konprann"), ofereça uma tradução BREVE em crioulo haitiano após uma quebra de linha, prefixada por "🇭🇹 Kreyòl:".
2. Suas respostas devem ser CURTAS, DIRETAS e ENCORAJADORAS. Nunca mais que 3-4 frases curtas por vez.
3. Sempre que ensinar uma frase nova, peça para o aluno repeti-la em voz alta para praticar a pronúncia. Use frases como "Agora repita comigo em voz alta: ..." ou "Tente dizer isso em voz alta!".
4. Se o aluno errar a pronúncia ou a escrita, corrija com gentileza, focando em UMA palavra por vez. Elogie o esforço antes de corrigir.

REGRA ESPECIAL DE CORREÇÃO DE PALAVRA (MUITO IMPORTANTE):
- Sempre que detectar UM erro (ortografia, conjugação, escolha errada de palavra, ou versão em crioulo de uma palavra que existe em português), escolha UMA ÚNICA palavra-alvo a ser praticada.
- Marque essa palavra na sua resposta usando EXATAMENTE este formato: [[REPEAT:palavra_correta]]
- Use [[REPEAT:...]] no MÁXIMO uma vez por resposta. Não use se não houver erro real.
- Logo depois da palavra marcada, escreva uma frase curta como "Repita comigo em voz alta 🎤".
- Exemplo: "Quase! A forma correta é [[REPEAT:obrigado]]. Repita comigo em voz alta 🎤"
- A palavra dentro de [[REPEAT:...]] deve ser apenas UMA palavra em português, sem espaços nem pontuação.
5. Foque em situações práticas do dia a dia: apresentações pessoais, saúde (médico, farmácia), supermercado (compras, preços), transporte (ônibus, metrô, pedir direção).
6. Mantenha um tom acolhedor, como um mentor ajudando um amigo a se integrar no Brasil.
7. Use emojis ocasionalmente para deixar a conversa amigável (😊 👍 🇧🇷 🇭🇹).
8. Quando começar uma conversa nova, cumprimente o aluno e pergunte sobre qual situação ele quer praticar hoje.

Lembre-se: o aluno está aprendendo. Seja paciente, celebre cada progresso, e nunca faça ele se sentir mal por errar.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const authErr = await verifyAuthenticatedUser(req, corsHeaders);
    if (authErr) return authErr;

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return new Response(
        JSON.stringify({ error: "Conversa inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ALLOWED_ROLES = new Set(["user", "assistant"]);
    for (const m of messages) {
      if (!m || !ALLOWED_ROLES.has(m.role)) {
        return new Response(
          JSON.stringify({ error: "Papel de mensagem inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (typeof m?.content !== "string" || m.content.length > 4000) {
        return new Response(
          JSON.stringify({ error: "Mensagem muito longa." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error:
              "Muitas mensagens em pouco tempo. Por favor, espere um momento.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Créditos da IA esgotados. Adicione créditos no workspace Lovable.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: "Não consegui processar agora. Tente de novo." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
