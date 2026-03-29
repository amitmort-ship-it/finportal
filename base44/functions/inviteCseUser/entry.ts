import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { email, full_name } = await req.json();
    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const inviterEmail = normalizeEmail(currentUser.email);
    const inviteeEmail = normalizeEmail(email);

    let caseProfile = null;
    const directProfiles = await base44.entities.ClientProfile.filter({ email: inviterEmail });

    if (directProfiles.length > 0) {
      caseProfile = directProfiles[0];
    } else {
      const memberships = await base44.entities.CaseUser.filter({
        user_email: inviterEmail,
        status: 'active',
      });

      if (!memberships.length) {
        return Response.json({ error: 'No active case found for inviter' }, { status: 404 });
      }

      const caseProfiles = await base44.entities.ClientProfile.filter({ id: memberships[0].case_profile_id });

      if (!caseProfiles.length) {
        return Response.json({ error: 'Case profile not found' }, { status: 404 });
      }

      caseProfile = caseProfiles[0];
    }

    const token = crypto.randomUUID();
    const appBaseUrl = Deno.env.get('VITE_BASE44_APP_BASE_URL') || req.headers.get('origin') || '';
    const joinUrl = `${appBaseUrl.replace(/\/$/, '')}/join-case?token=${token}`;

    await base44.entities.CaseInvite.create({
      case_profile_id: caseProfile.id,
      email: inviteeEmail,
      full_name: full_name || null,
      invited_by_email: inviterEmail,
      token,
      status: 'pending',
    });

    await base44.integrations.Core.SendEmail({
      to: inviteeEmail,
      subject: 'Invitation to join your mortgage case',
      body: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #0f172a;">הוזמנת להצטרף לתיק המשכנתא</h2>
          <p style="color: #334155; line-height: 1.7;">
            ${currentUser.full_name || inviterEmail} הזמין אותך להצטרף לתיק המשכנתא המשותף.
          </p>
          <p style="color: #334155; line-height: 1.7;">
            אם כבר יש לך משתמש, התחבר ואז לחץ על הקישור. אם אין לך עדיין משתמש, צור חשבון עם אותו אימייל:
            <strong>${inviteeEmail}</strong>
          </p>
          <a href="${joinUrl}" style="display: inline-block; margin-top: 16px; background: #2563eb; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px;">
            הצטרפות לתיק
          </a>
        </div>
      `,
    });

    return Response.json({ success: true, join_url: joinUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
