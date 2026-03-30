import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function cleanNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/[^\d.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(/,/g, '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown, max = 400) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeTrack(track: any) {
  return {
    name: cleanText(track?.name, 100),
    amount: cleanNumber(track?.amount),
    years: cleanNumber(track?.years),
    interest_rate: cleanNumber(track?.interest_rate),
    monthly_payment: cleanNumber(track?.monthly_payment),
    rate_type: cleanText(track?.rate_type, 80),
    linkage_type: cleanText(track?.linkage_type, 80),
    notes: cleanText(track?.notes, 120),
  };
}

function normalizeApproval(approval: any) {
  const ai = approval?.ai_data || {};
  const summary = ai?.summary_metrics || {};
  const offer = ai?.offer_metadata || {};

  return {
    bank_name: cleanText(approval?.bank_name, 100),
    approval_title: cleanText(approval?.approval_title, 120),
    amount: cleanNumber(approval?.amount) ?? cleanNumber(summary?.amount),
    monthly_payment:
      cleanNumber(approval?.monthly_payment) ??
      cleanNumber(summary?.first_monthly_payment),
    mortgage_years: cleanNumber(approval?.mortgage_years),
    total_repayment_forecast: cleanNumber(summary?.total_repayment_forecast),
    weighted_interest_rate: cleanNumber(summary?.weighted_interest_rate),
    expiry_date: cleanText(approval?.offer_expiry_date || offer?.expiry_date, 80),
    comparison_note: cleanText(ai?.comparison_note, 200),
    tracks: Array.isArray(ai?.tracks) ? ai.tracks.slice(0, 6).map(normalizeTrack) : [],
  };
}

function parseJsonText(raw: string) {
  const trimmed = raw.trim();
  const fenced =
    trimmed.match(/```json\s*([\s\S]*?)```/i) ||
    trimmed.match(/```\s*([\s\S]*?)```/i);

  const candidate = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(candidate);

  return {
    admin_summary: typeof parsed?.admin_summary === 'string' ? parsed.admin_summary : '',
    client_summary: typeof parsed?.client_summary === 'string' ? parsed.client_summary : '',
    market_context: typeof parsed?.market_context === 'string' ? parsed.market_context : '',
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.filter(Boolean).map(String) : [],
    watchouts: Array.isArray(parsed?.watchouts) ? parsed.watchouts.filter(Boolean).map(String) : [],
    financial_flags: Array.isArray(parsed?.financial_flags) ? parsed.financial_flags.filter(Boolean).map(String) : [],
  };
}

async function getAvailableModels(apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Failed to load OpenAI models');
  }

  return Array.isArray(json?.data) ? json.data.map((item: any) => item.id).filter(Boolean) : [];
}

function pickModel(modelIds: string[]) {
  const preferred = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-3.5-turbo',
  ];

  for (const model of preferred) {
    if (modelIds.includes(model)) return model;
  }

  return modelIds[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Admin access required', stage: 'auth' },
        { status: 403 },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json(
        { error: 'Missing OPENAI_API_KEY', stage: 'secret' },
        { status: 500 },
      );
    }

    const { approvals, client_name } = await req.json();
    if (!Array.isArray(approvals) || approvals.length === 0) {
      return Response.json(
        { error: 'Missing approvals list', stage: 'input' },
        { status: 400 },
      );
    }

    const normalizedApprovals = approvals.slice(0, 8).map(normalizeApproval);

    const modelIds = await getAvailableModels(apiKey);
    const model = pickModel(modelIds);

    if (!model) {
      return Response.json(
        { error: 'No OpenAI model available for this API key', stage: 'model_select' },
        { status: 500 },
      );
    }

    const systemPrompt = `
אתה יועץ פיננסי מנוסה למשכנתאות בישראל.
החזר תמיד JSON תקין בלבד.
אין להחזיר markdown.
אין להחזיר טקסט מחוץ ל-JSON.
אל תמציא נתוני שוק שלא ניתנו.
אם אין מספיק מידע להשוואה לשוק, כתוב זאת בזהירות ב-market_context.
`.trim();

    const userPrompt = `
נתח את האישורים העקרוניים הבאים והחזר JSON בדיוק במבנה הזה:

{
  "admin_summary": "string",
  "client_summary": "string",
  "market_context": "string",
  "strengths": ["string"],
  "watchouts": ["string"],
  "financial_flags": ["string"]
}

כללים:
- admin_summary צריך להיות מקצועי וממוקד החלטה.
- client_summary צריך להיות פשוט, ברור, וידידותי.
- strengths = נקודות חיוביות מרכזיות.
- watchouts = נקודות לבדיקה / סיכון / תשומת לב.
- financial_flags = דגלים פיננסיים מהותיים.

שם הלקוח:
${client_name || 'לא סופק'}

האישורים:
${JSON.stringify(normalizedApprovals, null, 2)}
`.trim();

    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const completionJson = await completionRes.json();

    if (!completionRes.ok) {
      return Response.json(
        {
          error:
            completionJson?.error?.message ||
            completionJson?.message ||
            'OpenAI chat completion failed',
          stage: 'openai_completion',
          model,
          details: completionJson,
        },
        { status: 500 },
      );
    }

    const rawContent = completionJson?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return Response.json(
        {
          error: 'No content returned from OpenAI completion',
          stage: 'openai_content',
          model,
          details: completionJson,
        },
        { status: 500 },
      );
    }

    let insights;
    try {
      insights = parseJsonText(rawContent);
    } catch (error) {
      return Response.json(
        {
          error: `Failed to parse model JSON: ${error?.message || 'unknown parse error'}`,
          stage: 'json_parse',
          model,
          raw_output: rawContent,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      model,
      insights,
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
