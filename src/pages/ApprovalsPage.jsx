import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BankApprovalCard from '../components/BankApprovalCard';
import { Building2 } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { data: approvals = [], isLoading: loading } = useQuery({
    queryKey: ['bank-approvals', user.email],
    queryFn: async () => base44.entities.BankApproval.filter({ client_email: user.email }, '-created_date'),
    staleTime: 60000,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Group by bank name
  const grouped = approvals.reduce((acc, approval) => {
    if (!acc[approval.bank_name]) acc[approval.bank_name] = [];
    acc[approval.bank_name].push(approval);
    return acc;
  }, {});

  const banks = Object.keys(grouped);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">אישורי בנקים</h1>
        <p className="text-muted-foreground mt-1">הצעות ואישורים מהבנקים</p>
      </div>

      {banks.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין אישורי בנקים עדיין</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר נקבל אישורים מבנקים, הם יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-8">
          {banks.map((bankName) => (
            <div key={bankName}>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">{bankName}</h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {grouped[bankName].length} אישורים
                </span>
              </div>
              <div className="grid gap-3">
                {grouped[bankName].map((approval) => (
                  <BankApprovalCard key={approval.id} approval={approval} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}