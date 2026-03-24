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

    // Update user directly through the authenticated SDK client
    const updatedUser = await base44.entities.User.update(userId, {
      full_name: full_name.trim(),
    });

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to update user'
    }, { status: 500 });
  }
});