import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const INSIGHTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['admin_summary', 'client_summary', 'market_context', 'strengths', 'watchouts', 'financial_flags'],
  properties: {
    admin_summary: { type: 'string' },
    client_summary: { type: 'string' },
    market_context: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    watchouts: {
      type: 'array',
      items: { type: 'string' },
    },
    financial_flags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const { approvals, client_name } = await req.json();
    if (!Array.isArray(approvals) || approvals.length === 0) {
      return Response.json({ error: 'Missing approvals list' }, { status: 400 });
    }

    const prompt = `
אתה יועץ פיננסי מנוסה למשכנתאות בישראל.

המטרה:
לנתח כמה אישורים עקרוניים ולהפיק תובנות תומכות החלטה.

חשוב:
- אל תכתוב הבטחות או ייעוץ משפטי.
- אל תמציא נתוני שוק שלא ניתנו במפורש.
- אם אין לך מידע להשוואה לשוק, כתוב זאת בזהירות תחת market_context.
- admin_summary צריך להיות מפורט יותר ומקצועי.
- client_summary צריך להיות ברור, מרגיע, וללא ניסוחים טכניים מדי.
- strengths = נקודות חיוביות מרכזיות.
- watchouts = על מה חשוב לשים לב.
- financial_flags = דגלים פיננסיים כמו קפיצה עתידית בהחזר, תקופה ארוכה, עלות כוללת גבוהה, תוקף קרוב וכו'.

שם הלקוח: ${client_name || 'לא סופק'}

הצעות לניתוח:
${JSON.stringify(approvals, null, 2)}
`.trim();

    const openAiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'approval_insights',
            strict: true,
            schema: INSIGHTS_SCHEMA,
          },
        },
      }),
    });

    const responseJson = await openAiRes.json();
    if (!openAiRes.ok) {
      const upstreamMessage =
        responseJson?.error?.message ||
        responseJson?.message ||
        'OpenAI insight generation failed';

      return Response.json(
        {
          error: upstreamMessage,
          stage: 'openai_request',
          details: responseJson,
        },
        { status: 500 },
      );
    }

    const rawText = responseJson.output_text;
    if (!rawText) {
      return Response.json(
        {
          error: 'No structured output returned from OpenAI',
          stage: 'openai_response',
          details: responseJson,
        },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(rawText);

    return Response.json({
      success: true,
      insights: parsed,
    });
  } catch (error) {
    return Response.json(
      {
        error: error?.message || 'Unexpected generateApprovalInsights failure',
        stage: 'unknown',
      },
      { status: 500 },
    );
  }
});
