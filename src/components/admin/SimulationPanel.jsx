import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_TAX_BUFFER_RATE, DEFAULT_HITECH_TAX_RATE } from '@/lib/business-config';
const TARGET_NET_AFTER_EXPENSES = 25000;
const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'אחר'];

const CATEGORY_STYLES = {
  'משכנתאות': 'bg-blue-50 border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50',
  'כ.ד':       'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50',
  'הייטק':    'bg-violet-50 border-violet-200 dark:bg-violet-950/25 dark:border-violet-900/50',
  'אחר':       'bg-slate-50 border-slate-200 dark:bg-slate-950/70 dark:border-slate-800',
};

const INITIAL_CATEGORY_INPUTS = {
  'משכנתאות': '',
  'כ.ד': '',
  'הייטק': '',
  'אחר': '',
};

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

function asNumber(value) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (normalized === '') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTaxRateForCategory(category, taxBufferRate, hitechTaxRate) {
  return category === 'הייטק' ? hitechTaxRate : taxBufferRate;
}

export default function SimulationPanel({ fixedExpenses, monthlyFixedTotal, variableExpenses, activeVariableMonthly, taxBufferRate = DEFAULT_TAX_BUFFER_RATE, hitechTaxRate = DEFAULT_HITECH_TAX_RATE }) {
  const [open, setOpen] = useState(true);
  const [catInputs, setCatInputs] = useState(INITIAL_CATEGORY_INPUTS);

  const safeFixedExpenses = useMemo(
    () => (Array.isArray(fixedExpenses) ? fixedExpenses.filter(Boolean) : []),
    [fixedExpenses]
  );

  const safeVariableExpenses = useMemo(
    () => (Array.isArray(variableExpenses) ? variableExpenses.filter(Boolean) : []),
    [variableExpenses]
  );

  const activeFixedExpenses = useMemo(
    () => safeFixedExpenses.filter((expense) => expense.enabled !== false),
    [safeFixedExpenses]
  );

  const activeVariableExpenses = useMemo(
    () => safeVariableExpenses.filter((expense) => asNumber(expense.paidInstallments) < asNumber(expense.installments)),
    [safeVariableExpenses]
  );

  const categoryBreakdown = useMemo(() => (
    INCOME_CATEGORIES.reduce((accumulator, category) => {
      const gross = asNumber(catInputs[category]);
      const taxRate = getTaxRateForCategory(category, taxBufferRate, hitechTaxRate);

      const tax = gross * taxRate;
      const net = gross - tax;

      accumulator[category] = { gross, taxRate, tax, net };
      return accumulator;
    }, {})
  ), [catInputs, taxBufferRate, hitechTaxRate]);

  const totalGross = useMemo(
    () => INCOME_CATEGORIES.reduce((sum, category) => sum + (categoryBreakdown[category]?.gross || 0), 0),
    [categoryBreakdown]
  );

  const tax = useMemo(
    () => INCOME_CATEGORIES.reduce((sum, category) => sum + (categoryBreakdown[category]?.tax || 0), 0),
    [categoryBreakdown]
  );

  const net = useMemo(
    () => INCOME_CATEGORIES.reduce((sum, category) => sum + (categoryBreakdown[category]?.net || 0), 0),
    [categoryBreakdown]
  );
  const totalExpenses = asNumber(monthlyFixedTotal) + asNumber(activeVariableMonthly);
  const afterExpenses = net - totalExpenses;
  const isPositive = afterExpenses >= 0;
  const otherCategoriesNet = (categoryBreakdown['כ.ד']?.net || 0) + (categoryBreakdown['הייטק']?.net || 0) + (categoryBreakdown['אחר']?.net || 0);
  const requiredMortgageNet = Math.max(0, TARGET_NET_AFTER_EXPENSES + totalExpenses - otherCategoriesNet);
  const requiredMortgageGross = requiredMortgageNet / (1 - taxBufferRate);
  const currentMortgageGross = categoryBreakdown['משכנתאות']?.gross || 0;
  const mortgageGapGross = requiredMortgageGross - currentMortgageGross;

  const hasResults = Number.isFinite(totalGross) && totalGross > 0;
  const hasFixedExpenses = activeFixedExpenses.length > 0;
  const hasVariableExpenses = activeVariableExpenses.length > 0;
  const hasAnyExpenses = hasFixedExpenses || hasVariableExpenses;

  const renderResults = () => {
    try {
      return (
        <div
          className={`rounded-xl border border-border p-4 space-y-2 text-sm transition-all ${
            hasResults ? 'bg-muted/30 opacity-100' : 'bg-muted/10 opacity-70'
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">סה"כ גולמי</p>
              <p className="font-bold text-lg text-foreground">{hasResults ? fmt(totalGross) : '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">מיסים משוקללים</p>
              <p className="font-bold text-lg text-red-600">{hasResults ? `-${fmt(tax)}` : '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">נטו אחרי מיסים</p>
              <p className="font-bold text-lg text-blue-600">{hasResults ? fmt(net) : '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">נטו אחרי הוצאות ({hasResults ? fmt(totalExpenses) : '—'})</p>
              <p className={`font-bold text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {hasResults ? `${isPositive ? '' : '-'}${fmt(Math.abs(afterExpenses))}` : '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">כדי להישאר עם {fmt(TARGET_NET_AFTER_EXPENSES)} נטו אחרי הוצאות</p>
              <p className="mt-1 text-lg font-bold text-primary">{hasResults ? fmt(requiredMortgageGross) : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">ברוטו נדרש בקטגוריית משכנתאות</p>
            </div>
            <div className={`rounded-lg border px-4 py-3 ${mortgageGapGross <= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300'}`}>
              <p className="text-xs opacity-80">מול ההזנה הנוכחית במשכנתאות</p>
              <p className="mt-1 text-lg font-bold">
                {hasResults
                  ? (mortgageGapGross <= 0
                      ? `עודף של ${fmt(Math.abs(mortgageGapGross))}`
                      : `חסר של ${fmt(mortgageGapGross)}`)
                  : '—'}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {mortgageGapGross <= 0 ? 'ההכנסה שהוזנה במשכנתאות מספיקה כדי לעבור את היעד.' : 'זה הסכום הנוסף שצריך לייצר במשכנתאות.'}
              </p>
            </div>
          </div>

          <div className={`pt-3 border-t border-border space-y-2 ${hasAnyExpenses && hasResults ? '' : 'hidden'}`}>
              {hasFixedExpenses && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">הוצאות קבועות פעילות:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeFixedExpenses.map((expense, index) => (
                      <span key={expense.id || `${expense.name || 'expense'}-${index}`} className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-300">
                        {expense.name || 'הוצאה'}: {fmt(asNumber(expense.amount))}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasVariableExpenses && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">הוצאות משתנות פעילות:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeVariableExpenses.map((expense, index) => (
                      <span key={expense.id || `${expense.name || 'variable'}-${index}`} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/25 dark:text-orange-300">
                        {expense.name || 'הוצאה'}: {fmt(asNumber(expense.installmentAmount))}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className={`mt-2 rounded-lg px-4 py-3 text-sm font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-300'}`}>
            {hasResults
              ? (isPositive
                  ? `נשאר ${fmt(afterExpenses)} נטו אחרי הוצאות. ${afterExpenses >= TARGET_NET_AFTER_EXPENSES ? 'היעד הושג.' : `עדיין חסרים ${fmt(TARGET_NET_AFTER_EXPENSES - afterExpenses)} ליעד.`}`
                  : `גירעון של ${fmt(Math.abs(afterExpenses))} — ההוצאות עולות על ההכנסה נטו`)
              : 'הזן סכומים כדי לראות את תוצאות הסימולציה'}
          </div>
        </div>
      );
    } catch (error) {
      console.error('SimulationPanel render error:', error);
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300">
          הייתה בעיה בהצגת תוצאות הסימולציה עבור הנתונים הקיימים.
        </div>
      );
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      {/* Header — toggle */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">סימולציית חודש</h3>
          <span className="text-xs text-muted-foreground">כמה צריך לייצר במשכנתאות כדי להגיע ל-{fmt(TARGET_NET_AFTER_EXPENSES)} נטו אחרי הוצאות ומיסים?</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="p-1 hover:bg-muted rounded">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-5">
          {/* Category inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {INCOME_CATEGORIES.map((cat) => (
              <div key={cat} className={`rounded-xl border p-3 space-y-2 ${CATEGORY_STYLES[cat]}`}>
                <Label className="text-sm font-semibold text-foreground">{cat}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={catInputs[cat]}
                  onChange={(e) => setCatInputs((prev) => ({ ...prev, [cat]: e.target.value.replace(/[^\d.,-]/g, '') }))}
                  placeholder="₪ גולמי"
                  dir="ltr"
                  className="bg-background/80"
                />
                {asNumber(catInputs[cat]) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    נטו: {fmt(categoryBreakdown[cat]?.net || 0)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Results */}
          {renderResults()}
        </div>
      )}
    </div>
  );
}
