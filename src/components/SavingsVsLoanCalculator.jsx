import { useMemo, useState } from 'react';
import { PiggyBank, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

function fmt(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('he-IL')} ₪`;
}

function fmtInput(value) {
  const s = String(value ?? '').replace(/,/g, '');
  if (s === '') return '';
  const [int, dec] = s.split('.');
  const formatted = Number(int || 0).toLocaleString('en-US');
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function sanitize(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function calcLoanCost({ amount, annualRate, months }) {
  const a = sanitize(amount);
  const r = sanitize(annualRate) / 100 / 12;
  const m = Math.round(sanitize(months));
  if (!a || !m) return { totalInterest: 0, monthlyPayment: 0, totalPayment: 0 };
  if (r === 0) return { totalInterest: 0, monthlyPayment: a / m, totalPayment: a };
  const monthly = (a * r * (1 + r) ** m) / ((1 + r) ** m - 1);
  const totalPayment = monthly * m;
  return { totalInterest: totalPayment - a, monthlyPayment: monthly, totalPayment };
}

function calcSavingsOpportunityCost({ amount, annualRate, months }) {
  // How much would the savings grow if NOT withdrawn (compound interest monthly)
  const a = sanitize(amount);
  const r = sanitize(annualRate) / 100 / 12;
  const m = Math.round(sanitize(months));
  if (!a || !m) return { finalBalance: a, opportunityCost: 0 };
  const finalBalance = a * (1 + r) ** m;
  const opportunityCost = finalBalance - a;
  return { finalBalance, opportunityCost };
}

const TAX_RATE = 0.25;

export default function SavingsVsLoanCalculator() {
  const [form, setForm] = useState({
    amount: 100000,
    loanRate: 6.5,
    savingsRate: 5,
    months: 60,
  });

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: String(e.target.value).replace(/,/g, '') }));

  const loan = useMemo(() => calcLoanCost({
    amount: form.amount,
    annualRate: form.loanRate,
    months: form.months,
  }), [form]);

  const savings = useMemo(() => calcSavingsOpportunityCost({
    amount: form.amount,
    annualRate: form.savingsRate,
    months: form.months,
  }), [form]);

  // Net opportunity cost after 25% capital gains tax
  const opportunityCostNetTax = savings.opportunityCost * (1 - TAX_RATE);

  const loanIsCheaper = loan.totalInterest <= opportunityCostNetTax;

  const chartConfig = {
    loan: { label: 'עלות הלוואה', color: '#dc2626' },
    savings: { label: 'עלות מחסכון (נטו)', color: '#059669' },
  };

  const chartData = [
    { name: 'עלות הלוואה', value: Math.round(loan.totalInterest), type: 'loan' },
    { name: 'אבדן תשואה מחסכון (נטו)', value: Math.round(opportunityCostNetTax), type: 'savings' },
  ];

  const diff = Math.abs(loan.totalInterest - opportunityCostNetTax);
  const cheaperLabel = loanIsCheaper ? 'לקחת הלוואה' : 'למשוך מחסכון';

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        {/* Inputs */}
        <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">נתוני ההשוואה</h2>
            <p className="text-sm text-muted-foreground mt-1">
              מלא את הנתונים כדי לבדוק מה כדאי יותר — הלוואה או משיכה מחיסכון
            </p>
          </div>

          <div>
            <Label>סכום הנדרש (₪)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={fmtInput(form.amount)}
              onChange={handleChange('amount')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>תקופה (חודשים)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={fmtInput(form.months)}
              onChange={handleChange('months')}
              className="mt-1"
            />
          </div>

          <hr className="border-border" />

          <div className="rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300 text-sm">
              <Scale className="w-4 h-4" />
              הלוואה
            </div>
            <div>
              <Label>ריבית שנתית על ההלוואה (%)</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={fmtInput(form.loanRate)}
                  onChange={handleChange('loanRate')}
                  className="pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
              <PiggyBank className="w-4 h-4" />
              חיסכון / השקעה
            </div>
            <div>
              <Label>ריבית שנתית על החיסכון (%)</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={fmtInput(form.savingsRate)}
                  onChange={handleChange('savingsRate')}
                  className="pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-5">
              הרווח שהיית מפסיד על הכסף הזה אם תמשוך אותו, לאחר מס רווח הון (25%)
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* Verdict */}
          <div className={`rounded-2xl border p-5 ${loanIsCheaper
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50'
            : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${loanIsCheaper ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                {loanIsCheaper
                  ? <Scale className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                  : <PiggyBank className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">המסקנה</p>
                <p className="text-xl font-bold text-foreground mt-0.5">כדאי יותר: {cheaperLabel}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  חיסכון של <span className="font-semibold text-foreground">{fmt(diff)}</span> לעומת האלטרנטיבה
                </p>
              </div>
            </div>
          </div>

          {/* 4 summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/25 dark:border-red-900/50 p-4 text-right">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-300" />
                <p className="text-xs font-medium text-red-700 dark:text-red-300">עלות ריבית הלוואה</p>
              </div>
              <p className="text-lg font-bold text-foreground">{fmt(loan.totalInterest)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950/25 dark:border-slate-700 p-4 text-right">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">החזר חודשי</p>
              </div>
              <p className="text-lg font-bold text-foreground">{fmt(loan.monthlyPayment)}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/25 dark:border-emerald-900/50 p-4 text-right">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">תשואה שהייתה לחיסכון</p>
              </div>
              <p className="text-lg font-bold text-foreground">{fmt(savings.opportunityCost)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">לפני מס</p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 dark:bg-violet-950/25 dark:border-violet-900/50 p-4 text-right">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300">עלות אבדן תשואה (נטו)</p>
              </div>
              <p className="text-lg font-bold text-foreground">{fmt(opportunityCostNetTax)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">אחרי מס 25%</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <h3 className="text-lg font-semibold text-foreground mb-1">השוואה ויזואלית</h3>
            <p className="text-xs text-muted-foreground mb-4">עלות הלוואה מול עלות אבדן תשואה מחיסכון (נטו)</p>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
                barCategoryGap="30%"
              >
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 13 }} />
                <YAxis hide tickFormatter={(v) => fmt(v)} />
                <ChartTooltip
                  content={(
                    <ChartTooltipContent
                      formatter={(value) => (
                        <>
                          <span className="text-muted-foreground">עלות</span>
                          <span className="font-medium text-foreground">{fmt(value)}</span>
                        </>
                      )}
                    />
                  )}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.type === 'loan' ? '#dc2626' : '#059669'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    content={({ x, y, width, value }) => (
                      <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-foreground text-xs font-medium" fontSize={12}>
                        {fmt(value)}
                      </text>
                    )}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Breakdown table */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">פירוט מלא</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'סכום הנדרש', value: fmt(sanitize(form.amount)), neutral: true },
                { label: 'תקופה', value: `${sanitize(form.months)} חודשים`, neutral: true },
                null,
                { label: '📌 הלוואה — ריבית שנתית', value: `${sanitize(form.loanRate)}%`, neutral: true },
                { label: 'החזר חודשי', value: fmt(loan.monthlyPayment), neutral: true },
                { label: 'סך תשלום', value: fmt(loan.totalPayment), neutral: true },
                { label: 'עלות ריבית', value: fmt(loan.totalInterest), highlight: 'red' },
                null,
                { label: '📌 חיסכון — ריבית שנתית', value: `${sanitize(form.savingsRate)}%`, neutral: true },
                { label: 'יתרה עתידית (ריבית דריבית)', value: fmt(savings.finalBalance), neutral: true },
                { label: 'תשואה שהייתה מצטברת', value: fmt(savings.opportunityCost), neutral: true },
                { label: 'עלות אבדן תשואה לאחר מס', value: fmt(opportunityCostNetTax), highlight: 'green' },
                null,
                { label: '✅ חיסכון בבחירה הכדאית', value: fmt(diff), highlight: loanIsCheaper ? 'blue' : 'green' },
              ].map((row, i) => {
                if (!row) return <hr key={i} className="border-border" />;
                return (
                  <div key={row.label} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 ${
                    row.highlight === 'red' ? 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40' :
                    row.highlight === 'green' ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40' :
                    row.highlight === 'blue' ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40' :
                    'border border-border'
                  }`}>
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-semibold ${
                      row.highlight === 'red' ? 'text-red-700 dark:text-red-300' :
                      row.highlight === 'green' ? 'text-emerald-700 dark:text-emerald-300' :
                      row.highlight === 'blue' ? 'text-blue-700 dark:text-blue-300' :
                      'text-foreground'
                    }`}>{row.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-6">
            החישובים מבוססים על ריבית דריבית חודשית. עלות אבדן התשואה מחיסכון מחושבת לאחר ניכוי מס רווח הון של 25%. החישובים הינם להערכה בלבד ואינם מהווים ייעוץ מקצועי.
          </div>
        </div>
      </div>
    </div>
  );
}