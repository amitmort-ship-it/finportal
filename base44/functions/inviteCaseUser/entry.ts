import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required', stage: 'auth' }, { status: 401 });
    }

    if (currentUser?.role !== 'admin') {
      return Response.json({ error: 'Only admins can invite additional users', stage: 'authz' }, { status: 403 });
    }

    const { email, full_name, case_profile_id } = await req.json();

    if (!email) {
      return Response.json({ error: 'Missing email', stage: 'input' }, { status: 400 });
    }

    if (!case_profile_id) {
      return Response.json({ error: 'Missing case profile id', stage: 'input' }, { status: 400 });
    }

    const inviterEmail = normalizeEmail(currentUser.email);
    const inviteeEmail = normalizeEmail(email);
    const inviteeName = typeof full_name === 'string' ? full_name.trim() : '';

    if (inviterEmail === inviteeEmail) {
      return Response.json(
        { error: 'Cannot invite the same email as the primary borrower', stage: 'input' },
        { status: 400 },
      );
    }

    let caseProfiles;
    try {
      caseProfiles = await base44.asServiceRole.entities.ClientProfile.filter({ id: case_profile_id });
    } catch (error) {
      return Response.json(
        { error: `ClientProfile lookup failed: ${error?.message || 'unknown error'}`, stage: 'case_profile_lookup' },
        { status: 500 },
      );
    }

    if (!caseProfiles?.length) {
      return Response.json({ error: 'Case profile not found', stage: 'case_profile_lookup' }, { status: 404 });
    }

    const caseProfile = caseProfiles[0];

    try {
      const existingCaseOwner = await base44.asServiceRole.entities.ClientProfile.filter({ email: inviteeEmail });
      if (existingCaseOwner.length > 0) {
        return Response.json(
          { error: 'This email already owns a different case', stage: 'ownership_check' },
          { status: 409 },
        );
      }
    } catch (error) {
      return Response.json(
        { error: `Owner check failed: ${error?.message || 'unknown error'}`, stage: 'ownership_check' },
        { status: 500 },
      );
    }

    try {
      const existingMemberships = await base44.asServiceRole.entities.CaseUser.filter({
        case_profile_id: caseProfile.id,
        user_email: inviteeEmail,
      });

      if (existingMemberships.some((membership) => membership.status === 'active')) {
        return Response.json(
          { error: 'This user already has access to the case', stage: 'membership_check' },
          { status: 409 },
        );
      }
    } catch (error) {
      return Response.json(
        { error: `CaseUser lookup failed: ${error?.message || 'unknown error'}`, stage: 'membership_check' },
        { status: 500 },
      );
    }

    try {
      const pendingInvites = await base44.asServiceRole.entities.CaseInvite.filter({
        case_profile_id: caseProfile.id,
        email: inviteeEmail,
        status: 'pending',
      });

      if (pendingInvites.length > 0) {
        return Response.json(
          { error: 'There is already a pending invitation for this email', stage: 'pending_invite_check' },
          { status: 409 },
        );
      }
    } catch (error) {
      return Response.json(
        { error: `CaseInvite lookup failed: ${error?.message || 'unknown error'}`, stage: 'pending_invite_check' },
        { status: 500 },
      );
    }

    const token = crypto.randomUUID();
    const appBaseUrl = Deno.env.get('VITE_BASE44_APP_BASE_URL') || req.headers.get('origin') || '';
    const joinUrl = `${appBaseUrl.replace(/\/$/, '')}/join-case?token=${token}`;

    let createdInvite;
    try {
      createdInvite = await base44.asServiceRole.entities.CaseInvite.create({
        case_profile_id: caseProfile.id,
        email: inviteeEmail,
        full_name: inviteeName || null,
        invited_by_email: inviterEmail,
        token,
        status: 'pending',
      });
    } catch (error) {
      return Response.json(
        { error: `CaseInvite create failed: ${error?.message || 'unknown error'}`, stage: 'invite_create' },
        { status: 500 },
      );
    }

    try {
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
    } catch (error) {
      return Response.json({
        success: true,
        warning: 'Invite created but email sending failed',
        email_error: error?.message || 'unknown error',
        join_url: joinUrl,
        invite_id: createdInvite?.id || null,
        stage: 'email_send',
      });
    }

    return Response.json({
      success: true,
      join_url: joinUrl,
      invite_id: createdInvite?.id || null,
    });
  } catch (error) {
    console.error('inviteCaseUser error:', error);

    return Response.json(
      {
        error: error?.message || 'Failed to send invite',
        stage: 'unknown',
      },
      { status: 500 },
    );
  }
});
