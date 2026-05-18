import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { case_profile_id } = await req.json();
    if (!case_profile_id) {
      return Response.json({ error: 'Missing case_profile_id' }, { status: 400 });
    }

    // Verify the requesting user is actually a member of this case
    const memberships = await base44.asServiceRole.entities.CaseUser.filter({
      case_profile_id,
      user_email: currentUser.email.trim().toLowerCase(),
      status: 'active',
    });

    if (!memberships.length) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const profiles = await base44.asServiceRole.entities.ClientProfile.filter({ id: case_profile_id });
    if (!profiles.length) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    return Response.json({ profile: profiles[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});