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

function extractText(responseJson: any) {
  if (typeof responseJson?.output_text === 'string' && responseJson.output_text.trim()) {
    return responseJson.output_text.trim();
  }

  const outputs = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const parts: string[] = [];

  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const chunk of content) {
      if (typeof chunk?.text === 'string' && chunk.text.trim()) {
        parts.push(chunk.text);
      }
    }
  }

  return parts.join('\n').trim();
}

function safeParseInsights(rawText: string) {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : rawText.trim();

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

המטרה שלך:
לנתח את האישורים העקרוניים ולהחזיר JSON בלבד.

תחזיר בדיוק אובייקט JSON עם השדות הבאים:
{
  "admin_summary": string,
  "client_summary": string,
  "market_context": string,
  "strengths": string[],
  "watchouts": string[],
  "financial_flags": string[]
}

כללים:
- אל תחזיר markdown.
- אל תחזיר הסברים מחוץ ל-JSON.
- אל תמציא נתוני שוק שלא ניתנו.
- אם אין מספיק מידע להשוואה לשוק, תכתוב זאת בזהירות ב-market_context.
- admin_summary צריך להיות מקצועי יותר.
- client_summary צריך להיות פשוט וברור.
- strengths = יתרונות עיקריים.
- watchouts = נקודות זהירות.
- financial_flags = סיכונים פיננסיים מהותיים.

שם הלקוח:
${client_name || 'לא סופק'}

נתונים:
${JSON.stringify(normalizedApprovals, null, 2)}
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
      }),
    });

    const responseJson = await openAiRes.json();

    if (!openAiRes.ok) {
      return Response.json(
        {
          error:
            responseJson?.error?.message ||
            responseJson?.message ||
            'OpenAI insight generation failed',
          stage: 'openai_request',
          details: responseJson,
        },
        { status: 500 },
      );
    }

    const rawText = extractText(responseJson);
    if (!rawText) {
      return Response.json(
        {
          error: 'No text output returned from OpenAI',
          stage: 'openai_response',
          details: responseJson,
        },
        { status: 500 },
      );
    }

    let insights;
    try {
      insights = safeParseInsights(rawText);
    } catch (parseError) {
      return Response.json(
        {
          error: `Failed to parse OpenAI JSON: ${parseError?.message || 'unknown parse error'}`,
          stage: 'json_parse',
          raw_output: rawText,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
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
