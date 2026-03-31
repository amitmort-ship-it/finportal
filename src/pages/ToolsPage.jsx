import { useMemo, useState } from 'react';
import { Calculator, TrendingUp, PiggyBank, Landmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatCurrency(value) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function sanitizeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function calculateCompoundInterest({
  initialAmount,
  monthlyContribution,
  annualRate,
  years,
  compoundingFrequency,
}) {
  const safeInitialAmount = sanitizeNumber(initialAmount);
  const safeMonthlyContribution = sanitizeNumber(monthlyContribution);
  const safeAnnualRate = sanitizeNumber(annualRate);
  const safeYears = sanitizeNumber(years);

  const months = Math.round(safeYears * 12);
  let balance = safeInitialAmount;
  let totalDeposits = safeInitialAmount;
  let totalInterest = 0;
  const yearlyData = [];

  if (months === 0) {
    return {
      finalBalance: safeInitialAmount,
      totalDeposits: safeInitialAmount,
      totalInterest: 0,
      yearlyData: [],
    };
  }

  const monthlyRate = safeAnnualRate / 100 / 12;
  const yearlyRate = safeAnnualRate / 100;

  for (let month = 1; month <= months; month += 1) {
    balance += safeMonthlyContribution;
    totalDeposits += safeMonthlyContribution;

    let interestForPeriod = 0;

    if (compoundingFrequency === 'monthly') {
      interestForPeriod = balance * monthlyRate;
      balance += interestForPeriod;
      totalInterest += interestForPeriod;
    } else if (month % 12 === 0) {
      interestForPeriod = balance * yearlyRate;
      balance += interestForPeriod;
      totalInterest += interestForPeriod;
    }

    if (month % 12 === 0 || month === months) {
      yearlyData.push({
        year: Number((month / 12).toFixed(2)),
        balance,
        totalDeposits,
        totalInterest,
      });
    }
  }

  return {
    finalBalance: balance,
    totalDeposits,
    totalInterest,
    yearlyData,
  };
}

export default function ToolsPage() {
  const [form, setForm] = useState({
    initialAmount: 100000,
    monthlyContribution: 1000,
    annualRate: 7,
    years: 10,
    compoundingFrequency: 'monthly',
  });

  const results = useMemo(
    () => calculateCompoundInterest(form),
    [form],
  );

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const summaryCards = [
    {
      title: 'הסכום העתידי שלך',
      value: formatCurrency(results.finalBalance),
      icon: TrendingUp,
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      title: 'סך כל ההפקדות',
      value: formatCurrency(results.totalDeposits),
      icon: PiggyBank,
      tone: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      title: 'רווח מהריבית',
      value: formatCurrency(results.totalInterest),
      icon: Landmark,
      tone: 'bg-amber-50 border-amber-200 text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">כלים שימושיים</h1>
        <p className="text-muted-foreground mt-1">מחשבונים פרקטיים לקבלת החלטות פיננסיות חכמות</p>
      </div>

      <Tabs defaultValue="compound-interest" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1 mb-6">
          <TabsTrigger value="compound-interest" className="gap-2">
            <Calculator className="w-4 h-4" />
            מחשבון ריבית דריבית
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compound-interest" className="space-y-6">
          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">נתוני חישוב</h2>
                <p className="text-sm text-muted-foreground mt-1">מלא את הפרטים ונחשב את הצמיחה הצפויה</p>
              </div>

              <div>
                <Label>סכום התחלתי</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.initialAmount}
                  onChange={handleChange('initialAmount')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>הפקדה חודשית קבועה</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.monthlyContribution}
                  onChange={handleChange('monthlyContribution')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>ריבית שנתית באחוזים</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.annualRate}
                  onChange={handleChange('annualRate')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>תקופת השקעה בשנים</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.years}
                  onChange={handleChange('years')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>תדירות חישוב ריבית</Label>
                <Select
                  value={form.compoundingFrequency}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, compoundingFrequency: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="yearly">שנתי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {summaryCards.map(({ title, value, icon: Icon, tone }) => (
                  <div key={title} className={`rounded-2xl border p-5 ${tone}`}>
                    <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium opacity-90">{title}</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">טבלת צמיחה שנתית</h3>
                    <p className="text-sm text-muted-foreground mt-1">פירוט לפי שנה של היתרה, ההפקדות והרווח</p>
                  </div>
                </div>

                {results.yearlyData.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    הזן מספר שנים גדול מאפס כדי לראות תחזית
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-right py-3 px-2 font-medium">שנה</th>
                          <th className="text-right py-3 px-2 font-medium">יתרה</th>
                          <th className="text-right py-3 px-2 font-medium">סך הפקדות</th>
                          <th className="text-right py-3 px-2 font-medium">רווח מהריבית</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.yearlyData.map((row) => (
                          <tr key={row.year} className="border-b border-border last:border-b-0">
                            <td className="py-3 px-2 text-foreground font-medium">{row.year}</td>
                            <td className="py-3 px-2 text-foreground">{formatCurrency(row.balance)}</td>
                            <td className="py-3 px-2 text-muted-foreground">{formatCurrency(row.totalDeposits)}</td>
                            <td className="py-3 px-2 text-emerald-700 font-medium">{formatCurrency(row.totalInterest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
