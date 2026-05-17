import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const currentEmail = normalizeEmail(currentUser.email);

    const directProfiles = await base44.asServiceRole.entities.ClientProfile.filter({ email: currentEmail });
    let caseProfile = directProfiles.length > 0 ? directProfiles[0] : null;

    if (!caseProfile?.email) {
      return Response.json({ error: 'Case profile not found for current user' }, { status: 404 });
    }

    const displayName = currentUser.full_name || currentEmail;
    const caseLabel = caseProfile.full_name || caseProfile.email;
    const now = new Date().toISOString();

    // Detect first login (registration) — if last_login_at was never set
    const isFirstLogin = !caseProfile.last_login_at;

    await base44.asServiceRole.entities.ClientProfile.update(caseProfile.id, {
      last_login_at: now,
      last_login_user_email: currentEmail,
      last_login_user_name: displayName,
    });

    const eventType = isFirstLogin ? 'registered' : 'login';
    const messageText = isFirstLogin
      ? `${displayName} נרשם/ה לראשונה לאיזור האישי עבור תיק ${caseLabel}`
      : `${displayName} נכנס/ה לאיזור האישי עבור תיק ${caseLabel}`;

    const notification = await base44.asServiceRole.entities.ClientUpdate.create({
      client_email: ADMIN_NOTIFICATIONS_EMAIL,
      message: `[[admin_event:${eventType}]][[client:${normalizeEmail(caseProfile.email)}]] ${messageText}`,
    });

    return Response.json({
      success: true,
      notification,
      isFirstLogin,
      client_email: normalizeEmail(caseProfile.email),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});