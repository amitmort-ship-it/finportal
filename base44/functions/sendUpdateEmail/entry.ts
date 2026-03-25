import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();

  const update = payload.data;
  if (!update?.client_email || !update?.message) {
    return Response.json({ ok: true });
  }

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: update.client_email,
    subject: 'עדכון חדש מהמשרד',
    body: `שלום,\n\nיש עדכון חדש עבורך מהמשרד:\n\n${update.message}\n\nלכניסה לאיזור האישי שלך: ${req.headers.get('origin') || 'https://app.base44.com'}\n\nבברכה,\nהצוות`,
  });

  return Response.json({ ok: true });
});