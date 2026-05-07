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
  Copy,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ANCHOR_TERM_OPTIONS,
  CHANGE_FREQUENCY_OPTIONS,
  FORECAST_SCENARIOS,
  LOAN_TYPES,
  PURPOSE_OPTIONS,
  createDefaultSimulationState,
  createDefaultTrack,
  getLoanTypeMeta,
} from '@/types/mortgage';

const chartConfig = {
  payment: {
    label: 'החזר חודשי',
    color: '#4e7b95',
  },
  balance: {
    label: 'יתרת חוב',
    color: '#305d78',
  },
};

const fieldClassName =
  'h-14 rounded-none border-0 bg-white text-right text-[15px] shadow-none focus-visible:ring-1 focus-visible:ring-[#2b7de0]';
const headerCellClassName = 'bg-[#4f7992] px-3 py-3 text-center text-white text-sm font-medium';

function ToolbarChip({ children, active = false, accent = false }) {
  const className = active
    ? 'bg-[#1477d4] text-white'
    : accent
      ? 'bg-[#b233c9] text-white'
      : 'bg-[#e3e7eb] text-[#536575]';

  return (
    <button
      type="button"
      className={`rounded-full px-6 py-3 text-sm font-medium transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function TopActionButton({ icon: Icon, label, outlined = true }) {
  return (
    <button
      type="button"
      className={`inline-flex h-12 min-w-12 items-center justify-center rounded-full px-4 ${
        outlined ? 'border border-[#1d7ae0] text-[#1d7ae0]' : 'bg-[#1d7ae0] text-white'
      }`}
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
    { label: 'עלויות', value: 'בפיתוח תיק' },
    { label: 'הקצאת הון', value: formatPercent(state.simulation.ltv || 0, 1) },
    { label: 'תמהיל להשוואה', value: 'מומלץ' },
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-t-[20px] bg-[#dfe4ea] xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="bg-[#f3f4f7] px-4 py-4 text-right">
          <div className="mb-2 text-sm text-[#7c8793]">{item.label}</div>
          <div className="text-[15px] font-medium text-[#46525d]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function MixTableRow({ track, onChange, onDuplicate, onDelete }) {
  const loanMeta = getLoanTypeMeta(track.loanType);

  return (
    <tr className="border-b border-[#d8dee4] bg-[#dcebf3]/60">
      <td className="p-2">
        <Input
          className={fieldClassName}
          value={track.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
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
          value={track.anchorTermMonths}
          onChange={(event) => onChange('anchorTermMonths', sanitizeNumber(event.target.value))}
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
          value={loanMeta.linked ? 'צמוד' : 'שפיצר'}
          readOnly
        />
      </td>
      <td className="w-[210px] bg-[#ececec] p-2 align-top">
        <div className="flex flex-col items-center gap-2 pt-1">
          <button type="button" onClick={onDuplicate} className="rounded-full border border-[#1c7ae0] px-5 py-2 text-[#1c7ae0]">
            פרעון
          </button>
          <button type="button" className="rounded-full border border-[#1c7ae0] px-5 py-2 text-[#1c7ae0]">
            קיצור
          </button>
        </div>
      </td>
      <td className="w-[64px] bg-[#ececec] p-2 text-center">
        <button type="button" onClick={onDelete} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#ff7a59]">
          <Trash2 className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}

function ForecastCell({ label, value, onChange }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="mb-2 text-sm text-[#7b8591]">{label}</div>
      <Input className={fieldClassName} value={value} onChange={onChange} />
    </div>
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

  const totalTracksPrincipal = state.tracks.reduce(
    (sum, track) => sum + (Number(track.principal) || 0),
    0
  );

  const updateClient = (field, value) => {
    setState((current) => ({
      ...current,
      client: {
        ...current.client,
        [field]: value,
      },
    }));
  };

  const updateSimulation = (field, value) => {
    setState((current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        [field]: value,
      },
    }));
  };

  const updateForecast = (field, value) => {
    setState((current) => ({
      ...current,
      forecast: {
        ...current.forecast,
        [field]: value,
      },
    }));
  };

  const updateTrack = (trackId, field, value) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const nextTrack = {
          ...track,
          [field]: value,
        };

        if (field === 'loanType') {
          const meta = getLoanTypeMeta(value);
          nextTrack.isLinkedToCpi = meta.linked;
          nextTrack.anchorType = value === 'variable_linked'
            ? 'gov_bond_linked'
            : value === 'variable_unlinked'
              ? 'gov_bond_unlinked'
              : value === 'prime'
                ? 'prime'
                : value === 'makam'
                  ? 'makam'
                  : nextTrack.anchorType;
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

  const duplicateTrack = (trackId) => {
    setState((current) => {
      const track = current.tracks.find((item) => item.id === trackId);
      if (!track) return current;

      return {
        ...current,
        tracks: [
          ...current.tracks,
          {
            ...track,
            id: `track-${Date.now()}-${current.tracks.length}`,
            name: `${track.name} (עותק)`,
          },
        ],
      };
    });
  };

  const deleteTrack = (trackId) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== trackId),
    }));
  };

  const comparisonRows = [
    {
      label: 'סכום הלוואה',
      current: formatCurrency(result.summary.totalLoanAmount),
      recommended: formatCurrency(result.summary.totalLoanAmount),
      diff: 'הפרש',
    },
    {
      label: 'מרווח שוק',
      current: formatPercent(result.summary.weightedAverageInterest),
      recommended: formatPercent(Math.max(0, result.summary.weightedAverageInterest - 0.25)),
      diff: formatPercent(0.25),
    },
    {
      label: 'תשלומי ריבית והצמדה',
      current: formatCurrency(result.summary.totalInterestAndIndexation),
      recommended: formatCurrency(result.summary.totalInterestAndIndexation * 0.92),
      diff: formatCurrency(result.summary.totalInterestAndIndexation * 0.08),
    },
    {
      label: 'תקופת הלוואה',
      current: formatMonths(result.summary.durationUntilFullRepayment),
      recommended: formatMonths(Math.max(0, result.summary.durationUntilFullRepayment - 24)),
      diff: '-24 חודשים',
    },
    {
      label: 'החזר ראשון',
      current: formatCurrency(result.summary.firstMonthlyPayment),
      recommended: formatCurrency(result.summary.firstMonthlyPayment * 0.96),
      diff: formatCurrency(result.summary.firstMonthlyPayment * 0.04),
    },
    {
      label: 'החזר בשיא',
      current: formatCurrency(result.summary.peakMonthlyPayment),
      recommended: formatCurrency(result.summary.peakMonthlyPayment * 0.94),
      diff: formatCurrency(result.summary.peakMonthlyPayment * 0.06),
    },
    {
      label: 'עלות כוללת',
      current: formatCurrency(result.summary.totalCost),
      recommended: formatCurrency(result.summary.totalCost * 0.91),
      diff: formatCurrency(result.summary.totalCost * 0.09),
    },
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

        <Tabs defaultValue="mix" className="w-full">
          <div className="border-t border-[#e3e7eb] bg-[#f4f5f7] px-4 pt-4">
            <TabsList className="h-auto w-full justify-end gap-2 rounded-none bg-transparent p-0">
              <TabsTrigger value="results" className="rounded-t-[18px] border border-b-0 border-[#d7dde4] bg-white px-8 py-4 text-[16px] data-[state=active]:text-[#1a74da]">
                סיכום
              </TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-t-[18px] border border-b-0 border-transparent bg-transparent px-8 py-4 text-[16px] text-[#1a74da] data-[state=active]:border-[#d7dde4] data-[state=active]:bg-white">
                משכנתה נוכחית
              </TabsTrigger>
              <TabsTrigger value="mix" className="rounded-t-[18px] border border-b-0 border-transparent bg-transparent px-8 py-4 text-[16px] text-[#1a74da] data-[state=active]:border-[#d7dde4] data-[state=active]:bg-white">
                תמהיל 1
              </TabsTrigger>
              <TabsTrigger value="case" className="rounded-t-[18px] border border-b-0 border-transparent bg-transparent px-8 py-4 text-[16px] text-[#1a74da] data-[state=active]:border-[#d7dde4] data-[state=active]:bg-white">
                נתוני תיק
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="case" className="m-0 space-y-6 p-4 md:p-6">
            <SummaryStrip state={state} totalTracksPrincipal={totalTracksPrincipal} />

            <div className="grid gap-px overflow-hidden rounded-b-[20px] bg-[#dfe4ea] lg:grid-cols-4">
              <ForecastCell
                label="שם פרטי"
                value={state.client.firstName}
                onChange={(event) => updateClient('firstName', event.target.value)}
              />
              <ForecastCell
                label="שם משפחה"
                value={state.client.lastName}
                onChange={(event) => updateClient('lastName', event.target.value)}
              />
              <ForecastCell
                label="הכנסה נטו"
                value={formatInputNumber(state.client.householdIncomeNet)}
                onChange={(event) => updateClient('householdIncomeNet', sanitizeNumber(event.target.value))}
              />
              <ForecastCell
                label="התחייבויות"
                value={formatInputNumber(state.client.monthlyObligations)}
                onChange={(event) => updateClient('monthlyObligations', sanitizeNumber(event.target.value))}
              />
              <div className="bg-white px-4 py-4">
                <div className="mb-2 text-sm text-[#7b8591]">מטרת הסימולציה</div>
                <Select value={state.simulation.purpose} onValueChange={(value) => updateSimulation('purpose', value)}>
                  <SelectTrigger className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ForecastCell
                label="סכום משכנתה"
                value={formatInputNumber(state.simulation.requestedLoanAmount)}
                onChange={(event) => updateSimulation('requestedLoanAmount', sanitizeNumber(event.target.value))}
              />
              <ForecastCell
                label="שווי נכס"
                value={formatInputNumber(state.simulation.propertyValue)}
                onChange={(event) => updateSimulation('propertyValue', sanitizeNumber(event.target.value))}
              />
              <ForecastCell
                label="יעד החזר"
                value={formatInputNumber(state.simulation.targetMonthlyPayment)}
                onChange={(event) => updateSimulation('targetMonthlyPayment', sanitizeNumber(event.target.value))}
              />
            </div>
          </TabsContent>

          <TabsContent value="mix" className="m-0 space-y-6 p-4 md:p-6">
            <SummaryStrip state={state} totalTracksPrincipal={totalTracksPrincipal} />

            <div className="rounded-b-[24px] bg-white px-0 pb-6">
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
                  <ToolbarChip>שכפול תמהיל</ToolbarChip>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" className="rounded-full border-[#1a74da] px-8 text-[#1a74da]" onClick={() => setCalculationNonce((value) => value + 1)}>
                    לוח סילוקין
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full border-[#1a74da] px-8 text-[#1a74da]" onClick={addTrack}>
                    <Plus className="ml-2 h-4 w-4" />
                    הוספת מסלול
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className={headerCellClassName}>אחוז</th>
                      <th className={headerCellClassName}>לוח סילוקין</th>
                      <th className={headerCellClassName}>מסלול</th>
                      <th className={headerCellClassName}>תדירות עדכון</th>
                      <th className={headerCellClassName}>סכום</th>
                      <th className={headerCellClassName}>תקופה</th>
                      <th className={headerCellClassName}>עוגן</th>
                      <th className={headerCellClassName}>תוספת</th>
                      <th className={headerCellClassName}>ריבית</th>
                      <th className={headerCellClassName}>גרייס חלקי</th>
                      <th className={headerCellClassName}>מלא מועד לשחרור</th>
                      <th className={headerCellClassName}>החזר ראשון</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tracks.map((track) => (
                      <MixTableRow
                        key={track.id}
                        track={track}
                        onChange={(field, value) => updateTrack(track.id, field, value)}
                        onDuplicate={() => duplicateTrack(track.id)}
                        onDelete={() => deleteTrack(track.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 px-4 pt-6 xl:grid-cols-6">
                <ResultTile label="ריבית והצמדה בתמהיל הנוכחי" value={formatCurrency(result.summary.totalInterestAndIndexation)} />
                <ResultTile label="ריבית והצמדה בתמהיל להשוואה" value={formatCurrency(result.summary.totalInterestAndIndexation * 0.92)} />
                <ResultTile label="חיסכון באחוזים" value={formatPercent(8, 0)} />
                <ResultTile label="חיסכון חודשי" value={formatCurrency(result.summary.firstMonthlyPayment * 0.04)} />
                <ResultTile label="הכנסה פנויה לנפש" value={formatCurrency(Math.max(0, state.client.householdIncomeNet - result.summary.firstMonthlyPayment))} />
                <ResultTile label="יחס החזר" value={formatPercent(result.summary.repaymentRatio)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="m-0 space-y-6 p-4 md:p-6">
            <SummaryStrip state={state} totalTracksPrincipal={totalTracksPrincipal} />

            <div className="grid gap-px overflow-hidden rounded-b-[24px] bg-[#dfe4ea] lg:grid-cols-4">
              <div className="bg-white px-4 py-4">
                <div className="mb-2 text-sm text-[#7b8591]">סוג תרחיש</div>
                <Select value={state.forecast.type} onValueChange={(value) => updateForecast('type', value)}>
                  <SelectTrigger className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORECAST_SCENARIOS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ForecastCell
                label="ריבית בנק ישראל"
                value={state.forecast.boiRate}
                onChange={(event) => updateForecast('boiRate', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='מדד שנתי'
                value={state.forecast.cpiAnnual}
                onChange={(event) => updateForecast('cpiAnnual', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='מק"מ'
                value={state.forecast.makamRate}
                onChange={(event) => updateForecast('makamRate', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='אג"ח צמוד 5Y'
                value={state.forecast.govBondLinked5Y}
                onChange={(event) => updateForecast('govBondLinked5Y', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='אג"ח לא צמוד 5Y'
                value={state.forecast.govBondUnlinked5Y}
                onChange={(event) => updateForecast('govBondUnlinked5Y', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='שינוי שנתי ב-BOI'
                value={state.forecast.annualBoiDelta}
                onChange={(event) => updateForecast('annualBoiDelta', Number(event.target.value || 0))}
              />
              <ForecastCell
                label='שינוי שנתי במדד'
                value={state.forecast.annualCpiDelta}
                onChange={(event) => updateForecast('annualCpiDelta', Number(event.target.value || 0))}
              />
            </div>
          </TabsContent>

          <TabsContent value="results" className="m-0 space-y-6 p-4 md:p-6">
            {warnings.length ? (
              <Card className="border-[#f2c699] bg-[#fff4e7]">
                <CardContent className="space-y-2 py-5 text-sm text-[#915f20]">
                  {warnings.map((warning) => (
                    <div key={warning}>• {warning}</div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-6">
              <ResultTile label="ריבית והצמדה בתמהיל הנוכחי" value={formatCurrency(result.summary.totalInterestAndIndexation)} />
              <ResultTile label="ריבית והצמדה בתמהיל להשוואה" value={formatCurrency(result.summary.totalInterestAndIndexation * 0.92)} />
              <ResultTile label="חיסכון באחוזים" value={formatPercent(8, 0)} />
              <ResultTile label="חיסכון חודשי" value={formatCurrency(result.summary.firstMonthlyPayment * 0.04)} />
              <ResultTile label="החזר מייצג" value={formatCurrency(result.summary.representativePayment)} />
              <ResultTile label="יחס החזר" value={formatPercent(result.summary.repaymentRatio)} />
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
                    {comparisonRows.map((row) => (
                      <ComparisonRow
                        key={row.label}
                        label={row.label}
                        current={row.current}
                        recommended={row.recommended}
                        diff={row.diff}
                      />
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
                  <div className="px-6 py-6 text-center text-[18px] text-[#536575]">חלוקת התשלום לקרן, הצמדה וריבית</div>
                  <div className="flex min-h-[180px] items-center justify-center px-8 text-center text-[18px] text-[#536575]">
                    קרן {formatCurrency(result.monthlyRows[0]?.principalComponent || 0)} | ריבית {formatCurrency(result.monthlyRows[0]?.interestComponent || 0)}
                  </div>
                </div>

                <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                  <div className="px-6 py-6 text-center text-[18px] text-[#536575]">חסכון מצטבר</div>
                  <div className="flex min-h-[180px] items-center justify-center px-8 text-center text-[18px] text-[#536575]">
                    {formatCurrency(result.summary.totalCost * 0.09)}
                  </div>
                </div>

                <div className="overflow-hidden rounded-sm border border-[#d8dee4] bg-white">
                  <div className="px-6 py-6 text-center text-[18px] text-[#536575]">תרשים חסכון</div>
                  <div className="flex min-h-[180px] items-center justify-center px-8 text-center text-[18px] text-[#536575]">
                    {result.clientSummary}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
