import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APPROVAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bank_name', 'approval_title', 'summary_metrics', 'offer_metadata', 'tracks', 'comparison_note'],
  properties: {
    bank_name: { type: ['string', 'null'] },
    approval_title: { type: ['string', 'null'] },
    comparison_note: { type: ['string', 'null'] },
    summary_metrics: {
      type: 'object',
      additionalProperties: false,
      required: [
        'amount',
        'first_monthly_payment',
        'max_monthly_payment_forecast',
        'weighted_interest_rate',
        'total_repayment_forecast',
      ],
      properties: {
        amount: { type: ['number', 'null'] },
        first_monthly_payment: { type: ['number', 'null'] },
        max_monthly_payment_forecast: { type: ['number', 'null'] },
        weighted_interest_rate: { type: ['number', 'null'] },
        total_repayment_forecast: { type: ['number', 'null'] },
      },
    },
    offer_metadata: {
      type: 'object',
      additionalProperties: false,
      required: ['expiry_date', 'offer_date', 'confidence', 'document_language', 'warnings'],
      properties: {
        expiry_date: { type: ['string', 'null'] },
        offer_date: { type: ['string', 'null'] },
        confidence: { type: ['number', 'null'] },
        document_language: { type: ['string', 'null'] },
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    tracks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'amount',
          'years',
          'interest_rate',
          'monthly_payment',
          'rate_type',
          'linkage_type',
          'grace_months',
          'balloon_type',
          'notes',
        ],
        properties: {
          name: { type: ['string', 'null'] },
          amount: { type: ['number', 'null'] },
          years: { type: ['number', 'null'] },
          interest_rate: { type: ['number', 'null'] },
          monthly_payment: { type: ['number', 'null'] },
          rate_type: { type: ['string', 'null'] },
          linkage_type: { type: ['string', 'null'] },
          grace_months: { type: ['number', 'null'] },
          balloon_type: { type: ['string', 'null'] },
          notes: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const trimmed = value.trim();
  const isoDate = new Date(trimmed);
  if (!Number.isNaN(isoDate.getTime())) return isoDate.toISOString();

  const match = trimmed.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (!match) return null;

  const [, day, month, yearRaw] = match;
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const normalized = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  return Number.isNaN(normalized.getTime()) ? null : normalized.toISOString();
}

function cleanNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(/,/g, '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateTrackRepayment(track: any) {
  const principal = cleanNumber(track?.amount);
  const years = cleanNumber(track?.years);
  const annualRate = cleanNumber(track?.interest_rate);
  const statedMonthlyPayment = cleanNumber(track?.monthly_payment);

  if (!principal || !years) return null;

  const totalMonths = Math.round(years * 12);
  if (!totalMonths) return null;

  if (statedMonthlyPayment) {
    return statedMonthlyPayment * totalMonths;
  }

  if (!annualRate) {
    return principal;
  }

  const monthlyRate = annualRate / 100 / 12;
  if (!monthlyRate) {
    return principal;
  }

  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
  return Number.isFinite(monthlyPayment) ? monthlyPayment * totalMonths : null;
}

function normalizeAnalysis(raw: any) {
  const normalizedTracks = Array.isArray(raw?.tracks)
    ? raw.tracks.map((track: any) => ({
        name: track?.name || null,
        amount: cleanNumber(track?.amount),
        years: cleanNumber(track?.years),
        interest_rate: cleanNumber(track?.interest_rate),
        monthly_payment: cleanNumber(track?.monthly_payment),
        rate_type: track?.rate_type || null,
        linkage_type: track?.linkage_type || null,
        grace_months: cleanNumber(track?.grace_months),
        balloon_type: track?.balloon_type || null,
        notes: track?.notes || null,
      }))
    : [];

  const extractedTotalRepayment = cleanNumber(raw?.summary_metrics?.total_repayment_forecast);
  const calculatedTotalRepayment = normalizedTracks
    .map(estimateTrackRepayment)
    .filter((value) => value || value === 0)
    .reduce((sum, value) => sum + value, 0);

  const totalRepayment =
    extractedTotalRepayment ??
    (calculatedTotalRepayment ? Math.round(calculatedTotalRepayment) : null);

  return {
    bank_name: raw?.bank_name || null,
    approval_title: raw?.approval_title || 'אישור עקרוני',
    comparison_note: raw?.comparison_note || null,
    summary_metrics: {
      amount: cleanNumber(raw?.summary_metrics?.amount),
      first_monthly_payment: cleanNumber(raw?.summary_metrics?.first_monthly_payment),
      max_monthly_payment_forecast: cleanNumber(raw?.summary_metrics?.max_monthly_payment_forecast),
      weighted_interest_rate: cleanNumber(raw?.summary_metrics?.weighted_interest_rate),
      total_repayment_forecast: totalRepayment,
    },
    offer_metadata: {
      expiry_date: normalizeDate(raw?.offer_metadata?.expiry_date),
      offer_date: normalizeDate(raw?.offer_metadata?.offer_date),
      confidence: cleanNumber(raw?.offer_metadata?.confidence),
      document_language: raw?.offer_metadata?.document_language || 'he',
      warnings: [
        ...(Array.isArray(raw?.offer_metadata?.warnings) ? raw.offer_metadata.warnings.filter(Boolean) : []),
        ...(!extractedTotalRepayment && totalRepayment ? ['total_repayment_forecast was calculated from extracted tracks'] : []),
      ],
    },
    tracks: normalizedTracks,
  };
}

Deno.serve(async (req) => {
  try {
    createClientFromRequest(req);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const { file_url, file_name, bank_name } = await req.json();
    if (!file_url || !file_name) {
      return Response.json({ error: 'Missing file_url or file_name' }, { status: 400 });
    }

    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return Response.json({ error: 'Failed to download file for analysis' }, { status: 400 });
    }

    const contentType = fileRes.headers.get('content-type') || 'application/pdf';
    const fileBytes = new Uint8Array(await fileRes.arrayBuffer());

    if (fileBytes.byteLength > 50 * 1024 * 1024) {
      return Response.json({ error: 'PDF exceeds 50MB limit for model file input' }, { status: 400 });
    }

    const fileData = `data:${contentType};base64,${toBase64(fileBytes)}`;

    const prompt = `
אתה מנוע חילוץ נתונים מאישורים עקרוניים למשכנתא בישראל.

המטרה:
1. לחלץ את כל פרטי ההצעה בצורה אמינה ככל האפשר.
2. להתאים גם למסמכים עתידיים מבנקים שונים, לא רק לדוגמה אחת.
3. להחזיר JSON בלבד לפי הסכמה הנתונה.

כללים:
- אם שדה לא מופיע במפורש, החזר null.
- אל תנחש מספרים.
- אם יש טבלה של תמהיל/מסלולים, חלץ כל מסלול בנפרד.
- במסמכים רבים יש טבלת "תמהיל מוצע" או טבלת השוואה/סיכום.
- יש לחפש במיוחד שורות מסכמות בתחתית התמהיל, גם אם הן מופיעות רק בשורה 9 או 10.
- amount הוא סכום ההלוואה הכולל.
- first_monthly_payment הוא ההחזר החודשי הראשון/התחלתי.
- max_monthly_payment_forecast הוא ההחזר הגבוה ביותר אם מופיע תחזית/שינוי עתידי.
- weighted_interest_rate הוא ריבית משוקללת רק אם מופיעה במפורש או אם כתובה כריבית כוללת של ההצעה.
- total_repayment_forecast הוא סך ההחזר הכולל/הצפוי/המשוער.
- חפש עבור total_repayment_forecast גם וריאציות כמו:
  "סך החזר",
  "סך החזר צפוי",
  "סך החזר משוער",
  "סה\\"כ החזר",
  "סה\\"כ לתשלום",
  "החזר כולל",
  "סכום החזר כולל".
- אם הערך מופיע בטבלת התמהיל המוצע, יש להעדיף אותו גם אם הוא נמצא בשורה מסכמת ללא כותרת בולטת.
- expiry_date הוא תוקף ההצעה אם מופיע.
- offer_date הוא תאריך ההצעה אם מופיע.
- confidence צריך להיות בין 0 ל-1 בהתאם לאיכות החילוץ.
- warnings צריכים לציין חוסרים, אי ודאות, או אם חלק מהמסמך היה תמונתי/לא קריא.

פירוש מסלולים:
- name: למשל פריים, קל"צ, קבועה צמודה, משתנה כל 5, זכאות וכו'
- rate_type: קבועה / משתנה / פריים / אחר
- linkage_type: צמוד מדד / לא צמוד / מט"ח / אחר
- balloon_type: בלון מלא / בלון חלקי / ללא בלון
- grace_months: חודשי גרייס אם מופיע

אם הבנק מזוהה במסמך, העדף אותו על פני הבנק שסופק חיצונית.
אם לא זוהה במסמך, אפשר להשתמש בערך החיצוני: ${bank_name || 'לא סופק'}.

בנוסף:
- יש לחפש expiry_date גם ליד נוסחים כמו:
  "בתוקף עד",
  "תוקף האישור",
  "האישור תקף עד",
  "תוקף הצעה",
  "תוקף האישור העקרוני".
- אם יש כמה תאריכים במסמך, בחר את זה שקשור במפורש לתוקף ההצעה ולא לתאריך הפקה/חתימה.

החזר את ה-JSON בלבד.
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
            content: [
              {
                type: 'input_file',
                filename: file_name,
                file_data: fileData,
              },
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'mortgage_bank_approval',
            strict: true,
            schema: APPROVAL_SCHEMA,
          },
        },
      }),
    });

    const responseJson = await openAiRes.json();
    if (!openAiRes.ok) {
      return Response.json({ error: 'OpenAI analysis failed', details: responseJson }, { status: 500 });
    }

    const rawText = responseJson.output_text;
    if (!rawText) {
      return Response.json({ error: 'No structured output returned from OpenAI', details: responseJson }, { status: 500 });
    }

    const parsed = JSON.parse(rawText);
    const normalized = normalizeAnalysis(parsed);

    return Response.json({
      success: true,
      analysis: normalized,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
