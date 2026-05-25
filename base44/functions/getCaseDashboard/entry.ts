import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { case_email } = await req.json();
    if (!case_email) {
      return Response.json({ error: 'Missing case_email' }, { status: 400 });
    }

    const requestedEmailNorm = case_email.trim().toLowerCase();
    const currentEmailNorm = currentUser.email.trim().toLowerCase();

    // Allow if it's their own case
    let allowed = requestedEmailNorm === currentEmailNorm;

    // Allow if they are a co-borrower on the case
    if (!allowed) {
      const profile = await base44.asServiceRole.entities.ClientProfile.filter({ email: case_email });
      if (profile.length > 0) {
        const memberships = await base44.asServiceRole.entities.CaseUser.filter({
          case_profile_id: profile[0].id,
          status: 'active',
        });
        allowed = memberships.some(m => m.user_email?.trim().toLowerCase() === currentEmailNorm);
      }
    }

    // Also allow if admin
    if (currentUser.role === 'admin') allowed = true;

    if (!allowed) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const [
      packageData,
      mortgageData,
      stageData,
      updateData,
      collaterals,
      fileRequests,
      approvals,
    ] = await Promise.all([
      base44.asServiceRole.entities.SelectedPackage.filter({ client_email: case_email }, '-created_date'),
      base44.asServiceRole.entities.FinalMortgage.filter({ client_email: case_email }, '-created_date'),
      base44.asServiceRole.entities.ProcessStage.filter({ client_email: case_email }),
      base44.asServiceRole.entities.ClientUpdate.filter({ client_email: case_email }, '-created_date'),
      base44.asServiceRole.entities.Collateral.filter({ client_email: case_email }),
      base44.asServiceRole.entities.FileRequest.filter({ client_email: case_email }),
      base44.asServiceRole.entities.BankApproval.filter({ client_email: case_email }),
    ]);

    return Response.json({
      packageData,
      mortgageData,
      stageData,
      updateData,
      collaterals,
      fileRequests,
      approvals,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});