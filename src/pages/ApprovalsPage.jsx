import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BankApprovalCard from '../components/BankApprovalCard';
import { Building2, Table as TableIcon, AlertCircle } from 'lucide-react';

// רכיב הטבלה ההשוואתית
const ApprovalsComparisonTable = ({ approvals }) => {
  // מסננים רק אישורים שיש בהם מידע מה-AI בשדה ai_data
  const validApprovals = approvals.filter(a => a.ai_data);
  
  if (validApprovals.length === 0) return null;

  return (
    <div className="mb-10 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="bg-muted/50 p-4 border-b border-border flex items-center justify-center gap-2">
        <TableIcon className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">השוואת הצעות (סל מוצע)</h2>
      </div>
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="bg-muted/30 text-xs font-bold text-muted-foreground border-b border-border uppercase tracking-wider">
              <th className="p-4 min-w-[160px]">פרמטר להשוואה</th>
              {validApprovals.map((app, idx) => (
                <th key={idx} className="p-4 text-center border-r border-border/50 min-w-[130px]">
                  {app.bank_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
              <td className="p-4 font-medium bg-muted/5">החזר חודשי ראשון</td>
              {validApprovals.map((app, idx) => (
                <td key={idx} className="p-4 text-center border-r border-border/50 font-bold text-primary">
                  ₪{app.ai_data.summary_metrics?.first_monthly_payment?.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
              <td className="p-4 font-medium bg-muted/5">צפי החזר מקסימלי</td>
              {validApprovals.map((app, idx) => (
                <td key={idx} className="p-4 text-center border-r border-border/50">
                  ₪{app.ai_data.summary_metrics?.max_monthly_payment_forecast?.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
              <td className="p-4 font-medium bg-muted/5">ריבית משוקללת</td>
              {validApprovals.map((app, idx) => (
                <td key={idx} className="p-4 text-center border-r border-border/50">
                  {app.ai_data.summary_metrics?.weighted_interest_rate}%
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/50 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
              <td className="p-4 font-medium">סך החזר משוער</td>
              {validApprovals.map((app, idx) => (
                <td key={idx} className="p-4 text-center border-r border-border/50 font-black text-emerald-700">
                  ₪{app.ai_data.summary_metrics?.total_repayment_forecast?.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-medium bg-muted/5">תוקף הצעה</td>
              {validApprovals.map((app, idx) => {
                const expiry = app.ai_data.offer_metadata?.expiry_date ? new Date(app.ai_data.offer_metadata.expiry_date) : null;
                const isExpired = expiry && expiry < new Date();
                return (
                  <td key={idx} className={`p-4 text-center border-r border-border/50 ${isExpired ? 'text-red-600 font-bold bg-red-50/50' : ''}`}>
                    {expiry ? expiry.toLocaleDateString('he-IL') : '-'}
                    {isExpired && <AlertCircle className="w-3 h-3 inline mr-1" />}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { data: approvals = [], isLoading: loading } = useQuery({
    queryKey: ['bank-approvals', user?.email],
    queryFn: async () => base44.entities.BankApproval.filter({ client_email: user.email }, '-created_date'),
    enabled: !!user?.email,
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
          {/* הטבלה הדינמית שמוצגת בראש הדף */}
          <ApprovalsComparisonTable approvals={approvals} />

          {/* פירוט לפי בנקים כפי שהיה קודם */}
          <div className="space-y-8">
            {Object.keys(grouped).map((bankName) => (
              <div key={bankName}>
                <div className="flex items-center gap-2 mb-4 border-b pb-2">
                  <Building2 className="w-5 h-5 text-primary" />
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
