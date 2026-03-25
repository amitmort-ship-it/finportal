import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    console.log('getAllClients called');
    const user = await base44.auth.me();
    console.log('user:', user?.email, 'role:', user?.role);
    
    if (user?.role !== 'admin') {
      console.log('Not admin, returning 401');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await base44.asServiceRole.entities.ClientProfile.filter({}, '-created_date', 1000);
    console.log('profiles found:', profiles.length);
    return Response.json({ profiles });
  } catch (error) {
    console.error('getAllClients error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});