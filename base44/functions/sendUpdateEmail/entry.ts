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
    body: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">עדכון חדש מהמשרד</h2>
  <p style="color: #374151; font-size: 16px;">שלום,</p>
  <p style="color: #374151; font-size: 16px;">יש עדכון חדש עבורך:</p>
  <div style="background: #f1f5f9; border-right: 4px solid #1e40af; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #1e293b; font-size: 16px; margin: 0; line-height: 1.6; white-space: pre-line;">${update.message.replace(/\n/g, '<br>')}</p>
  </div>
  <a href="https://app.base44.com" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; margin-top: 8px;">כניסה לאיזור האישי</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">בברכה, הצוות</p>
</div>`,
  });

  return Response.json({ ok: true });
});