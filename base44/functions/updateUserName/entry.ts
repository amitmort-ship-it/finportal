import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, full_name } = await req.json();

    if (!userId || !full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract the auth token from the original request
    const authToken = req.headers.get('authorization');
    if (!authToken) {
      return Response.json({ error: 'No authorization token' }, { status: 401 });
    }

    const appId = Deno.env.get('BASE44_APP_ID');

    // Make direct API call to update User entity with admin token
    const response = await fetch(`https://api.base44.io/apps/${appId}/data/User/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      },
      body: JSON.stringify({
        full_name: full_name.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      return Response.json({ 
        error: `Failed to update user: ${response.status}` 
      }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({ success: true, user: result });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to update user'
    }, { status: 500 });
  }
});