import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';

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

    const currentEmail = normalizeEmail(currentUser.email);
    let caseProfile = null;

    const directProfiles = await base44.asServiceRole.entities.ClientProfile.filter({ email: currentEmail });
    if (directProfiles.length > 0) {
      caseProfile = directProfiles[0];
    } else {
      const memberships = await base44.asServiceRole.entities.CaseUser.filter({
        user_email: currentEmail,
        status: 'active',
      });

      if (memberships.length > 0) {
        const caseProfiles = await base44.asServiceRole.entities.ClientProfile.filter({
          id: memberships[0].case_profile_id,
        });

        if (caseProfiles.length > 0) {
          caseProfile = caseProfiles[0];
        }
      }
    }

    if (!caseProfile?.email) {
      return Response.json({ error: 'Case profile not found for current user' }, { status: 404 });
    }

    const displayName = currentUser.full_name || currentEmail;
    const caseLabel = caseProfile.full_name || caseProfile.email;

    const notification = await base44.asServiceRole.entities.ClientUpdate.create({
      client_email: ADMIN_NOTIFICATIONS_EMAIL,
      message: `[[admin_event:login]][[client:${normalizeEmail(caseProfile.email)}]] ${displayName} נכנס/ה למערכת עבור תיק ${caseLabel}`,
    });

    return Response.json({
      success: true,
      notification,
      client_email: normalizeEmail(caseProfile.email),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
