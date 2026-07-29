import { useState } from 'react';
import { AlertCircle, CheckCircle2, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { buildComparisonRows } from '@/lib/approvalAnalysis';

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return `₪${Number(value).toLocaleString('he-IL')}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toLocaleString('he-IL', { maximumFractionDigits: 2 })}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('he-IL');
}

function formatYears(value) {
  if (value === null || value === undefined || value === '') return '-';
  const years = Number(value);
  if (Number.isNaN(years) || years <= 0) return '-';
  return years.toLocaleString('he-IL');
}

function getBestValue(approvals, selector, direction = 'min') {
  const values = approvals
    .map((approval) => ({ id: approval.id, value: selector(approval) }))
    .filter((item) => item.value !== null && item.value !== undefined);
  if (!values.length) return null;
  const ranked = values.sort((a, b) => (direction === 'min' ? a.value - b.value : b.value - a.value));
  return ranked[0] ? ranked[0].id : null;
}

function PrincipalInterestBar({ amount, totalRepayment }) {
  if (!amount || !totalRepayment || totalRepayment <= amount) return null;
  const interest = totalRepayment - amount;
  const principalPct = Math.round((amount / totalRepayment) * 100);
  const interestPct = 100 - principalPct;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div className="bg-blue-500" style={{ width: `${principalPct}%` }} />
        <div className="bg-orange-400" style={{ width: `${interestPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="text-blue-600">קרן {principalPct}%</span>
        <span className="text-orange-500">ריבית {interestPct}%</span>
      </div>
    </div>
  );
}

function ValueCell({ value, isBest = false, children, emphasize = false }) {
  const content = children !== undefined && children !== null ? children : value;
  return (
    <td className={`border-r border-border/50 p-4 text-center align-top ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300' : ''}`}>
      {emphasize ? <span className="text-base font-bold text-foreground">{content}</span> : content}
    </td>
  );
}

export default function ApprovalsComparisonTable({ approvals, title = 'השוואת הצעות', emptyState = null }) {
  const [expanded, setExpanded] = useState(false);
  const comparison = buildComparisonRows(approvals);
  const comparableApprovals = comparison.approvals;
  const maxTrackCount = comparison.maxTrackCount;

  if (!comparableApprovals.length) return emptyState;

  const bestTotalRepayment = getBestValue(comparableApprovals, (a) => a.summary_metrics.total_repayment_forecast, 'min');
  const bestFirstPayment = getBestValue(comparableApprovals, (a) => a.summary_metrics.first_monthly_payment, 'min');
  const bestMortgageYears = getBestValue(comparableApprovals, (a) => a.summary_metrics.mortgage_years, 'min');

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <TableIcon className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">{title}</h2>
        </div>
        <div className="text-xs text-muted-foreground">{comparableApprovals.length} הצעות פעילות</div>
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
                      <div className="mt-1 text-[11px] font-normal normal-case text-muted-foreground">{approval.approval_title}</div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="text-sm">
            {/* Key metrics — emphasized */}
            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">סכום הלוואה</td>
              {comparableApprovals.map((approval) => (
                <ValueCell key={approval.id} value={formatCurrency(approval.summary_metrics.amount)} emphasize />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">החזר חודשי ראשון</td>
              {comparableApprovals.map((approval) => (
                <ValueCell key={approval.id} value={formatCurrency(approval.summary_metrics.first_monthly_payment)} isBest={approval.id === bestFirstPayment} emphasize />
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">שנות משכנתא</td>
              {comparableApprovals.map((approval) => (
                <ValueCell key={approval.id} isBest={approval.id === bestMortgageYears} emphasize>
                  <span dir="rtl" className="inline-block">{formatYears(approval.summary_metrics.mortgage_years)}</span>
                </ValueCell>
              ))}
            </tr>

            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">סך החזר משוער</td>
              {comparableApprovals.map((approval) => (
                <ValueCell key={approval.id} value={formatCurrency(approval.summary_metrics.total_repayment_forecast)} isBest={approval.id === bestTotalRepayment} emphasize />
              ))}
            </tr>

            {/* Visual principal vs interest bar */}
            <tr className="border-b border-border/50">
              <td className="bg-muted/5 p-4 font-medium">יחס קרן מול ריבית</td>
              {comparableApprovals.map((approval) => (
                <td key={approval.id} className="border-r border-border/50 p-4">
                  <PrincipalInterestBar amount={approval.summary_metrics.amount} totalRepayment={approval.summary_metrics.total_repayment_forecast} />
                </td>
              ))}
            </tr>

            {/* Expiry */}
            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="bg-muted/5 p-4 font-medium">תוקף הצעה</td>
              {comparableApprovals.map((approval) => {
                const expiry = approval.offer_metadata.expiry_date;
                const isExpired = expiry ? new Date(expiry) < new Date() : false;
                return (
                  <ValueCell key={approval.id} value={formatDate(expiry)}>
                    <div className={`inline-flex items-center gap-1 ${isExpired ? 'text-red-600 font-bold' : ''}`}>
                      <span>{formatDate(expiry)}</span>
                      {expiry ? (isExpired ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />) : null}
                    </div>
                  </ValueCell>
                );
              })}
            </tr>

            {/* Collapsible track detail */}
            {maxTrackCount > 0 && (
              <>
                <tr className="border-b border-border bg-muted/10 cursor-pointer hover:bg-muted/20" onClick={() => setExpanded((v) => !v)}>
                  <td colSpan={comparableApprovals.length + 1} className="p-3">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expanded ? 'הסתר פירוט תמהילים' : 'הצג פירוט תמהילים לכל הצעה'}
                    </div>
                  </td>
                </tr>
                {expanded &&
                  Array.from({ length: maxTrackCount }).map((_, index) => (
                    <tr key={`track-${index}`} className="border-b border-border/50 hover:bg-muted/5">
                      <td className="bg-muted/5 p-4 font-medium text-xs">{`תמהיל ${index + 1}`}</td>
                      {comparableApprovals.map((approval) => {
                        const track = approval.tracks[index];
                        return (
                          <ValueCell key={`${approval.id}-track-${index}`} value="-">
                            {track ? (
                              <div className="space-y-1 text-xs leading-5">
                                <div className="font-semibold text-foreground">{track.name}</div>
                                <div>{formatCurrency(track.amount)}</div>
                                <div><span dir="rtl" className="inline-block">{formatYears(track.years)}</span></div>
                                <div>{formatPercent(track.interest_rate)}</div>
                                <div>{formatCurrency(track.monthly_payment)}</div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </ValueCell>
                        );
                      })}
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}