import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function isAllowed(base44, currentUser, case_email) {
  if (currentUser.role === 'admin') return true;
  const currentEmailNorm = currentUser.email.trim().toLowerCase();
  const requestedEmailNorm = case_email.trim().toLowerCase();
  if (currentEmailNorm === requestedEmailNorm) return true;

  const profile = await base44.asServiceRole.entities.ClientProfile.filter({ email: case_email });
  if (!profile.length) return false;

  const memberships = await base44.asServiceRole.entities.CaseUser.filter({
    case_profile_id: profile[0].id,
    status: 'active',
  });
  return memberships.some(m => m.user_email?.trim().toLowerCase() === currentEmailNorm);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { case_email, entity } = await req.json();
    if (!case_email || !entity) {
      return Response.json({ error: 'Missing case_email or entity' }, { status: 400 });
    }

    const allowed = await isAllowed(base44, currentUser, case_email);
    if (!allowed) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const entityMap = {
      FileRequest: base44.asServiceRole.entities.FileRequest,
      Collateral: base44.asServiceRole.entities.Collateral,
      SelectedPackage: base44.asServiceRole.entities.SelectedPackage,
      BankApproval: base44.asServiceRole.entities.BankApproval,
      ProcessStage: base44.asServiceRole.entities.ProcessStage,
    };

    const entityClient = entityMap[entity];
    if (!entityClient) {
      return Response.json({ error: 'Unknown entity' }, { status: 400 });
    }

    const data = await entityClient.filter({ client_email: case_email }, '-created_date');
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
