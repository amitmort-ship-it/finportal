import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calculator,
  EyeOff,
  Info,
  Lock,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { createManualForecastCurve } from '@/lib/forecast/manualForecastProvider';
import { calculateMortgageMixSchedule } from '@/lib/calculations/mortgageEngine';
import { validateMortgageSimulation } from '@/lib/validation/mortgageValidation';
import {
  formatCurrency,
  formatInputNumber,
  formatMonths,
  formatPercent,
  sanitizeNumber,
} from '@/lib/formatters/mortgageFormatters';
import {
  AMORTIZATION_TYPES,
  LOAN_TYPES,
  PURPOSE_OPTIONS,
  FORECAST_SCENARIOS,
  createDefaultSimulationState,
  createDefaultTrack,
  getLoanTypeMeta,
} from '@/types/mortgage';

const chartConfig = {
  payment: { label: 'החזר חודשי', color: '#4e7b95' },
  balance: { label: 'יתרת חוב', color: '#305d78' },
};

const fieldClassName =
  'h-14 rounded-none border-0 bg-white text-right text-[15px] shadow-none focus-visible:ring-1 focus-visible:ring-[#2b7de0]';
const sectionTitleClassName = 'bg-[#4f7992] px-5 py-3 text-right text-[17px] font-medium text-white';
const headerCellClassName = 'bg-[#4f7992] px-3 py-3 text-center text-white text-sm font-medium';

function ToolbarChip({ children, active = false }) {
  return (
    <button
      type="button"
      className={`rounded-full px-6 py-3 text-sm font-medium transition-colors ${
        active ? 'bg-[#1477d4] text-white' : 'bg-[#e3e7eb] text-[#536575]'
      }`}
    >
      {children}
    </button>
  );
}

function TopActionButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      className="inline-flex h-12 min-w-12 items-center justify-center rounded-full border border-[#1d7ae0] px-4 text-[#1d7ae0]"
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function SummaryStrip({ state, totalTracksPrincipal }) {
  const items = [
    { label: 'כותרת התמהיל', value: state.simulation.name },
    { label: 'גובה משכנתה', value: formatCurrency(state.simulation.requestedLoanAmount) },
    { label: 'יתרה להזנה', value: formatCurrency(Math.max(0, state.simulation.requestedLoanAmount - totalTracksPrincipal)) },
    { label: 'מטרה', value: PURPOSE_OPTIONS.find((item) => item.value === state.simulation.purpose)?.label || '-' },
    { label: 'הכנסה נטו', value: formatCurrency(state.client.householdIncomeNet) },
    { label: 'יעד החזר', value: formatCurrency(state.simulation.targetMonthlyPayment) },
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-[20px] bg-[#dfe4ea] xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="bg-[#f3f4f7] px-4 py-4 text-right">
          <div className="mb-2 text-sm text-[#7c8793]">{item.label}</div>
          <div className="text-[15px] font-medium text-[#46525d]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function InputCell({ label, value, onChange }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="mb-2 text-sm text-[#7b8591]">{label}</div>
      <Input className={fieldClassName} value={value} onChange={onChange} />
    </div>
  );
}

function SelectCell({ label, value, onValueChange, options }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="mb-2 text-sm text-[#7b8591]">{label}</div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={fieldClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MixTableRow({ track, onChange, onDelete }) {
  const loanMeta = getLoanTypeMeta(track.loanType);
  const estimatedShare = `${Math.round((track.principal / 900000) * 100 || 0)}%`;

  return (
    <tr className="border-b border-[#d8dee4] bg-[#dcebf3]/60">
      <td className="p-2">
        <Input className={fieldClassName} value={estimatedShare} readOnly />
      </td>
      <td className="p-2">
        <Select value={track.amortizationType} onValueChange={(value) => onChange('amortizationType', value)}>
          <SelectTrigger className={fieldClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AMORTIZATION_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Select value={track.loanType} onValueChange={(value) => onChange('loanType', value)}>
          <SelectTrigger className={fieldClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOAN_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={formatInputNumber(track.changeFrequencyMonths)}
          onChange={(event) => onChange('changeFrequencyMonths', sanitizeNumber(event.target.value))}
        />
      </td>
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={formatInputNumber(track.principal)}
          onChange={(event) => onChange('principal', sanitizeNumber(event.target.value))}
        />
      </td>
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={formatInputNumber(track.termMonths)}
          onChange={(event) => onChange('termMonths', sanitizeNumber(event.target.value))}
        />
      </td>
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={track.customerMargin}
          onChange={(event) => onChange('customerMargin', Number(event.target.value || 0))}
        />
      </td>
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={loanMeta.linked ? 'צמוד' : 'לא צמוד'}
          readOnly
        />
      </td>
      <td className="w-[144px] bg-[#ececec] p-2 text-center">
        <button type="button" onClick={onDelete} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#ff7a59]">
          <Trash2 className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}

function ResultTile({ label, value }) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
      <div className="bg-[#4f7992] px-6 py-4 text-right text-[18px] font-medium text-white">{label}</div>
      <div className="min-h-[90px] px-6 py-6 text-right text-[24px] text-[#415464]">{value}</div>
    </div>
  );
}

function ComparisonRow({ label, current, recommended, diff }) {
  return (
    <tr className="border-b border-[#e8edf1]">
      <td className="px-4 py-4 text-right text-[#3f5563]">{label}</td>
      <td className="px-4 py-4 text-center text-[#2757c6]">{current}</td>
      <td className="px-4 py-4 text-center text-[#ff5a1f]">{recommended}</td>
      <td className="px-4 py-4 text-center text-[#667784]">{diff}</td>
    </tr>
  );
}

export default function MortgageSimulationsPage() {
  const [state, setState] = useState(createDefaultSimulationState);
  const [calculationNonce, setCalculationNonce] = useState(0);

  const forecastCurve = useMemo(
    () => createManualForecastCurve(state.forecast),
    [state.forecast, calculationNonce]
  );

  const result = useMemo(
    () => calculateMortgageMixSchedule({
      simulation: state,
      tracks: state.tracks,
      forecastCurve,
    }),
    [forecastCurve, state, calculationNonce]
  );

  const warnings = useMemo(
    () => validateMortgageSimulation({
      simulation: state.simulation,
      forecast: state.forecast,
      tracks: state.tracks,
    }),
    [state]
  );

  const chartRows = result.monthlyRows.slice(0, 180).map((row) => ({
    month: row.monthNumber,
    payment: Math.round(row.monthlyPayment),
    balance: Math.round(row.closingBalance),
  }));

  const totalTracksPrincipal = state.tracks.reduce((sum, track) => sum + (Number(track.principal) || 0), 0);

  const updateClient = (field, value) => {
    setState((current) => ({
      ...current,
      client: { ...current.client, [field]: value },
    }));
  };

  const updateSimulation = (field, value) => {
    setState((current) => ({
      ...current,
      simulation: { ...current.simulation, [field]: value },
    }));
  };

  const updateForecast = (field, value) => {
    setState((current) => ({
      ...current,
      forecast: { ...current.forecast, [field]: value },
    }));
  };

  const updateTrack = (trackId, field, value) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.map((track) => {
        if (track.id !== trackId) return track;
        const nextTrack = { ...track, [field]: value };

        if (field === 'loanType') {
          const meta = getLoanTypeMeta(value);
          nextTrack.isLinkedToCpi = meta.linked;
        }

        return nextTrack;
      }),
    }));
  };

  const addTrack = () => {
    setState((current) => ({
      ...current,
      tracks: [...current.tracks, createDefaultTrack(current.tracks.length)],
    }));
  };

  const deleteTrack = (trackId) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== trackId),
    }));
  };

  const comparisonRows = [
    ['סכום הלוואה', formatCurrency(result.summary.totalLoanAmount), formatCurrency(result.summary.totalLoanAmount), 'הפרש'],
    ['מרווח שוק', formatPercent(result.summary.weightedAverageInterest), formatPercent(Math.max(0, result.summary.weightedAverageInterest - 0.25)), formatPercent(0.25)],
    ['תשלומי ריבית והצמדה', formatCurrency(result.summary.totalInterestAndIndexation), formatCurrency(result.summary.totalInterestAndIndexation * 0.92), formatCurrency(result.summary.totalInterestAndIndexation * 0.08)],
    ['תקופת הלוואה', formatMonths(result.summary.durationUntilFullRepayment), formatMonths(Math.max(0, result.summary.durationUntilFullRepayment - 24)), '-24 חודשים'],
    ['החזר ראשון', formatCurrency(result.summary.firstMonthlyPayment), formatCurrency(result.summary.firstMonthlyPayment * 0.96), formatCurrency(result.summary.firstMonthlyPayment * 0.04)],
    ['עלות כוללת', formatCurrency(result.summary.totalCost), formatCurrency(result.summary.totalCost * 0.91), formatCurrency(result.summary.totalCost * 0.09)],
  ];

  return (
    <div dir="rtl" className="space-y-6 bg-[#f2f4f7] pb-10">
      <div className="overflow-hidden rounded-[24px] border border-[#d9dee5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[18px] text-[#4f5c67]">סימולציה חדשה</div>
          <div className="flex flex-wrap items-center gap-3">
            <ToolbarChip>אישור עקרוני</ToolbarChip>
            <ToolbarChip active>שמירת סימולציה</ToolbarChip>
            <TopActionButton icon={EyeOff} label="תצוגה" />
            <TopActionButton icon={Lock} label="נעילה" />
            <TopActionButton icon={RefreshCcw} label="רענון" />
          </div>
        </div>

        <div className="space-y-6 border-t border-[#e3e7eb] bg-[#f4f5f7] p-4 md:p-6">
          <SummaryStrip state={state} totalTracksPrincipal={totalTracksPrincipal} />

          {warnings.length ? (
            <Card className="border-[#f2c699] bg-[#fff4e7]">
              <CardContent className="space-y-2 py-5 text-sm text-[#915f20]">
                {warnings.map((warning) => (
                  <div key={warning}>• {warning}</div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[24px] border border-[#d8dee4] bg-white">
                <div className={sectionTitleClassName}>נתוני תיק ותחזית</div>
                <div className="grid gap-px bg-[#dfe4ea] md:grid-cols-2 xl:grid-cols-4">
                  <InputCell label="שם פרטי" value={state.client.firstName} onChange={(event) => updateClient('firstName', event.target.value)} />
                  <InputCell label="שם משפחה" value={state.client.lastName} onChange={(event) => updateClient('lastName', event.target.value)} />
                  <InputCell label="הכנסה נטו" value={formatInputNumber(state.client.householdIncomeNet)} onChange={(event) => updateClient('householdIncomeNet', sanitizeNumber(event.target.value))} />
                  <InputCell label="התחייבויות" value={formatInputNumber(state.client.monthlyObligations)} onChange={(event) => updateClient('monthlyObligations', sanitizeNumber(event.target.value))} />
                  <SelectCell label="מטרת הסימולציה" value={state.simulation.purpose} onValueChange={(value) => updateSimulation('purpose', value)} options={PURPOSE_OPTIONS} />
                  <InputCell label="סכום משכנתה" value={formatInputNumber(state.simulation.requestedLoanAmount)} onChange={(event) => updateSimulation('requestedLoanAmount', sanitizeNumber(event.target.value))} />
                  <InputCell label="שווי נכס" value={formatInputNumber(state.simulation.propertyValue)} onChange={(event) => updateSimulation('propertyValue', sanitizeNumber(event.target.value))} />
                  <InputCell label="יעד החזר" value={formatInputNumber(state.simulation.targetMonthlyPayment)} onChange={(event) => updateSimulation('targetMonthlyPayment', sanitizeNumber(event.target.value))} />
                  <SelectCell label="סוג תחזית" value={state.forecast.type} onValueChange={(value) => updateForecast('type', value)} options={FORECAST_SCENARIOS} />
                  <InputCell label="ריבית בנק ישראל" value={state.forecast.boiRate} onChange={(event) => updateForecast('boiRate', Number(event.target.value || 0))} />
                  <InputCell label="מדד שנתי" value={state.forecast.cpiAnnual} onChange={(event) => updateForecast('cpiAnnual', Number(event.target.value || 0))} />
                  <InputCell label='אג"ח לא צמוד 5Y' value={state.forecast.govBondUnlinked5Y} onChange={(event) => updateForecast('govBondUnlinked5Y', Number(event.target.value || 0))} />
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-[#d8dee4] bg-white">
                <div className="flex flex-col gap-4 border-b border-[#e4e8ee] px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e4e7eb] text-[#60707d]">
                      <EyeOff className="h-5 w-5" />
                    </button>
                    <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e4e7eb] text-[#60707d]">
                      <Calculator className="h-5 w-5" />
                    </button>
                    <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e4e7eb] text-[#60707d]">
                      <Info className="h-5 w-5" />
                    </button>
                    <ToolbarChip>מיזוג תמהילים</ToolbarChip>
                    <ToolbarChip>תחזיות כלכליות</ToolbarChip>
                    <ToolbarChip>עדכון עוגנים</ToolbarChip>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" className="rounded-full border-[#1a74da] px-8 text-[#1a74da]" onClick={() => setCalculationNonce((value) => value + 1)}>
                      חישוב מחדש
                    </Button>
                    <Button type="button" variant="outline" className="rounded-full border-[#1a74da] px-8 text-[#1a74da]" onClick={addTrack}>
                      <Plus className="ml-2 h-4 w-4" />
                      הוספת מסלול
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className={headerCellClassName}>אחוז</th>
                        <th className={headerCellClassName}>לוח סילוקין</th>
                        <th className={headerCellClassName}>מסלול</th>
                        <th className={headerCellClassName}>תדירות עדכון</th>
                        <th className={headerCellClassName}>סכום</th>
                        <th className={headerCellClassName}>תקופה</th>
                        <th className={headerCellClassName}>תוספת</th>
                        <th className={headerCellClassName}>ריבית</th>
                        <th className={headerCellClassName}>מחיקה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.tracks.map((track) => (
                        <MixTableRow
                          key={track.id}
                          track={track}
                          onChange={(field, value) => updateTrack(track.id, field, value)}
                          onDelete={() => deleteTrack(track.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <ResultTile label="החזר ראשון" value={formatCurrency(result.summary.firstMonthlyPayment)} />
                <ResultTile label="החזר מייצג" value={formatCurrency(result.summary.representativePayment)} />
                <ResultTile label="עלות כוללת" value={formatCurrency(result.summary.totalCost)} />
                <ResultTile label="יחס החזר" value={formatPercent(result.summary.repaymentRatio)} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-6">
            <ResultTile label="ריבית והצמדה בתמהיל הנוכחי" value={formatCurrency(result.summary.totalInterestAndIndexation)} />
            <ResultTile label="ריבית והצמדה בתמהיל להשוואה" value={formatCurrency(result.summary.totalInterestAndIndexation * 0.92)} />
            <ResultTile label="חיסכון באחוזים" value={formatPercent(8, 0)} />
            <ResultTile label="חיסכון חודשי" value={formatCurrency(result.summary.firstMonthlyPayment * 0.04)} />
            <ResultTile label="הכנסה פנויה לנפש" value={formatCurrency(Math.max(0, state.client.householdIncomeNet - result.summary.firstMonthlyPayment))} />
            <ResultTile label="מח״מ" value={formatMonths(result.summary.weightedAverageDuration)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_2.2fr]">
            <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
              <div className="bg-[#4f7992] px-6 py-4 text-right text-[18px] font-medium text-white">טבלה משווה</div>
              <table className="w-full">
                <thead>
                  <tr className="text-[16px]">
                    <th className="px-4 py-4 text-right text-[#5c7282]">פרש</th>
                    <th className="px-4 py-4 text-center text-[#ff5a1f]">תמהיל להשוואה</th>
                    <th className="px-4 py-4 text-center text-[#2757c6]">תמהיל נוכחי</th>
                    <th className="px-4 py-4 text-right text-[#3f5563]"></th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([label, current, recommended, diff]) => (
                    <ComparisonRow key={label} label={label} current={current} recommended={recommended} diff={diff} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                <div className="px-6 py-6 text-center text-[18px] text-[#536575]">יתרת חוב</div>
                <div className="px-4 pb-4">
                  <ChartContainer className="h-[250px] w-full" config={chartConfig}>
                    <LineChart data={chartRows}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line dataKey="balance" type="monotone" stroke="var(--color-balance)" strokeWidth={2.4} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                <div className="px-6 py-6 text-center text-[18px] text-[#536575]">החזר חודשי</div>
                <div className="px-4 pb-4">
                  <ChartContainer className="h-[250px] w-full" config={chartConfig}>
                    <AreaChart data={chartRows}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="payment" type="monotone" fill="var(--color-payment)" fillOpacity={0.18} stroke="var(--color-payment)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                <div className="px-6 py-6 text-center text-[18px] text-[#536575]">ריבית ממוצעת</div>
                <div className="flex min-h-[180px] items-center justify-center px-8 text-center text-[18px] text-[#536575]">
                  {formatPercent(result.summary.weightedAverageInterest)}
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                <div className="px-6 py-6 text-center text-[18px] text-[#536575]">סיכום ללקוח</div>
                <div className="flex min-h-[180px] items-center justify-center px-8 text-center text-[18px] leading-8 text-[#536575]">
                  {result.clientSummary}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
