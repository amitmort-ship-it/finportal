import { Building2, FileText, Download } from 'lucide-react';

const bankColors = {
  'בנק הפועלים': { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
  'דיסקונט': { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
  'הבינלאומי': { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600' },
  'טפחות': { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
  'לאומי': { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
};

export default function BankApprovalCard({ approval }) {
  const colors = bankColors[approval.bank_name] || { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600' };
  return (
    <div className={`rounded-xl border p-5 hover:shadow-md transition-all duration-300 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
          <Building2 className={`w-5 h-5 ${colors.icon}`} />
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