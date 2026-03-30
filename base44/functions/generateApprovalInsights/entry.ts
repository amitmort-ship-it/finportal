import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (error) {
      return Response.json(
        {
          error: `auth.me failed: ${error?.message || 'unknown error'}`,
          stage: 'auth_me',
        },
        { status: 500 },
      );
    }

    if (user?.role !== 'admin') {
      return Response.json(
        {
          error: 'Admin access required',
          stage: 'auth_role',
          role: user?.role || null,
          email: user?.email || null,
        },
        { status: 403 },
      );
    }

    let body = null;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        {
          error: `req.json failed: ${error?.message || 'unknown error'}`,
          stage: 'parse_body',
        },
        { status: 500 },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json(
        {
          error: 'Missing OPENAI_API_KEY',
          stage: 'secret',
          email: user?.email || null,
        },
        { status: 500 },
      );
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
        success: openAiRes.ok,
        stage: 'openai_ping',
        status: openAiRes.status,
        user_email: user?.email || null,
        request_keys: body ? Object.keys(body) : [],
        response_preview: responseText.slice(0, 1000),
      });
    } catch (error) {
      return Response.json(
        {
          error: `OpenAI fetch failed: ${error?.message || 'unknown error'}`,
          stage: 'openai_fetch',
        },
        { status: 500 },
      );
    }
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
