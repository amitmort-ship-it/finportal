import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // --- CPI from CBS (Central Bureau of Statistics) API ---
    let cpi = null;
    let cpiError = null;
    try {
      const cpiRes = await fetch(
        'https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false&last=2&coef=true&lang=en',
        { headers: { 'Accept': 'application/json', 'User-Agent': 'Base44App/1.0' } }
      );
      if (!cpiRes.ok) {
        cpiError = `CBS HTTP ${cpiRes.status}`;
      } else {
        const cpiJson = await cpiRes.json();
        const seriesList = cpiJson.month || [];
        const dateArr = seriesList[0]?.date || [];
        if (dateArr.length > 0) {
          const latest = dateArr[0];
          cpi = {
            value: latest.currBase?.value ?? null,
            monthlyChange: latest.percent ?? null,
            annualChange: latest.percentYear ?? null,
            month: latest.monthDesc ?? null,
            year: latest.year ?? null,
            base: latest.currBase?.baseDesc ?? null,
          };
        } else {
          cpiError = 'CBS returned no date data';
        }
      }
    } catch (e) {
      cpiError = e.message || String(e);
    }

    // --- BOI interest rate via InvokeLLM with web search ---
    let boiRate = null;
    let boiDate = null;
    try {
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt:
          'What is the current Bank of Israel interest rate (ריבית בנק ישראל)? Search the web for the latest official rate published by the Bank of Israel. Return the rate as a number (e.g. 3.5) and the date it was last set (YYYY-MM-DD).',
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            rate: { type: 'number' },
            date: { type: 'string' },
          },
        },
      });
      if (llmRes && typeof llmRes.rate === 'number') {
        boiRate = llmRes.rate;
        boiDate = llmRes.date || null;
      }
    } catch (e) {
      // BOI rate fetch failed — continue
    }

    // Prime rate = BOI rate + 1.5%
    const primeRate = boiRate != null ? Math.round((boiRate + 1.5) * 100) / 100 : null;

    return Response.json({
      cpi,
      boiRate,
      boiDate,
      primeRate,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}