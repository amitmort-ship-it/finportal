import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BankApprovalCard from '../components/BankApprovalCard';
import { Building2 } from 'lucide-react';
import ApprovalsComparisonTable from '../components/ApprovalsComparisonTable';
import ApprovalsInsightsPanel from '../components/ApprovalsInsightsPanel';
import { getSharedApprovalInsights } from '@/lib/approvalInsights';
import { BANK_LOGOS } from '../components/BankApprovalCard';

export default function ApprovalsPage() {
  const { caseEmail } = useAuth();
  const { data: approvals = [], isLoading: loading } = useQuery({
    queryKey: ['bank-approvals', caseEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseData', { case_email: caseEmail, entity: 'BankApproval' });
      return res.data.data || [];
    },
    enabled: !!caseEmail,
    staleTime: 0,
    gcTime: 0,
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const grouped = approvals.reduce((acc, approval) => {
    if (!acc[approval.bank_name]) acc[approval.bank_name] = [];
    acc[approval.bank_name].push(approval);
    return acc;
  }, {});
  const sharedInsights = getSharedApprovalInsights(approvals);
  const publishedInsights = sharedInsights?.publish_to_client ? sharedInsights : null;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">אישורי בנקים</h1>
        <p className="text-muted-foreground mt-1">ריכוז והשוואת הצעות מחיר</p>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">אין אישורי בנקים</h3>
          <p className="text-sm text-muted-foreground">כאן יופיעו ההצעות לאחר סריקת המסמכים</p>
        </div>
      ) : (
        <div className="space-y-12">
          <ApprovalsComparisonTable approvals={approvals} title="השוואת הצעות ותמהיל מוצע" />
          <ApprovalsInsightsPanel insights={publishedInsights} />

          <div className="space-y-8">
            {Object.keys(grouped).map((bankName) => (
              <div key={bankName}>
                <div className="flex items-center gap-3 mb-4 border-b pb-2">
                  {BANK_LOGOS[bankName] ? (
                    <div className="w-16 h-8 bg-white border border-border rounded-md overflow-hidden flex items-center justify-center shrink-0">
                      <img src={BANK_LOGOS[bankName]} alt={bankName} className="w-full h-full object-contain p-0.5" />
                    </div>
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                  <h2 className="text-lg font-bold">{bankName}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[bankName].map((approval) => (
                    <BankApprovalCard key={approval.id} approval={approval} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}