import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const clientEmail = String(payload?.client_email || user.email || '').trim().toLowerCase();

  const allDocs = await base44.asServiceRole.entities.DownloadableDoc.list();
  const enabledDocs = (allDocs || []).filter((doc) =>
    Array.isArray(doc.enabled_for) && doc.enabled_for.includes(clientEmail)
  );

  return Response.json({ docs: enabledDocs });
});