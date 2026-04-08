import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};



serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Você é um assistente especializado em orçamentos para profissionais autônomos brasileiros.
Gere um orçamento detalhado em JSON com base na descrição do serviço.
Responda APENAS com JSON válido, sem markdown, sem texto extra.
Formato:
{
  "title": "título profissional do serviço",
  "category": "uma das opções: Elétrica, Hidráulica, Construção, Pintura, TI, Consultoria, Limpeza, Jardinagem, Outros",
  "desc": "descrição profissional do serviço em 1-2 frases",
  "validity": 15,
  "items": [
    {"desc": "nome do item/serviço", "qty": 1, "unit": "un/m/m²/h/serv/kg", "price": 150.00}
  ],
  "notes": "condições de pagamento sugeridas"
}
Use preços realistas para o mercado brasileiro. Seja detalhado nos itens.`,
        messages: [{ role: "user", content: `Serviço: ${prompt}` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.map((c: any) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
