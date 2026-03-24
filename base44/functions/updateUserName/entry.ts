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

    // Attempt to update through SDK service role
    try {
      const result = await base44.asServiceRole.entities.User.update(userId, {
        full_name: full_name.trim(),
      });
      return Response.json({ success: true, user: result });
    } catch (sdkError) {
      console.error('SDK error:', sdkError.message);
      
      // If SDK fails, try direct API call with proper authentication
      const appId = Deno.env.get('BASE44_APP_ID');
      const response = await fetch(`https://api.base44.io/apps/${appId}/data/User/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // The service role should have the token embedded in the base44 client
          'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        },
        body: JSON.stringify({
          full_name: full_name.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return Response.json({ success: true, user: result });
    }
  } catch (error) {
    console.error('Final error:', error.message);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to update user'
    }, { status: 500 });
  }
});