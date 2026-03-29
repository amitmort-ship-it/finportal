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

    if (currentUser?.role !== 'admin') {
      return Response.json({ error: 'Only admins can invite additional users' }, { status: 403 });
    }

    const { email, full_name, case_profile_id } = await req.json();

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    if (!case_profile_id) {
      return Response.json({ error: 'Missing case profile id' }, { status: 400 });
    }

    const inviterEmail = normalizeEmail(currentUser.email);
    const inviteeEmail = normalizeEmail(email);
    const inviteeName = typeof full_name === 'string' ? full_name.trim() : '';

    if (inviterEmail === inviteeEmail) {
      return Response.json(
        { error: 'Cannot invite the same email as the primary borrower' },
        { status: 400 },
      );
    }

    const caseProfiles = await base44.asServiceRole.entities.ClientProfile.filter({ id: case_profile_id });
    if (!caseProfiles.length) {
      return Response.json({ error: 'Case profile not found' }, { status: 404 });
    }

    const caseProfile = caseProfiles[0];

    const existingCaseOwner = await base44.asServiceRole.entities.ClientProfile.filter({ email: inviteeEmail });
    if (existingCaseOwner.length > 0) {
      return Response.json({ error: 'This email already owns a different case' }, { status: 409 });
    }

    const existingMemberships = await base44.asServiceRole.entities.CaseUser.filter({
      case_profile_id: caseProfile.id,
      user_email: inviteeEmail,
    });

    if (existingMemberships.some((membership) => membership.status === 'active')) {
      return Response.json({ error: 'This user already has access to the case' }, { status: 409 });
    }

    const pendingInvites = await base44.asServiceRole.entities.CaseInvite.filter({
      case_profile_id: caseProfile.id,
      email: inviteeEmail,
      status: 'pending',
    });

    if (pendingInvites.length > 0) {
      return Response.json({ error: 'There is already a pending invitation for this email' }, { status: 409 });
    }

    const token = crypto.randomUUID();
    const appBaseUrl = Deno.env.get('VITE_BASE44_APP_BASE_URL') || req.headers.get('origin') || '';
    const joinUrl = `${appBaseUrl.replace(/\/$/, '')}/join-case?token=${token}`;

    await base44.asServiceRole.entities.CaseInvite.create({
      case_profile_id: caseProfile.id,
      email: inviteeEmail,
      full_name: inviteeName || null,
      invited_by_email: inviterEmail,
      token,
      status: 'pending',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: inviteeEmail,
      subject: 'Invitation to join your mortgage case',
      body: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #0f172a;">הוזמנת להצטרף לתיק המשכנתא</h2>
          <p style="color: #334155; line-height: 1.7;">
            נשלחה אליך הזמנה להצטרף לתיק המשכנתא המשותף של ${caseProfile.full_name || caseProfile.email}.
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
    console.error('inviteCaseUser error:', error);
    return Response.json(
      { error: error?.message || 'Failed to send invite' },
      { status: 500 },
    );
  }
});
