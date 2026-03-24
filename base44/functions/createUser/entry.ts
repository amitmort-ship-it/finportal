import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiUrl = Deno.env.get('BASE44_API_URL') || 'https://api.base44.io';
    const appId = Deno.env.get('BASE44_APP_ID');
    
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name,
        app_id: appId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to create user' }, { status: response.status });
    }

    return Response.json({ success: true, user: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});