import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  Landmark,
  PiggyBank,
  Scale,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useSearchParams } from 'react-router-dom';

function formatCurrency(value) {
  const rounded = Math.round(Number(value || 0));
  return `${rounded.toLocaleString('he-IL')} ₪`;
}

function formatInputNumber(value) {
  const numericValue = String(value ?? '').replace(/,/g, '');
  if (numericValue === '') return '';

  const [integerPart, decimalPart] = numericValue.split('.');
  const formattedInteger = Number(integerPart || 0).toLocaleString('en-US');

  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

function sanitizeNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatPercent(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

function CalculatorDisclaimer({ text }) {
  return (
    <div className="text-xs md:text-sm text-muted-foreground leading-6">
      {text || 'החישובים הינם להערכה בלבד ואינם מהווים התחייבות או ייעוץ מקצועי.'}
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [breakpoint]);

  return isMobile;
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
        deposits: totalDeposits,
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

function calculateLoanMetrics(loan) {
  const loanAmount = sanitizeNumber(loan.amount);
  const partialPrepayment = sanitizeNumber(loan.partialRepayment);
  const netLoanAmount = Math.max(0, loanAmount - partialPrepayment);
  const annualRate = sanitizeNumber(loan.annualRate);
  const months = Math.max(0, Math.round(sanitizeNumber(loan.months)));
  const oneTimeFees = sanitizeNumber(loan.oneTimeCosts);
  const graceType = loan.graceType || 'none';
  const graceMonths = Math.max(0, Math.round(sanitizeNumber(loan.graceMonths)));
  const effectiveGraceMonths = Math.min(graceMonths, Math.max(months - 1, 0));

  if (!netLoanAmount || !months) {
    return {
      loanAmount,
      partialPrepayment,
      netLoanAmount,
      monthlyPayment: 0,
      totalPayments: 0,
      totalInterest: 0,
      totalCost: oneTimeFees,
      oneTimeFees,
      months,
      annualRate,
      costPerBorrowedShekel: 0,
      graceType,
      graceMonths: effectiveGraceMonths,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const remainingMonths = Math.max(months - effectiveGraceMonths, 1);
  let balance = netLoanAmount;
  let totalPayments = 0;
  let totalInterest = 0;

  for (let month = 1; month <= effectiveGraceMonths; month += 1) {
    const interest = balance * monthlyRate;
    totalInterest += interest;

    if (graceType === 'partial') {
      totalPayments += interest;
    } else if (graceType === 'full') {
      balance += interest;
    }
  }

  let monthlyPayment = 0;

  if (monthlyRate === 0) {
    monthlyPayment = balance / remainingMonths;
  } else {
    monthlyPayment =
      (balance * monthlyRate * (1 + monthlyRate) ** remainingMonths) /
      ((1 + monthlyRate) ** remainingMonths - 1);
  }

  for (let month = 1; month <= remainingMonths; month += 1) {
    if (monthlyRate === 0) {
      totalPayments += monthlyPayment;
      continue;
    }

    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    totalInterest += interest;
    totalPayments += monthlyPayment;
    balance = Math.max(0, balance - principalPayment);
  }

  const totalCost = totalPayments + oneTimeFees;
  const costPerBorrowedShekel = netLoanAmount > 0 ? totalCost / netLoanAmount : 0;

  return {
    loanAmount,
    partialPrepayment,
    netLoanAmount,
    monthlyPayment,
    totalPayments,
    totalInterest,
    totalCost,
    oneTimeFees,
    months,
    annualRate,
    costPerBorrowedShekel,
    graceType,
    graceMonths: effectiveGraceMonths,
  };
}

function buildLoanInsights(loansWithMetrics) {
  const activeLoans = loansWithMetrics.filter((loan) => loan.enabled && loan.metrics.netLoanAmount > 0 && loan.metrics.months > 0);
  if (activeLoans.length < 2) {
    return [];
  }

  const lowestMonthly = [...activeLoans].sort((a, b) => a.metrics.monthlyPayment - b.metrics.monthlyPayment)[0];
  const lowestTotalCost = [...activeLoans].sort((a, b) => a.metrics.totalCost - b.metrics.totalCost)[0];
  const lowestCostPerShekel = [...activeLoans].sort((a, b) => a.metrics.costPerBorrowedShekel - b.metrics.costPerBorrowedShekel)[0];
  const balanced = [...activeLoans].sort((a, b) => {
    const aScore = a.metrics.monthlyPayment * 0.45 + a.metrics.totalCost * 0.55;
    const bScore = b.metrics.monthlyPayment * 0.45 + b.metrics.totalCost * 0.55;
    return aScore - bScore;
  })[0];

  return [
    {
      title: 'הכי נוחה תזרימית',
      text: `${lowestMonthly.name} מציגה את ההחזר החודשי הנמוך ביותר: ${formatCurrency(lowestMonthly.metrics.monthlyPayment)}.`,
      tone: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300',
    },
    {
      title: 'הכי זולה לאורך זמן',
      text: `${lowestTotalCost.name} מציגה את העלות הכוללת הנמוכה ביותר: ${formatCurrency(lowestTotalCost.metrics.totalCost)}.`,
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300',
    },
    {
      title: 'העלות היחסית הנמוכה ביותר',
      text: `${lowestCostPerShekel.name} מציגה את העלות היחסית הנמוכה ביותר: ${lowestCostPerShekel.metrics.costPerBorrowedShekel.toFixed(3)} ₪ לכל 1 ₪ הלוואה.`,
      tone: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/50 dark:text-amber-300',
    },
    {
      title: 'איזון טוב בין החזר לעלות',
      text: `${balanced.name} נראית כאפשרות מאוזנת יחסית בין החזר חודשי לעלות כוללת.`,
      tone: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/25 dark:border-violet-900/50 dark:text-violet-300',
    },
  ];
}

function calculatePropertyPurchaseCosts(form) {
  const propertyPrice = sanitizeNumber(form.propertyPrice);
  const taxMode = form.purchaseTaxMode || 'manual';
  const manualPurchaseTax = sanitizeNumber(form.manualPurchaseTax);
  const hasLawyer = form.hasLawyer === 'yes';
  const lawyerPercent = sanitizeNumber(form.lawyerPercent);
  const hasBroker = form.hasBroker === 'yes';
  const brokerPercent = sanitizeNumber(form.brokerPercent);
  const renovationCost = sanitizeNumber(form.renovationCost);
  const appraiserCost = sanitizeNumber(form.appraiserCost);
  const extraCosts = sanitizeNumber(form.extraCosts);
  const showMortgageCosts = form.showMortgageCosts === 'yes';
  const mortgageRegistryCost = sanitizeNumber(form.mortgageRegistryCost);

  const lawyerCost = hasLawyer ? propertyPrice * (lawyerPercent / 100) * 1.18 : 0;
  const brokerCost = hasBroker ? propertyPrice * (brokerPercent / 100) * 1.18 : 0;

  let purchaseTax = 0;
  if (form.purchaseType === 'investment') {
    purchaseTax = propertyPrice * 0.08;
  } else if (taxMode === 'manual') {
    purchaseTax = manualPurchaseTax;
  }

  const mortgageOpeningCost = showMortgageCosts ? 360 : 0;
  const mortgageCostsTotal = showMortgageCosts ? mortgageOpeningCost + mortgageRegistryCost : 0;

  const totalAdditionalCosts =
    purchaseTax +
    lawyerCost +
    brokerCost +
    appraiserCost +
    renovationCost +
    extraCosts +
    mortgageCostsTotal;

  const totalDealCost = propertyPrice + totalAdditionalCosts;
  const additionalCostsPercent = propertyPrice > 0 ? (totalAdditionalCosts / propertyPrice) * 100 : 0;

  return {
    propertyPrice,
    purchaseTax,
    lawyerCost,
    brokerCost,
    appraiserCost,
    renovationCost,
    extraCosts,
    mortgageOpeningCost,
    mortgageRegistryCost,
    mortgageCostsTotal,
    totalAdditionalCosts,
    totalDealCost,
    additionalCostsPercent,
    showMortgageCosts,
  };
}

function CompoundInterestCalculator() {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    initialAmount: 100000,
    monthlyContribution: 1000,
    annualRate: 7,
    years: 10,
    compoundingFrequency: 'monthly',
  });

  const results = useMemo(() => calculateCompoundInterest(form), [form]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: String(event.target.value).replace(/,/g, ''),
    }));
  };

  const summaryCards = [
    {
      title: 'הסכום העתידי שלך',
      value: formatCurrency(results.finalBalance),
      icon: TrendingUp,
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300',
    },
    {
      title: 'סך כל ההפקדות',
      value: formatCurrency(results.totalDeposits),
      icon: PiggyBank,
      tone: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300',
    },
    {
      title: 'רווח מהריבית',
      value: formatCurrency(results.totalInterest),
      icon: Landmark,
      tone: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/50 dark:text-amber-300',
    },
  ];

  const chartConfig = {
    balance: { label: 'יתרה', color: '#059669' },
    deposits: { label: 'סך הפקדות', color: '#2563eb' },
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">נתוני חישוב</h2>
            <p className="text-sm text-muted-foreground mt-1">מלא את הפרטים ונחשב את הצמיחה הצפויה</p>
          </div>

          <div>
            <Label>סכום התחלתי</Label>
            <Input type="text" inputMode="numeric" value={formatInputNumber(form.initialAmount)} onChange={handleChange('initialAmount')} className="mt-1" />
          </div>

          <div>
            <Label>הפקדה חודשית קבועה</Label>
            <Input type="text" inputMode="numeric" value={formatInputNumber(form.monthlyContribution)} onChange={handleChange('monthlyContribution')} className="mt-1" />
          </div>

          <div>
            <Label>ריבית שנתית באחוזים</Label>
            <div className="relative mt-1">
              <Input type="text" inputMode="decimal" value={formatInputNumber(form.annualRate)} onChange={handleChange('annualRate')} className="pl-10" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>

          <div>
            <Label>תקופת השקעה בשנים</Label>
            <Input type="text" inputMode="numeric" value={formatInputNumber(form.years)} onChange={handleChange('years')} className="mt-1" />
          </div>

          <div>
            <Label>תדירות חישוב ריבית</Label>
            <Select value={form.compoundingFrequency} onValueChange={(value) => setForm((prev) => ({ ...prev, compoundingFrequency: value }))}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {summaryCards.map(({ title, value, icon: Icon, tone }) => (
              <div key={title} className={`rounded-2xl border p-4 md:p-5 text-right ${tone}`}>
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/70 dark:bg-slate-950/70 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium opacity-90">{title}</p>
                <p className="text-base md:text-xl font-bold mt-1 text-foreground leading-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground">גרף צמיחה</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-6">
                השוואה בין היתרה המצטברת לבין סך ההפקדות לאורך הזמן
              </p>
            </div>

            {results.yearlyData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">הזן מספר שנים גדול מאפס כדי לראות גרף</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[180px] md:h-[320px] w-full">
                <AreaChart
                  data={results.yearlyData}
                  margin={{ top: 4, right: isMobile ? 0 : 16, left: isMobile ? 0 : 12, bottom: isMobile ? 2 : 12 }}
                >
                  <defs>
                    <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="fillDeposits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-deposits)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--color-deposits)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} horizontal={!isMobile} />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={isMobile ? 2 : 8}
                    minTickGap={isMobile ? 18 : 24}
                    tick={{ fontSize: isMobile ? 12 : 14 }}
                  />
                  <YAxis
                    hide={isMobile}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                    width={90}
                  />
                  <ChartTooltip
                    content={(
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <>
                            <span className="text-muted-foreground">{name === 'balance' ? 'יתרה' : 'סך הפקדות'}</span>
                            <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                          </>
                        )}
                        labelFormatter={(label) => `שנה ${label}`}
                      />
                    )}
                  />
                  {!isMobile ? <ChartLegend content={<ChartLegendContent />} /> : null}
                  <Area type="monotone" dataKey="deposits" name="deposits" stroke="var(--color-deposits)" fill="url(#fillDeposits)" strokeWidth={2} />
                  <Area type="monotone" dataKey="balance" name="balance" stroke="var(--color-balance)" fill="url(#fillBalance)" strokeWidth={3} />
                </AreaChart>
              </ChartContainer>
            )}

            {results.yearlyData.length > 0 && isMobile ? (
              <div className="flex items-center justify-center gap-4 pt-2 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <span className="h-3 w-3 rounded-sm bg-[#059669]" />
                  יתרה
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <span className="h-3 w-3 rounded-sm bg-[#2563eb]" />
                  סך הפקדות
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground">טבלת צמיחה שנתית</h3>
              <p className="text-sm text-muted-foreground mt-1">פירוט לפי שנה של היתרה, ההפקדות והרווח</p>
            </div>

            {results.yearlyData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">הזן מספר שנים גדול מאפס כדי לראות תחזית</div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {results.yearlyData.map((row) => (
                    <div key={row.year} className="rounded-xl border border-border p-4 space-y-2">
                      <div className="font-semibold text-foreground">שנה {row.year}</div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">יתרה</span>
                        <span className="text-foreground font-medium">{formatCurrency(row.balance)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">סך הפקדות</span>
                        <span className="text-foreground font-medium">{formatCurrency(row.totalDeposits)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">רווח מהריבית</span>
                        <span className="text-emerald-700 font-medium">{formatCurrency(row.totalInterest)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
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
              </>
            )}
          </div>
        </div>
      </div>

      <CalculatorDisclaimer />
    </div>
  );
}

function LoanInputCard({ loan, index, onChange, onToggleExisting }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">הלוואה {index + 1}</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">
            הזן את הנתונים כדי להשוות מול ההלוואות האחרות
          </p>
        </div>
        {loan.isExisting ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1 text-xs font-medium">
            הלוואה קיימת
          </span>
        ) : null}
      </div>

      <div>
        <Label>שם הלוואה</Label>
        <Input value={loan.name} onChange={(event) => onChange('name', event.target.value)} className="mt-1" />
      </div>

      <div>
        <Label>סכום הלוואה / יתרה</Label>
        <Input type="text" inputMode="numeric" value={formatInputNumber(loan.amount)} onChange={(event) => onChange('amount', event.target.value.replace(/,/g, ''))} className="mt-1" />
      </div>

      <div>
        <Label>ריבית שנתית</Label>
        <div className="relative mt-1">
          <Input type="text" inputMode="decimal" value={formatInputNumber(loan.annualRate)} onChange={(event) => onChange('annualRate', event.target.value.replace(/,/g, ''))} className="pl-10" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
      </div>

      <div>
        <Label>תקופה בחודשים</Label>
        <Input type="text" inputMode="numeric" value={formatInputNumber(loan.months)} onChange={(event) => onChange('months', event.target.value.replace(/,/g, ''))} className="mt-1" />
      </div>

      <div>
        <Label>עלויות חד פעמיות</Label>
        <Input type="text" inputMode="numeric" value={formatInputNumber(loan.oneTimeCosts)} onChange={(event) => onChange('oneTimeCosts', event.target.value.replace(/,/g, ''))} className="mt-1" />
      </div>

      <div>
        <Label>פירעון חלקי</Label>
        <Input type="text" inputMode="numeric" value={formatInputNumber(loan.partialRepayment)} onChange={(event) => onChange('partialRepayment', event.target.value.replace(/,/g, ''))} className="mt-1" />
      </div>

      <div>
        <Label>סוג גרייס</Label>
        <Select value={loan.graceType || 'none'} onValueChange={(value) => onChange('graceType', value)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ללא גרייס</SelectItem>
            <SelectItem value="partial">גרייס חלקי</SelectItem>
            <SelectItem value="full">גרייס מלא</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loan.graceType && loan.graceType !== 'none' ? (
        <div>
          <Label>משך גרייס בחודשים</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={formatInputNumber(loan.graceMonths)}
            onChange={(event) => onChange('graceMonths', event.target.value.replace(/,/g, ''))}
            className="mt-1"
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={loan.isExisting} onChange={(event) => onToggleExisting(event.target.checked)} />
        סמן כהלוואה קיימת
      </label>
    </div>
  );
}

function LoanComparisonCalculator() {
  const isMobile = useIsMobile();
  const [loans, setLoans] = useState([
    {
      id: 'loan-1',
      name: 'הלוואה 1',
      amount: 250000,
      annualRate: 6.5,
      months: 60,
      oneTimeCosts: 0,
      partialRepayment: 0,
      graceType: 'none',
      graceMonths: 0,
      isExisting: true,
      enabled: true,
    },
    {
      id: 'loan-2',
      name: 'הלוואה 2',
      amount: 250000,
      annualRate: 5.9,
      months: 72,
      oneTimeCosts: 1500,
      partialRepayment: 0,
      graceType: 'none',
      graceMonths: 0,
      isExisting: false,
      enabled: true,
    },
    {
      id: 'loan-3',
      name: 'הלוואה 3',
      amount: 250000,
      annualRate: 5.2,
      months: 84,
      oneTimeCosts: 2500,
      partialRepayment: 0,
      graceType: 'none',
      graceMonths: 0,
      isExisting: false,
      enabled: false,
    },
  ]);

  const setLoanValue = (loanId, field, value) => {
    setLoans((prev) =>
      prev.map((loan) => (loan.id === loanId ? { ...loan, [field]: value } : loan)),
    );
  };

  const loansWithMetrics = useMemo(
    () => loans.map((loan) => ({ ...loan, metrics: calculateLoanMetrics(loan) })),
    [loans],
  );

  const activeLoans = loansWithMetrics.filter((loan) => loan.enabled);
  const benchmarkLoan = activeLoans.find((loan) => loan.isExisting) || null;

  const lowestMonthlyPaymentId = activeLoans.reduce((best, loan) => (
    !best || loan.metrics.monthlyPayment < best.metrics.monthlyPayment ? loan : best
  ), null)?.id;

  const lowestTotalCostId = activeLoans.reduce((best, loan) => (
    !best || loan.metrics.totalCost < best.metrics.totalCost ? loan : best
  ), null)?.id;

  const lowestCostPerShekelId = activeLoans.reduce((best, loan) => (
    !best || loan.metrics.costPerBorrowedShekel < best.metrics.costPerBorrowedShekel ? loan : best
  ), null)?.id;

  const insights = buildLoanInsights(loansWithMetrics);

  const comparisonChartData = activeLoans.map((loan) => ({
    name: loan.name,
    monthlyPayment: Math.round(loan.metrics.monthlyPayment),
    totalCost: Math.round(loan.metrics.totalCost),
    costPerBorrowedShekel: Number(loan.metrics.costPerBorrowedShekel.toFixed(3)),
    monthlyLeader: loan.id === lowestMonthlyPaymentId,
    totalCostLeader: loan.id === lowestTotalCostId,
    ratioLeader: loan.id === lowestCostPerShekelId,
  }));

  const monthlyPaymentChartConfig = {
    monthlyPayment: { label: 'החזר חודשי', color: '#2563eb' },
  };

  const totalCostChartConfig = {
    totalCost: { label: 'עלות כוללת', color: '#059669' },
  };

  const ratioChartConfig = {
    costPerBorrowedShekel: { label: 'עלות לכל שקל', color: '#d97706' },
  };

  const renderCurrencyBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-foreground text-xs font-medium">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderRatioBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-foreground text-xs font-medium">
        {Number(value).toFixed(3)}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">השוואת הלוואות</h2>
          <p className="text-sm text-muted-foreground mt-1">השווה בין עד 3 הלוואות לפי החזר, עלות, ריבית ועלויות חד פעמיות</p>
        </div>

        {!loans[2].enabled ? (
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLoanValue('loan-3', 'enabled', true)}>
            הוסף הלוואה
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {activeLoans.map((loan, index) => (
          <LoanInputCard
            key={loan.id}
            loan={loan}
            index={index}
            onChange={(field, value) => setLoanValue(loan.id, field, value)}
            onToggleExisting={(checked) => {
              setLoans((prev) =>
                prev.map((item) => ({
                  ...item,
                  isExisting: item.id === loan.id ? checked : checked ? false : item.isExisting,
                })),
              );
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeLoans.map((loan) => {
          const { metrics } = loan;
          const badges = [
            loan.id === lowestMonthlyPaymentId ? 'החזר חודשי נמוך ביותר' : null,
            loan.id === lowestTotalCostId ? 'עלות כוללת נמוכה ביותר' : null,
            loan.id === lowestCostPerShekelId ? 'עלות לשקל נמוכה ביותר' : null,
          ].filter(Boolean);

          return (
            <div key={loan.id} className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground">{loan.name}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">
                    {loan.isExisting ? 'מסומנת כהלוואה קיימת' : 'אפשרות להשוואה'}
                  </p>
                </div>
                <Scale className="w-5 h-5 text-primary shrink-0" />
              </div>

              {badges.length ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span key={badge} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">החזר חודשי</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.monthlyPayment)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">סך תשלום</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.totalPayments)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">סך ריבית</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.totalInterest)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">עלות כוללת</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.totalCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">עלות לכל 1 ₪</span>
                  <span className="font-semibold text-foreground">{metrics.costPerBorrowedShekel.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">גרייס</span>
                  <span className="font-semibold text-foreground">
                    {metrics.graceType === 'none'
                      ? 'ללא'
                      : `${metrics.graceType === 'full' ? 'מלא' : 'חלקי'} • ${metrics.graceMonths} חוד'`}
                  </span>
                </div>
              </div>

              {benchmarkLoan && benchmarkLoan.id !== loan.id ? (
                <div className="pt-3 border-t border-border space-y-2 text-xs md:text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">פער בהחזר חודשי</span>
                    <span className={loan.metrics.monthlyPayment <= benchmarkLoan.metrics.monthlyPayment ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                      {loan.metrics.monthlyPayment - benchmarkLoan.metrics.monthlyPayment >= 0 ? '+' : ''}
                      {formatCurrency(loan.metrics.monthlyPayment - benchmarkLoan.metrics.monthlyPayment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">פער בעלות כוללת</span>
                    <span className={loan.metrics.totalCost <= benchmarkLoan.metrics.totalCost ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                      {loan.metrics.totalCost - benchmarkLoan.metrics.totalCost >= 0 ? '+' : ''}
                      {formatCurrency(loan.metrics.totalCost - benchmarkLoan.metrics.totalCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">פער במשך</span>
                    <span className="font-medium text-foreground">
                      {loan.metrics.months - benchmarkLoan.metrics.months >= 0 ? '+' : ''}
                      {loan.metrics.months - benchmarkLoan.metrics.months} חוד'
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
        <div className="mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-foreground">טבלת השוואה</h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">השוואה ישירה בין כל ההלוואות הפעילות</p>
        </div>

        <div className="space-y-3 md:hidden">
          {activeLoans.map((loan) => (
            <div key={loan.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="font-semibold text-foreground">{loan.name}</div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">החזר חודשי</span>
                <span className="font-medium">{formatCurrency(loan.metrics.monthlyPayment)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">סך תשלום</span>
                <span className="font-medium">{formatCurrency(loan.metrics.totalPayments)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">סך ריבית</span>
                <span className="font-medium">{formatCurrency(loan.metrics.totalInterest)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">עלות כוללת</span>
                <span className="font-medium">{formatCurrency(loan.metrics.totalCost)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">עלות לכל 1 ₪</span>
                <span className="font-medium">{loan.metrics.costPerBorrowedShekel.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[780px] text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-3 px-2 font-medium">הלוואה</th>
                <th className="text-right py-3 px-2 font-medium">החזר חודשי</th>
                <th className="text-right py-3 px-2 font-medium">סך תשלום</th>
                <th className="text-right py-3 px-2 font-medium">סך ריבית</th>
                <th className="text-right py-3 px-2 font-medium">עלויות חד פעמיות</th>
                <th className="text-right py-3 px-2 font-medium">עלות כוללת</th>
                <th className="text-right py-3 px-2 font-medium">עלות לכל 1 ₪</th>
                <th className="text-right py-3 px-2 font-medium">גרייס</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 px-2 font-medium text-foreground">{loan.name}</td>
                  <td className={`py-3 px-2 ${loan.id === lowestMonthlyPaymentId ? 'text-emerald-700 font-semibold' : 'text-foreground'}`}>
                    {formatCurrency(loan.metrics.monthlyPayment)}
                  </td>
                  <td className="py-3 px-2 text-foreground">{formatCurrency(loan.metrics.totalPayments)}</td>
                  <td className="py-3 px-2 text-foreground">
                    {formatCurrency(loan.metrics.totalInterest)}
                  </td>
                  <td className="py-3 px-2 text-foreground">{formatCurrency(loan.metrics.oneTimeFees)}</td>
                  <td className={`py-3 px-2 ${loan.id === lowestTotalCostId ? 'text-emerald-700 font-semibold' : 'text-foreground'}`}>
                    {formatCurrency(loan.metrics.totalCost)}
                  </td>
                  <td className={`py-3 px-2 ${loan.id === lowestCostPerShekelId ? 'text-amber-700 font-semibold' : 'text-foreground'}`}>
                    {loan.metrics.costPerBorrowedShekel.toFixed(3)}
                  </td>
                  <td className="py-3 px-2 text-foreground">
                    {loan.metrics.graceType === 'none'
                      ? 'ללא'
                      : `${loan.metrics.graceType === 'full' ? 'מלא' : 'חלקי'} • ${loan.metrics.graceMonths} חוד'`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">השוואת החזר חודשי</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">השוואה בין גובה התשלום החודשי בכל חלופה</p>
              </div>

              <ChartContainer config={monthlyPaymentChartConfig} className="h-[260px] md:h-[320px] w-full">
                <BarChart
                  data={comparisonChartData}
                  margin={{ top: 24, right: isMobile ? 8 : 28, left: isMobile ? 8 : 12, bottom: 12 }}
                  barCategoryGap={isMobile ? '22%' : '24%'}
                  barGap={isMobile ? 10 : 8}
                >
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: isMobile ? 12 : 14 }} />
                  <YAxis
                    hide={isMobile}
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                    width={110}
                    tickMargin={10}
                  />
                  <ChartTooltip
                    content={(
                      <ChartTooltipContent
                        formatter={(value) => (
                          <>
                            <span className="text-muted-foreground">החזר חודשי</span>
                            <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                          </>
                        )}
                      />
                    )}
                  />
                  <Bar
                    dataKey="monthlyPayment"
                    name="monthlyPayment"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={isMobile ? 42 : 72}
                  >
                    {comparisonChartData.map((entry) => (
                      <Cell
                        key={`${entry.name}-monthly`}
                        fill={entry.monthlyLeader ? '#1d4ed8' : 'var(--color-monthlyPayment)'}
                      />
                    ))}
                    <LabelList dataKey="monthlyPayment" content={renderCurrencyBarLabel} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">השוואת עלות כוללת</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">השוואה בין העלות הכוללת של כל חלופה לאורך כל התקופה</p>
              </div>

              <ChartContainer config={totalCostChartConfig} className="h-[260px] md:h-[320px] w-full">
                <BarChart
                  data={comparisonChartData}
                  margin={{ top: 24, right: isMobile ? 8 : 28, left: isMobile ? 8 : 12, bottom: 12 }}
                  barCategoryGap={isMobile ? '22%' : '24%'}
                  barGap={isMobile ? 10 : 8}
                >
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: isMobile ? 12 : 14 }} />
                  <YAxis
                    hide={isMobile}
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                    width={110}
                    tickMargin={10}
                  />
                  <ChartTooltip
                    content={(
                      <ChartTooltipContent
                        formatter={(value) => (
                          <>
                            <span className="text-muted-foreground">עלות כוללת</span>
                            <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                          </>
                        )}
                      />
                    )}
                  />
                  <Bar
                    dataKey="totalCost"
                    name="totalCost"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={isMobile ? 42 : 72}
                  >
                    {comparisonChartData.map((entry) => (
                      <Cell
                        key={`${entry.name}-total`}
                        fill={entry.totalCostLeader ? '#047857' : 'var(--color-totalCost)'}
                      />
                    ))}
                    <LabelList dataKey="totalCost" content={renderCurrencyBarLabel} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <div className="mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-foreground">עלות לכל שקל הלוואה</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">כמה משלם הלקוח בפועל על כל 1 ₪ שהוא לווה</p>
            </div>

            <ChartContainer config={ratioChartConfig} className="h-[260px] md:h-[320px] w-full">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 24, right: isMobile ? 8 : 28, left: isMobile ? 8 : 12, bottom: 12 }}
                barCategoryGap={isMobile ? '22%' : '24%'}
                barGap={isMobile ? 10 : 8}
              >
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: isMobile ? 12 : 14 }} />
                <YAxis
                  hide={isMobile}
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => Number(value).toFixed(2)}
                  width={84}
                  tickMargin={10}
                />
                <ChartTooltip
                  content={(
                    <ChartTooltipContent
                      formatter={(value) => (
                        <>
                          <span className="text-muted-foreground">עלות לכל 1 ₪ הלוואה</span>
                          <span className="font-medium text-foreground">{`${Number(value).toFixed(3)} ₪`}</span>
                        </>
                      )}
                      labelFormatter={(label) => `על כל 1 ₪ שנלקח, מוחזרים ${comparisonChartData.find((item) => item.name === label)?.costPerBorrowedShekel.toFixed(3)} ₪`}
                    />
                  )}
                />
                <Bar
                  dataKey="costPerBorrowedShekel"
                  name="costPerBorrowedShekel"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={isMobile ? 42 : 72}
                >
                  {comparisonChartData.map((entry) => (
                    <Cell
                      key={`${entry.name}-ratio`}
                      fill={entry.ratioLeader ? '#b45309' : 'var(--color-costPerBorrowedShekel)'}
                    />
                  ))}
                  <LabelList dataKey="costPerBorrowedShekel" content={renderRatioBarLabel} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <div className="mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-foreground">תובנות</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">סיכום מהיר של היתרונות היחסיים בכל חלופה</p>
            </div>

            <div className="space-y-3">
              {insights.map((insight) => (
                <div key={insight.title} className={`rounded-xl border p-4 ${insight.tone}`}>
                  <div className="font-semibold">{insight.title}</div>
                  <p className="text-xs md:text-sm mt-1 leading-6">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {benchmarkLoan ? (
            <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">הלוואה קיימת להשוואה</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">כרגע מסומנת כבסיס להשוואה מול יתר ההצעות</p>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50 p-4">
                <div className="font-semibold text-foreground">{benchmarkLoan.name}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">החזר חודשי: {formatCurrency(benchmarkLoan.metrics.monthlyPayment)}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">עלות כוללת: {formatCurrency(benchmarkLoan.metrics.totalCost)}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">משך: {benchmarkLoan.metrics.months} חודשים</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <CalculatorDisclaimer />
    </div>
  );
}

function PropertyPurchaseCostsCalculator() {
  const [form, setForm] = useState({
    propertyPrice: 2000000,
    purchaseType: 'single',
    purchaseTaxMode: 'manual',
    manualPurchaseTax: 0,
    hasLawyer: 'yes',
    lawyerPercent: 0.5,
    hasBroker: 'yes',
    brokerPercent: 1.5,
    renovationCost: 0,
    appraiserCost: 2500,
    extraCosts: 0,
    showMortgageCosts: 'yes',
    mortgageRegistryCost: 1000,
  });

  const results = useMemo(() => calculatePropertyPurchaseCosts(form), [form]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: String(event.target.value).replace(/,/g, ''),
    }));
  };

  const rows = [
    { label: 'מחיר הנכס', value: results.propertyPrice },
    { label: 'מס רכישה', value: results.purchaseTax },
    { label: 'עורך דין', value: results.lawyerCost },
    { label: 'מתווך', value: results.brokerCost },
    { label: 'שמאי', value: results.appraiserCost },
    { label: 'שיפוץ', value: results.renovationCost },
    ...(results.showMortgageCosts
      ? [
          { label: 'פתיחת תיק משכנתא', value: results.mortgageOpeningCost },
          { label: 'רישומים / אגרות משכנתא', value: results.mortgageRegistryCost },
        ]
      : []),
    { label: 'הוצאות נוספות', value: results.extraCosts },
  ];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">נתוני עסקה</h2>
            <p className="text-sm text-muted-foreground mt-1">הזן את פרטי העסקה וקבל הערכה לכל העלויות הנלוות</p>
          </div>

          <div>
            <Label>מחיר הנכס</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatInputNumber(form.propertyPrice)}
              onChange={handleChange('propertyPrice')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>סוג הרכישה</Label>
            <Select value={form.purchaseType} onValueChange={(value) => setForm((prev) => ({ ...prev, purchaseType: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">דירה יחידה / ראשונה</SelectItem>
                <SelectItem value="investment">דירה נוספת / השקעה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.purchaseType === 'single' ? (
            <div>
              <Label>מס רכישה לדירה יחידה</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputNumber(form.manualPurchaseTax)}
                onChange={handleChange('manualPurchaseTax')}
                className="mt-1"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>האם יש עורך דין?</Label>
              <Select value={form.hasLawyer} onValueChange={(value) => setForm((prev) => ({ ...prev, hasLawyer: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">כן</SelectItem>
                  <SelectItem value="no">לא</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>עלות עורך דין (%)</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatInputNumber(form.lawyerPercent)}
                  onChange={handleChange('lawyerPercent')}
                  className="pl-10"
                  disabled={form.hasLawyer !== 'yes'}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>האם יש מתווך?</Label>
              <Select value={form.hasBroker} onValueChange={(value) => setForm((prev) => ({ ...prev, hasBroker: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">כן</SelectItem>
                  <SelectItem value="no">לא</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>עלות מתווך (%)</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatInputNumber(form.brokerPercent)}
                  onChange={handleChange('brokerPercent')}
                  className="pl-10"
                  disabled={form.hasBroker !== 'yes'}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>

          <div>
            <Label>עלות שיפוץ</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatInputNumber(form.renovationCost)}
              onChange={handleChange('renovationCost')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>עלות שמאי</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatInputNumber(form.appraiserCost)}
              onChange={handleChange('appraiserCost')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>הוצאות נוספות כלליות</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatInputNumber(form.extraCosts)}
              onChange={handleChange('extraCosts')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>האם להציג עלויות משכנתא?</Label>
            <Select value={form.showMortgageCosts} onValueChange={(value) => setForm((prev) => ({ ...prev, showMortgageCosts: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">כן</SelectItem>
                <SelectItem value="no">לא</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.showMortgageCosts === 'yes' ? (
            <>
              <div>
                <Label>רישומים / אגרות</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(form.mortgageRegistryCost)}
                  onChange={handleChange('mortgageRegistryCost')}
                  className="mt-1"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-900/50 p-5 text-right">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">סך העלויות הנלוות</p>
              <p className="text-lg md:text-xl font-bold mt-2 text-foreground">{formatCurrency(results.totalAdditionalCosts)}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/25 dark:border-emerald-900/50 p-5 text-right">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">עלות כוללת של העסקה</p>
              <p className="text-lg md:text-xl font-bold mt-2 text-foreground">{formatCurrency(results.totalDealCost)}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/25 dark:border-blue-900/50 p-5 text-right">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">אחוז עלויות נלוות</p>
              <p className="text-lg md:text-xl font-bold mt-2 text-foreground">{formatPercent(results.additionalCostsPercent, 1)}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 md:p-5">
            <div className="mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-foreground">פירוט עלויות</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-5">פירוט מלא של רכיבי העלות מעבר למחיר הנכס</p>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/25 dark:border-amber-900/50 px-4 py-4">
              <span className="font-semibold text-amber-900 dark:text-amber-300">סך העלויות הנלוות</span>
              <span className="font-bold text-foreground">{formatCurrency(results.totalAdditionalCosts)}</span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50 px-4 py-4">
              <span className="font-semibold text-emerald-900 dark:text-emerald-300">העלות הכוללת של העסקה</span>
              <span className="font-bold text-foreground">{formatCurrency(results.totalDealCost)}</span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50 px-4 py-4">
              <span className="font-semibold text-blue-900 dark:text-blue-300">אחוז העלויות מתוך מחיר הנכס</span>
              <span className="font-bold text-foreground">{formatPercent(results.additionalCostsPercent, 1)}</span>
            </div>
          </div>
        </div>
      </div>

      <CalculatorDisclaimer text="הנתונים המוצגים במחשבון זה מהווים הערכה כללית בלבד. העלויות בפועל עשויות להשתנות בהתאם לסוג העסקה, נותני השירות, תנאי הבנק והוראות המס העדכניות." />
    </div>
  );
}

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState(searchParams.get('tool') || null);

  useEffect(() => {
    setActiveTool(searchParams.get('tool') || null);
  }, [searchParams]);

  const toolCards = [
    {
      id: 'compound-interest',
      title: 'מחשבון ריבית דריבית',
      description: 'חישוב צמיחה של סכום התחלתי, הפקדה חודשית וריבית לאורך זמן.',
      icon: Calculator,
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300',
    },
    {
      id: 'loan-comparison',
      title: 'מחשבון כדאיות הלוואה',
      description: 'השוואה בין עד 3 הלוואות לפי החזר חודשי, עלות כוללת, ריבית ועלויות חד פעמיות.',
      icon: Scale,
      tone: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300',
    },
    {
      id: 'property-purchase-costs',
      title: 'מחשבון עלויות נלוות לרכישת דירה',
      description: 'הערכת כלל העלויות הנלוות לעסקת רכישת דירה מעבר למחיר הנכס עצמו.',
      icon: Landmark,
      tone: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/50 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">כלים שימושיים</h1>
          <p className="text-muted-foreground mt-1">
            {activeTool
              ? 'מחשבונים פרקטיים לקבלת החלטות פיננסיות חכמות'
              : 'מרכז כלים ומחשבונים שיעזרו לך לקבל החלטות פיננסיות בצורה חכמה יותר'}
          </p>
        </div>

        {activeTool ? (
          <Button
            type="button"
            className="gap-2 shrink-0 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-red-600"
            onClick={() => {
              setActiveTool(null);
              setSearchParams({});
            }}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לכל הכלים
          </Button>
        ) : null}
      </div>

      {!activeTool ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {toolCards.map(({ id, title, description, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTool(id);
                setSearchParams({ tool: id });
              }}
              className={`rounded-2xl border p-6 text-right transition-all hover:shadow-md hover:-translate-y-0.5 ${tone}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-950/70 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 opacity-70 shrink-0" />
              </div>
              <h2 className="text-xl font-semibold text-foreground dark:text-slate-100 mt-6">{title}</h2>
              <p className="text-sm text-muted-foreground dark:text-slate-300 mt-2 leading-6">{description}</p>
            </button>
          ))}
        </div>
      ) : null}

      {activeTool === 'compound-interest' ? <CompoundInterestCalculator /> : null}
      {activeTool === 'loan-comparison' ? <LoanComparisonCalculator /> : null}
      {activeTool === 'property-purchase-costs' ? <PropertyPurchaseCostsCalculator /> : null}
    </div>
  );
}
