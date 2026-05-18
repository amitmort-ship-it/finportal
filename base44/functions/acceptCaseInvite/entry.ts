import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    const invites = await base44.entities.CaseInvite.filter({ token });
    if (!invites.length) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }

    const invite = invites[0];
    const currentEmail = normalizeEmail(currentUser.email);
    const invitedEmail = normalizeEmail(invite.email);

    if (currentEmail !== invitedEmail) {
      return Response.json({ error: 'Invite email does not match the signed-in user' }, { status: 403 });
    }

    const existingMemberships = await base44.asServiceRole.entities.CaseUser.filter({
      case_profile_id: invite.case_profile_id,
      user_email: currentEmail,
    });

    if (existingMemberships.length > 0) {
      await base44.asServiceRole.entities.CaseUser.update(existingMemberships[0].id, {
        status: 'active',
      });
    } else {
      await base44.asServiceRole.entities.CaseUser.create({
        case_profile_id: invite.case_profile_id,
        user_email: currentEmail,
        full_name: currentUser.full_name || invite.full_name || currentEmail,
        role: 'co_borrower',
        status: 'active',
      });
    }

    await base44.asServiceRole.entities.CaseInvite.update(invite.id, {
      status: 'accepted',
    });

    return Response.json({ success: true, case_profile_id: invite.case_profile_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});