import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (error) {
      return Response.json({
        success: true,
        insights: {
          admin_summary: `auth.me failed: ${error?.message || 'unknown error'}`,
          client_summary: 'בדיקת תקלה: auth.me נכשל.',
          market_context: 'שלב התקלה: auth_me',
          strengths: [],
          watchouts: [],
          financial_flags: [],
        },
      });
    }

    if (user?.role !== 'admin') {
      return Response.json({
        success: true,
        insights: {
          admin_summary: `Admin access required. Current role: ${user?.role || 'unknown'}`,
          client_summary: 'בדיקת תקלה: המשתמש הנוכחי אינו אדמין.',
          market_context: 'שלב התקלה: auth_role',
          strengths: [],
          watchouts: [],
          financial_flags: [],
        },
      });
    }

    let body = null;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json({
        success: true,
        insights: {
          admin_summary: `req.json failed: ${error?.message || 'unknown error'}`,
          client_summary: 'בדיקת תקלה: גוף הבקשה לא נקרא.',
          market_context: 'שלב התקלה: parse_body',
          strengths: [],
          watchouts: [],
          financial_flags: [],
        },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({
        success: true,
        insights: {
          admin_summary: 'Missing OPENAI_API_KEY',
          client_summary: 'בדיקת תקלה: אין מפתח OpenAI.',
          market_context: 'שלב התקלה: secret',
          strengths: [],
          watchouts: [],
          financial_flags: [],
        },
      });
    }

    try {
      const openAiRes = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const responseText = await openAiRes.text();

      return Response.json({
        success: true,
        insights: {
          admin_summary: `OpenAI ping status: ${openAiRes.status}`,
          client_summary: 'בדיקת תקלה: פונקציית התובנות הצליחה להגיע ל-OpenAI.',
          market_context: `request keys: ${body ? Object.keys(body).join(', ') : 'none'}`,
          strengths: [
            `user: ${user?.email || 'unknown'}`,
            `openai ok: ${String(openAiRes.ok)}`,
          ],
          watchouts: [
            responseText.slice(0, 300) || 'empty response',
          ],
          financial_flags: [],
        },
      });
    } catch (error) {
      return Response.json({
        success: true,
        insights: {
          admin_summary: `OpenAI fetch failed: ${error?.message || 'unknown error'}`,
          client_summary: 'בדיקת תקלה: הקריאה ל-OpenAI נכשלה.',
          market_context: 'שלב התקלה: openai_fetch',
          strengths: [],
          watchouts: [],
          financial_flags: [],
        },
      });
    }
  } catch (error) {
    return Response.json({
      success: true,
      insights: {
        admin_summary: `Unexpected failure: ${error?.message || 'unknown error'}`,
        client_summary: 'בדיקת תקלה: שגיאה כללית בפונקציה.',
        market_context: 'שלב התקלה: unknown',
        strengths: [],
        watchouts: [],
        financial_flags: [],
      },
    });
  }
});
