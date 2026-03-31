import { AlertCircle, CheckCircle2, Table as TableIcon } from 'lucide-react';
import { buildComparisonRows } from '@/lib/approvalAnalysis';

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `₪${Number(value).toLocaleString('he-IL')}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${Number(value).toLocaleString('he-IL', { maximumFractionDigits: 2 })}%`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('he-IL');
}

function getBestValue(approvals, selector, direction = 'min') {
  const values = approvals
    .map((approval) => ({ id: approval.id, value: selector(approval) }))
    .filter((item) => item.value !== null && item.value !== undefined);

  if (!values.length) {
    return null;
  }

  const ranked = values.sort((a, b) => {
    if (direction === 'min') {
      return a.value - b.value;
    }

    return b.value - a.value;
  });

  return ranked[0] ? ranked[0].id : null;
}

function ValueCell({ value, isBest = false, children }) {
  const content = children !== undefined && children !== null ? children : value;

  return (
    <td className={`border-r border-border/50 p-4 text-center align-top ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300' : ''}`}>
      {content}
    </td>
  );
}

export default function ApprovalsComparisonTable({ approvals, title = 'השוואת הצעות', emptyState = null }) {
  const comparison = buildComparisonRows(approvals);
  const comparableApprovals = comparison.approvals;
  const maxTrackCount = comparison.maxTrackCount;

  if (!comparableApprovals.length) {
    return emptyState;
  }

  const bestTotalRepayment = getBestValue(
    comparableApprovals,
    (approval) => approval.summary_metrics.total_repayment_forecast,
    'min',
  );

  const bestFirstPayment = getBestValue(
    comparableApprovals,
    (approval) => approval.summary_metrics.first_monthly_payment,
    'min',
  );

  const bestMortgageYears = getBestValue(
    comparableApprovals,
    (approval) => approval.summary_metrics.mortgage_years,
    'min',
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <TableIcon className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">{title}</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {comparableApprovals.length} הצעות פעילות
        </div>
      </div>

      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="min-w-[180px] p-4">פרמטר להשוואה</th>
              {comparableApprovals.map((approval) => {
                const bankName = approval.bank_name ? approval.bank_name : 'הצעה';

                return (
                  <th key={approval.id} className="min-w-[180px] border-r border-border/50 p-4 text-center">
                    <div className="font-bold text-foreground">{bankName}</div>
                    {approval.approval_title ? (
                      <div className="mt-1 text-[11px] font-normal normal-case text-muted-foreground">
                        {approval.approval_title}
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="text-sm">
            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">סכום הלוואה</td>
              {comparableApprovals.map((approval) => (
                <ValueCell key={approval.id} value={formatCurrency(approval.summary_metrics.amount)} />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">החזר חודשי ראשון</td>
              {comparableApprovals.map((approval) => (
                <ValueCell
                  key={approval.id}
                  value={formatCurrency(approval.summary_metrics.first_monthly_payment)}
                  isBest={approval.id === bestFirstPayment}
                />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">שנות משכנתא</td>
              {comparableApprovals.map((approval) => (
                <ValueCell
                  key={approval.id}
                  value={approval.summary_metrics.mortgage_years ? `${approval.summary_metrics.mortgage_years} שנים` : '-'}
                  isBest={approval.id === bestMortgageYears}
                />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">סך החזר משוער</td>
              {comparableApprovals.map((approval) => (
                <ValueCell
                  key={approval.id}
                  value={formatCurrency(approval.summary_metrics.total_repayment_forecast)}
                  isBest={approval.id === bestTotalRepayment}
                />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">תוקף הצעה</td>
              {comparableApprovals.map((approval) => {
                const expiry = approval.offer_metadata.expiry_date;
                const isExpired = expiry ? new Date(expiry) < new Date() : false;

                return (
                  <ValueCell
                    key={approval.id}
                    value={formatDate(expiry)}
                    children={
                      <div className={`inline-flex items-center gap-1 ${isExpired ? 'text-red-600 font-bold' : ''}`}>
                        <span>{formatDate(expiry)}</span>
                        {expiry ? (
                          isExpired ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          )
                        ) : null}
                      </div>
                    }
                  />
                );
              })}
            </tr>

            {Array.from({ length: maxTrackCount }).map((_, index) => (
              <tr key={`track-${index}`} className="border-b border-border/50 hover:bg-muted/5">
                <td className="bg-muted/5 p-4 font-medium">{`תמהיל מוצע ${index + 1}`}</td>
                {comparableApprovals.map((approval) => {
                  const track = approval.tracks[index];

                  return (
                    <ValueCell
                      key={`${approval.id}-track-${index}`}
                      value="-"
                      children={
                        track ? (
                          <div className="space-y-1 text-xs leading-5">
                            <div className="font-semibold text-foreground">{track.name}</div>
                            <div>{formatCurrency(track.amount)}</div>
                            <div>{track.years ? `${track.years} שנים` : '-'}</div>
                            <div>{formatPercent(track.interest_rate)}</div>
                            <div>{formatCurrency(track.monthly_payment)}</div>
                          </div>
                        ) : (
                          '-'
                        )
                      }
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
