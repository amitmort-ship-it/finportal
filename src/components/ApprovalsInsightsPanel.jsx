import { AlertTriangle, BarChart3, Info } from 'lucide-react';

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function ApprovalsInsightsPanel({ insights, title = 'תובנות על ההצעות' }) {
  if (
    !insights?.client_summary &&
    !insights?.market_context &&
    !normalizeList(insights?.strengths).length &&
    !normalizeList(insights?.watchouts).length &&
    !normalizeList(insights?.financial_flags).length
  ) {
    return null;
  }

  const strengths = normalizeList(insights?.strengths);
  const watchouts = normalizeList(insights?.watchouts);
  const financialFlags = normalizeList(insights?.financial_flags);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">{title}</h2>
      </div>

      <div className="p-5 space-y-5" dir="rtl">
        {insights.client_summary ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/25">
            <div className="mb-2 flex items-center gap-2 font-medium text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4" />
              סיכום כללי
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-100">{insights.client_summary}</p>
          </div>
        ) : null}

        {insights.market_context ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
              <Info className="w-4 h-4" />
              הקשר שוק
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-100">{insights.market_context}</p>
          </div>
        ) : null}

        {strengths.length > 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-2">מה טוב בהצעות</h3>
            <div className="space-y-2">
              {strengths.map((item, index) => (
                <div key={`strength-${index}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {watchouts.length > 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-2">על מה חשוב לשים לב</h3>
            <div className="space-y-2">
              {watchouts.map((item, index) => (
                <div key={`watchout-${index}`} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {financialFlags.length > 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-2">דגלים פיננסיים</h3>
            <div className="space-y-2">
              {financialFlags.map((item, index) => (
                <div key={`financial-flag-${index}`} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
