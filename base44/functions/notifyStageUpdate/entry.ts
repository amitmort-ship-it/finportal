import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { client_email, stage_name } = await req.json();
  if (!client_email || !stage_name) {
    return Response.json({ error: 'Missing params' }, { status: 400 });
  }

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: client_email,
    subject: 'עדכון שלב בתהליך המשכנתא שלך',
    body: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">עדכון בתהליך המשכנתא שלך</h2>
  <p style="color: #374151; font-size: 16px;">שלום,</p>
  <p style="color: #374151; font-size: 16px;">התהליך שלך עודכן לשלב חדש:</p>
  <div style="background: #eff6ff; border-right: 4px solid #1e40af; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0;">${stage_name}</p>
  </div>
  <a href="https://horned-fin-vault-flow.base44.app/" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; margin-top: 8px;">כניסה לאיזור האישי</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">בברכה, הצוות</p>
</div>`,
  });

  return Response.json({ ok: true });
});