import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Lightbulb, TrendingDown, RefreshCw } from 'lucide-react';

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

export default function AccountantAI({ incomeLog, fixedExpenses, variableExpenses, taxBufferRate, hitechTaxRate, totalMonthlyExpenses }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setExpanded(true);

    // Build a financial summary to send to the AI
    const totalGross = incomeLog.reduce((s, e) => s + (e.gross || 0), 0);
    const totalNet = incomeLog.reduce((s, e) => s + (e.net || 0), 0);
    const totalTax = incomeLog.reduce((s, e) => s + (e.tax || 0), 0);

    // Category breakdown
    const categoryMap = {};
    incomeLog.forEach((e) => {
      const cat = e.category || 'משכנתאות';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += e.gross || 0;
    });

    const fixedTotal = fixedExpenses.filter(e => e.enabled !== false).reduce((s, e) => s + e.amount, 0);
    const varTotal = variableExpenses.filter(e => e.paidInstallments < e.installments).reduce((s, e) => s + e.installmentAmount, 0);

    const expensesList = [
      ...fixedExpenses.filter(e => e.enabled !== false).map(e => `${e.name}: ${fmt(e.amount)}/חודש (קבועה)`),
      ...variableExpenses.filter(e => e.paidInstallments < e.installments).map(e => `${e.name}: ${fmt(e.installmentAmount)}/חודש (${e.paidInstallments}/${e.installments} תשלומים)`),
    ];

    const prompt = `אתה רואה חשבון ישראלי מנוסה המתמחה במיסוי עצמאים ובעלי עסקים. 
המשתמש הוא יועץ משכנתאות עצמאי בישראל. נתח את המצב הפיננסי שלו ותן המלצות מעשיות.

**נתוני הכנסה (חודש נוכחי):**
- הכנסה גולמית: ${fmt(totalGross)}
- נטו לאחר מס: ${fmt(totalNet)}
- מס שהופרש: ${fmt(totalTax)}
- שיעור מס רגיל שהוגדר: ${Math.round(taxBufferRate * 100)}%
- שיעור מס הייטק שהוגדר: ${Math.round(hitechTaxRate * 100)}%

**פילוח הכנסות לפי קטגוריה:**
${Object.entries(categoryMap).map(([k, v]) => `- ${k}: ${fmt(v)}`).join('\n') || '- אין נתונים'}

**הוצאות חודשיות (${fmt(fixedTotal + varTotal)}):**
${expensesList.join('\n') || '- אין הוצאות רשומות'}

**אנא ענה בעברית בפורמט JSON בלבד (ללא markdown) עם המבנה הבא:**
{
  "vat_reserve": { "amount": <מספר - כמה להפריש למע"מ>, "explanation": "<הסבר קצר>" },
  "income_tax_reserve": { "amount": <מספר - כמה להפריש למס הכנסה>, "explanation": "<הסבר קצר>" },
  "total_reserve": <סכום כולל להפרשה>,
  "net_after_reserves": <נטו אחרי הפרשות>,
  "tax_tips": [
    { "title": "<כותרת עצה>", "body": "<הסבר מפורט>", "priority": "high|medium|low" }
  ],
  "expense_tips": [
    { "title": "<כותרת>", "body": "<הסבר>", "priority": "high|medium|low" }
  ],
  "summary": "<סיכום קצר של 2-3 משפטים על המצב הכלכלי>"
}

חשוב: 
- מע"מ בישראל: 18%. על עסקים שאינם פטורים (הכנסה מעל 120,000 ₪ לשנה) לגבות ולהפריש מע"מ.
- מדרגות מס הכנסה לעצמאי: עד 81,480 ₪ - 10%, עד 116,760 ₪ - 14%, עד 187,440 ₪ - 20%, עד 260,520 ₪ - 31%, עד 542,160 ₪ - 35%, מעל - 47%.
- ביטוח לאומי לעצמאי: כ-16.04% עד ההכנסה הממוצעת, 11.61% מעל.
- תן עצות ספציפיות ומעשיות לגבי הוצאות שניתן להכיר במס.
- אם אין הכנסות החודש, תן עצות כלליות מועילות.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            vat_reserve: { type: 'object' },
            income_tax_reserve: { type: 'object' },
            total_reserve: { type: 'number' },
            net_after_reserves: { type: 'number' },
            tax_tips: { type: 'array' },
            expense_tips: { type: 'array' },
            summary: { type: 'string' },
          }
        }
      });
      setResult(response);
    } catch (err) {
      setResult({ error: 'שגיאה בניתוח. נסה שוב.' });
    } finally {
      setLoading(false);
    }
  };

  const priorityStyle = (p) => {
    if (p === 'high') return 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20';
    if (p === 'medium') return 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20';
    return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20';
  };
  const priorityIcon = (p) => {
    if (p === 'high') return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
    if (p === 'medium') return <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
  };
  const priorityLabel = (p) => {
    if (p === 'high') return 'text-red-700 dark:text-red-300';
    if (p === 'medium') return 'text-amber-700 dark:text-amber-300';
    return 'text-emerald-700 dark:text-emerald-300';
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground text-sm">ייעוץ מס חכם — AI רואה חשבון</p>
            <p className="text-xs text-muted-foreground">ניתוח אוטומטי של מה להפריש ואיך למקסם ניכויי מס</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border">
          <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">לחץ לניתוח מלא בהתאם לנתוני ההכנסות וההוצאות הנוכחיים.</p>
            <Button onClick={handleAnalyze} disabled={loading} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'מנתח...' : result ? 'נתח מחדש' : 'נתח עכשיו'}
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm">ה-AI מנתח את הנתונים הפיננסיים שלך...</p>
            </div>
          )}

          {result?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.error}</div>
          )}

          {result && !result.error && (
            <div className="space-y-5">
              {/* Summary */}
              {result.summary && (
                <div className="rounded-xl bg-violet-50 border border-violet-200 dark:bg-violet-950/20 dark:border-violet-900/40 p-4">
                  <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Reserve cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 space-y-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> מע"מ להפרשה
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{fmt(result.vat_reserve?.amount)}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{result.vat_reserve?.explanation}</p>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 p-4 space-y-1">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> מס הכנסה להפרשה
                  </p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{fmt(result.income_tax_reserve?.amount)}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed">{result.income_tax_reserve?.explanation}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> נטו פנוי לאחר הפרשות
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{fmt(result.net_after_reserves)}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">סה"כ להפרשה: {fmt(result.total_reserve)}</p>
                </div>
              </div>

              {/* Tax tips */}
              {result.tax_tips?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-violet-500" />
                    עצות למיסוי מיטבי
                  </h4>
                  <div className="space-y-2">
                    {result.tax_tips.map((tip, i) => (
                      <div key={i} className={`rounded-lg border p-3 flex gap-3 ${priorityStyle(tip.priority)}`}>
                        {priorityIcon(tip.priority)}
                        <div>
                          <p className={`text-sm font-semibold ${priorityLabel(tip.priority)}`}>{tip.title}</p>
                          <p className={`text-xs mt-0.5 leading-relaxed ${priorityLabel(tip.priority)} opacity-80`}>{tip.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expense tips */}
              {result.expense_tips?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    עצות לניכוי הוצאות
                  </h4>
                  <div className="space-y-2">
                    {result.expense_tips.map((tip, i) => (
                      <div key={i} className={`rounded-lg border p-3 flex gap-3 ${priorityStyle(tip.priority)}`}>
                        {priorityIcon(tip.priority)}
                        <div>
                          <p className={`text-sm font-semibold ${priorityLabel(tip.priority)}`}>{tip.title}</p>
                          <p className={`text-xs mt-0.5 leading-relaxed ${priorityLabel(tip.priority)} opacity-80`}>{tip.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                ⚠️ הניתוח הוא כלי עזר בלבד ואינו מהווה ייעוץ מס מקצועי. מומלץ להתייעץ עם רואה חשבון מוסמך.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}