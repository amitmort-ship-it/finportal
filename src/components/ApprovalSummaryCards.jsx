import { TrendingDown, Calendar, Wallet, Trophy, Building2 } from 'lucide-react';
import { buildComparisonRows } from '@/lib/approvalAnalysis';
import { BANK_LOGOS } from './BankApprovalCard';

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return `₪${Number(value).toLocaleString('he-IL')}`;
}

function getBest(approvals, selector, direction = 'min') {
  const values = approvals
    .map((a) => ({ id: a.id, value: selector(a) }))
    .filter((item) => item.value !== null && item.value !== undefined);
  if (!values.length) return null;
  values.sort((a, b) => (direction === 'min' ? a.value - b.value : b.value - a.value));
  return values[0];
}

function SummaryCard({ icon, label, value, bankName, isBest, gradient }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${gradient} ${isBest ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {isBest && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <Trophy className="w-3 h-3" /> מומלץ
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      {bankName && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          {BANK_LOGOS[bankName] ? (
            <div className="w-5 h-4 bg-white border border-border rounded overflow-hidden flex items-center justify-center shrink-0">
              <img src={BANK_LOGOS[bankName]} alt="" className="w-full h-full object-contain p-0.5" />
            </div>
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
          <span className="font-medium text-foreground">{bankName}</span>
        </div>
      )}
    </div>
  );
}

export default function ApprovalSummaryCards({ approvals }) {
  const comparison = buildComparisonRows(approvals);
  const comparable = comparison.approvals;
  if (!comparable.length) return null;

  const bestPayment = getBest(comparable, (a) => a.summary_metrics.first_monthly_payment, 'min');
  const bestRepayment = getBest(comparable, (a) => a.summary_metrics.total_repayment_forecast, 'min');
  const bestYears = getBest(comparable, (a) => a.summary_metrics.mortgage_years, 'min');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="rtl">
      {bestPayment && (
        <SummaryCard
          icon={<Wallet className="w-3.5 h-3.5 text-blue-500" />}
          label="החזר חודשי נמוך"
          value={formatCurrency(bestPayment.value)}
          bankName={comparable.find((a) => a.id === bestPayment.id)?.bank_name}
          isBest={comparable.length > 1}
          gradient="bg-gradient-to-br from-blue-50/70 to-card dark:from-blue-950/15 dark:to-card"
        />
      )}
      {bestRepayment && (
        <SummaryCard
          icon={<TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
          label="סך החזר נמוך"
          value={formatCurrency(bestRepayment.value)}
          bankName={comparable.find((a) => a.id === bestRepayment.id)?.bank_name}
          isBest={comparable.length > 1}
          gradient="bg-gradient-to-br from-emerald-50/70 to-card dark:from-emerald-950/15 dark:to-card"
        />
      )}
      {bestYears && (
        <SummaryCard
          icon={<Calendar className="w-3.5 h-3.5 text-violet-500" />}
          label="תקופה קצרה"
          value={`${Number(bestYears.value).toLocaleString('he-IL')} שנים`}
          bankName={comparable.find((a) => a.id === bestYears.id)?.bank_name}
          isBest={comparable.length > 1}
          gradient="bg-gradient-to-br from-violet-50/70 to-card dark:from-violet-950/15 dark:to-card"
        />
      )}
    </div>
  );
}