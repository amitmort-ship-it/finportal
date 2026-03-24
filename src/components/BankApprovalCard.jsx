import { Building2, FileText, Download } from 'lucide-react';

export default function BankApprovalCard({ approval }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{approval.bank_name}</h3>
          {approval.approval_title && (
            <p className="text-sm text-muted-foreground mt-0.5">{approval.approval_title}</p>
          )}
          
          <div className="flex flex-wrap gap-3 mt-3">
            {approval.amount && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                ₪{approval.amount.toLocaleString()}
              </span>
            )}
            {approval.interest_rate && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                ריבית: {approval.interest_rate}
              </span>
            )}
          </div>

          {approval.notes && (
            <p className="text-sm text-muted-foreground mt-2">{approval.notes}</p>
          )}

          {approval.file_url && (
            <a href={approval.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline">
              <Download className="w-3.5 h-3.5" />
              {approval.file_name || 'הורד מסמך'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}