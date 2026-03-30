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

function cleanNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(/,/g, '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeTrack(track: any) {
  return {
    name: cleanText(track?.name, 120),
    amount: cleanNumber(track?.amount),
    years: cleanNumber(track?.years),
    interest_rate: cleanNumber(track?.interest_rate),
    monthly_payment: cleanNumber(track?.monthly_payment),
    rate_type: cleanText(track?.rate_type, 80),
    linkage_type: cleanText(track?.linkage_type, 80),
    balloon_type: cleanText(track?.balloon_type, 80),
    notes: cleanText(track?.notes, 180),
  };
}

function normalizeApproval(approval: any) {
  const ai = approval?.ai_data || {};
  const summary = ai?.summary_metrics || {};
  const offer = ai?.offer_metadata || {};

  return {
    bank_name: cleanText(approval?.bank_name, 120),
    approval_title: cleanText(approval?.approval_title, 160),
    amount: cleanNumber(approval?.amount) ?? cleanNumber(summary?.amount),
    monthly_payment: cleanNumber(approval?.monthly_payment) ?? cleanNumber(summary?.first_monthly_payment),
    mortgage_years: cleanNumber(approval?.mortgage_years),
    total_repayment_forecast: cleanNumber(summary?.total_repayment_forecast),
    weighted_interest_rate: cleanNumber(summary?.weighted_interest_rate),
    expiry_date: cleanText(approval?.offer_expiry_date || offer?.expiry_date, 80),
    comparison_note: cleanText(ai?.comparison_note, 250),
    tracks: Array.isArray(ai?.tracks) ? ai.tracks.slice(0, 8).map(normalizeTrack) : [],
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required', stage: 'auth' }, { status: 403 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing OPENAI_API_KEY', stage: 'secret' }, { status: 500 });
    }

    const { approvals, client_name } = await req.json();
    if (!Array.isArray(approvals) || approvals.length === 0) {
      return Response.json({ error: 'Missing approvals list', stage: 'input' }, { status: 400 });
    }

    const normalizedApprovals = approvals.slice(0, 8).map(normalizeApproval);

    const prompt = `
אתה יועץ פיננסי מנוסה למשכנתאות בישראל.

המטרה:
לנתח אישורים עקרוניים למשכנתא ולהפיק תובנות תומכות החלטה עבור אדמין ולקוח.

כללים:
- אל תכתוב הבטחות או ייעוץ משפטי.
- אל תמציא נתוני שוק שלא ניתנו במפורש.
- אם אין מספיק מידע להשוואה לשוק, כתוב זאת בזהירות ב-market_context.
- admin_summary צריך להיות מקצועי, חד, וממוקד בהחלטה.
- client_summary צריך להיות ברור, פשוט, ולא מאיים.
- strengths = נקודות חוזקה עיקריות בהצעות.
- watchouts = סיכונים / נקודות לבדיקה / דברים שדורשים תשומת לב.
- financial_flags = דגלים פיננסיים מהותיים כמו עלות כוללת גבוהה, סיכון לעליית החזר, תקופה ארוכה, תלות במסלולים משתנים, תוקף קרוב.

שם הלקוח:
${client_name || 'לא סופק'}

נתונים לניתוח:
${JSON.stringify(normalizedApprovals, null, 2)}

החזר JSON בלבד לפי הסכמה הנתונה.
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

    const rawText = responseJson?.output_text;
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
