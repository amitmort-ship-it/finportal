import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function asInsights(title: string, detail: string, extra?: string) {
  return {
    success: true,
    insights: {
      admin_summary: title,
      client_summary: detail,
      market_context: extra || '',
      strengths: [],
      watchouts: [],
      financial_flags: [],
    },
  };
}

Deno.serve(async (req) => {
  try {
    let base44;
    try {
      base44 = createClientFromRequest(req);
    } catch (error) {
      return Response.json(
        asInsights(
          'createClientFromRequest failed',
          error?.message || 'unknown error',
          'stage: create_client',
        ),
      );
    }

    let user;
    try {
      user = await base44.auth.me();
    } catch (error) {
      return Response.json(
        asInsights(
          'auth.me failed',
          error?.message || 'unknown error',
          'stage: auth_me',
        ),
      );
    }

    if (user?.role !== 'admin') {
      return Response.json(
        asInsights(
          'Admin access required',
          `current role: ${user?.role || 'unknown'}`,
          'stage: auth_role',
        ),
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        asInsights(
          'req.json failed',
          error?.message || 'unknown error',
          'stage: parse_body',
        ),
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json(
        asInsights(
          'Missing OPENAI_API_KEY',
          'No secret found',
          'stage: secret',
        ),
      );
    }

    let modelsRes;
    let modelsJson;
    try {
      modelsRes = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      modelsJson = await modelsRes.json();
    } catch (error) {
      return Response.json(
        asInsights(
          'OpenAI models fetch failed',
          error?.message || 'unknown error',
          'stage: openai_models_fetch',
        ),
      );
    }

    if (!modelsRes.ok) {
      return Response.json(
        asInsights(
          'OpenAI models request not ok',
          modelsJson?.error?.message || 'unknown error',
          'stage: openai_models_response',
        ),
      );
    }

    const ids = Array.isArray(modelsJson?.data)
      ? modelsJson.data.map((m: any) => m.id).filter(Boolean)
      : [];

    const model =
      ids.find((id: string) => ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-3.5-turbo'].includes(id)) ||
      ids[0];

    if (!model) {
      return Response.json(
        asInsights(
          'No model available',
          'The API key returned no usable models',
          'stage: model_select',
        ),
      );
    }

    const prompt = `
Return valid JSON only with keys:
admin_summary, client_summary, market_context, strengths, watchouts, financial_flags.

Client:
${body?.client_name || 'unknown'}

Approvals:
${JSON.stringify(body?.approvals || [], null, 2).slice(0, 6000)}
`.trim();

    let completionRes;
    let completionJson;
    try {
      completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'Return valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      completionJson = await completionRes.json();
    } catch (error) {
      return Response.json(
        asInsights(
          'OpenAI completion fetch failed',
          error?.message || 'unknown error',
          `stage: openai_completion_fetch | model: ${model}`,
        ),
      );
    }

    if (!completionRes.ok) {
      return Response.json(
        asInsights(
          'OpenAI completion not ok',
          completionJson?.error?.message || 'unknown error',
          `stage: openai_completion_response | model: ${model}`,
        ),
      );
    }

    const content = completionJson?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return Response.json(
        asInsights(
          'No completion content',
          'OpenAI returned no message content',
          `stage: openai_content | model: ${model}`,
        ),
      );
    }

    try {
      const parsed = JSON.parse(content);
      return Response.json({
        success: true,
        insights: {
          admin_summary: parsed?.admin_summary || '',
          client_summary: parsed?.client_summary || '',
          market_context: parsed?.market_context || '',
          strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
          watchouts: Array.isArray(parsed?.watchouts) ? parsed.watchouts : [],
          financial_flags: Array.isArray(parsed?.financial_flags) ? parsed.financial_flags : [],
        },
      });
    } catch (error) {
      return Response.json(
        asInsights(
          'JSON parse failed',
          error?.message || 'unknown error',
          `stage: json_parse | raw: ${String(content).slice(0, 1500)}`,
        ),
      );
    }
  } catch (error) {
    return Response.json(
      asInsights(
        'Unexpected failure',
        error?.message || 'unknown error',
        'stage: unknown',
      ),
    );
  }
});
