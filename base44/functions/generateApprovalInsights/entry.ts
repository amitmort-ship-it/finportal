import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { approvals } = await req.json();
    if (!Array.isArray(approvals) || approvals.length === 0) {
      return Response.json({ error: 'Missing approvals list' }, { status: 400 });
    }

    return Response.json({
      success: true,
      insights: {
        admin_summary: 'זוהי טיוטת בדיקה פנימית לאדמין.',
        client_summary: 'נראה שיש כמה הצעות טובות, אבל חשוב להשוות עלות כוללת, רמת סיכון ותוקף ההצעה.',
        market_context: 'בדיקת דמו: כרגע זו תשובת טסט כדי לוודא שהפונקציה וה-UI עובדים.',
        strengths: [
          'יש הצעות פעילות לניתוח',
          'המידע זורם מהניהול למסך התובנות',
        ],
        watchouts: [
          'יש לבדוק מה ההחזר החודשי העתידי ולא רק ההתחלתי',
          'יש להשוות גם תמהיל ולא רק ריבית בודדת',
        ],
        financial_flags: [
          'ייתכן פער בין החזר התחלתי לעלות כוללת',
        ],
      },
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Unexpected generateApprovalInsights failure' },
      { status: 500 },
    );
  }
});
