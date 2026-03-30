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
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-900 font-medium">
              <Info className="w-4 h-4" />
              סיכום כללי
            </div>
            <p className="text-sm text-slate-700 leading-7 whitespace-pre-line">{insights.client_summary}</p>
          </div>
        ) : null}

        {insights.market_context ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-medium">
              <Info className="w-4 h-4" />
              הקשר שוק
            </div>
            <p className="text-sm text-slate-700 leading-7 whitespace-pre-line">{insights.market_context}</p>
          </div>
        ) : null}

        {strengths.length > 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-2">מה טוב בהצעות</h3>
            <div className="space-y-2">
              {strengths.map((item, index) => (
                <div key={`strength-${index}`} className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
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
                <div key={`watchout-${index}`} className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
                <div key={`financial-flag-${index}`} className="text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
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
