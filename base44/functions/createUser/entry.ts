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

    const result = await base44.asServiceRole.createUser({
      email,
      password,
      full_name,
      role: 'user'
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});