import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_type, client_email, message } = await req.json();

    if (!event_type || !client_email || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.ClientUpdate.create({
      client_email: ADMIN_NOTIFICATIONS_EMAIL,
      message: `[[admin_event:${String(event_type).trim()}]][[client:${String(client_email).trim()}]] ${String(message).trim()}`,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
