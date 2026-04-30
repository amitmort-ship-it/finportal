import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

const TAX_BUFFER_RATE = 0.26;
const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'אחר'];

const CATEGORY_STYLES = {
  'משכנתאות': 'bg-blue-50 border-blue-200',
  'כ.ד':       'bg-emerald-50 border-emerald-200',
  'הייטק':    'bg-violet-50 border-violet-200',
  'אחר':       'bg-slate-50 border-slate-200',
};

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

export default function SimulationPanel({ fixedExpenses, monthlyFixedTotal, variableExpenses, activeVariableMonthly }) {
  const [open, setOpen] = useState(true);
  const [catInputs, setCatInputs] = useState(
    Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, '']))
  );

  const totalGross = useMemo(() =>
    INCOME_CATEGORIES.reduce((s, c) => s + (Number(catInputs[c]) || 0), 0),
    [catInputs]
  );

  const tax   = totalGross * TAX_BUFFER_RATE;
  const net   = totalGross - tax;
  const totalExpenses = monthlyFixedTotal + (activeVariableMonthly || 0);
  const afterExpenses = net - totalExpenses;
  const isPositive = afterExpenses >= 0;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      {/* Header — toggle */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">סימולציית חודש</h3>
          <span className="text-xs text-muted-foreground">כמה ישאר לי אחרי מיסים, הוצאות קבועות ומשתנות?</span>
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
                <Label className="text-sm font-semibold">{cat}</Label>
                <Input
                  type="number"
                  value={catInputs[cat]}
                  onChange={(e) => setCatInputs((prev) => ({ ...prev, [cat]: e.target.value }))}
                  placeholder="₪ גולמי"
                  dir="ltr"
                  className="bg-white/80"
                />
                {Number(catInputs[cat]) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    נטו: {fmt(Number(catInputs[cat]) * (1 - TAX_BUFFER_RATE))}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Results */}
          {totalGross > 0 && (
            <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">סה"כ גולמי</p>
                  <p className="font-bold text-lg text-foreground">{fmt(totalGross)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">מיסים (26%)</p>
                  <p className="font-bold text-lg text-red-600">-{fmt(tax)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">נטו אחרי מיסים</p>
                  <p className="font-bold text-lg text-blue-600">{fmt(net)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">אחרי הוצאות ({fmt(totalExpenses)})</p>
                  <p className={`font-bold text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPositive ? '' : '-'}{fmt(Math.abs(afterExpenses))}
                  </p>
                </div>
              </div>

              {/* Expenses breakdown */}
              {(fixedExpenses?.length > 0 || variableExpenses?.some(e => e.paidInstallments < e.installments)) && (
                <div className="pt-3 border-t border-border space-y-2">
                  {fixedExpenses?.filter(e => e.enabled !== false).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">הוצאות קבועות פעילות:</p>
                      <div className="flex flex-wrap gap-2">
                        {fixedExpenses.filter(e => e.enabled !== false).map((e) => (
                          <span key={e.id} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">
                            {e.name}: {fmt(e.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {variableExpenses?.filter(e => e.paidInstallments < e.installments).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">הוצאות משתנות פעילות:</p>
                      <div className="flex flex-wrap gap-2">
                        {variableExpenses.filter(e => e.paidInstallments < e.installments).map((e) => (
                          <span key={e.id} className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
                            {e.name}: {fmt(e.installmentAmount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={`mt-2 rounded-lg px-4 py-3 text-sm font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {isPositive
                  ? `נשאר ${fmt(afterExpenses)} — אפשר לשים ${fmt(afterExpenses)} במאגר / חיסכון`
                  : `גירעון של ${fmt(Math.abs(afterExpenses))} — ההוצאות עולות על ההכנסה נטו`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}