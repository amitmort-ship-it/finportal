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
import { Calculator, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { createManualForecastCurve } from '@/lib/forecast/manualForecastProvider';
import { calculateMortgageMixSchedule } from '@/lib/calculations/mortgageEngine';
import { validateMortgageSimulation } from '@/lib/validation/mortgageValidation';
import { formatCurrency, formatInputNumber, formatMonths, formatPercent, sanitizeNumber } from '@/lib/formatters/mortgageFormatters';
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
    color: '#0f766e',
  },
  balance: {
    label: 'יתרת חוב',
    color: '#1d4ed8',
  },
};

function TrackCard({ track, onChange, onDuplicate, onDelete }) {
  const loanMeta = getLoanTypeMeta(track.loanType);
  const linked = loanMeta.linked;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg">{track.name}</CardTitle>
            <CardDescription>{loanMeta.label} • {formatMonths(track.termMonths)}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onDuplicate}>
              <Copy className="w-4 h-4 ml-2" />
              שכפול
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 ml-2" />
              מחיקה
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>שם מסלול</Label>
          <Input value={track.name} onChange={(event) => onChange('name', event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>סוג מסלול</Label>
          <Select value={track.loanType} onValueChange={(value) => onChange('loanType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOAN_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>לוח סילוקין</Label>
          <Select value={track.amortizationType} onValueChange={(value) => onChange('amortizationType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMORTIZATION_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>סכום</Label>
          <Input
            value={formatInputNumber(track.principal)}
            onChange={(event) => onChange('principal', sanitizeNumber(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>תקופה בחודשים</Label>
          <Input
            value={formatInputNumber(track.termMonths)}
            onChange={(event) => onChange('termMonths', sanitizeNumber(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>ריבית שנתית</Label>
          <Input
            value={track.annualInterestRate}
            onChange={(event) => onChange('annualInterestRate', sanitizeNumber(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>מרווח לקוח</Label>
          <Input
            value={track.customerMargin}
            onChange={(event) => onChange('customerMargin', Number(event.target.value || 0))}
          />
        </div>
        <div className="space-y-2">
          <Label>תדירות שינוי</Label>
          <Select
            value={String(track.changeFrequencyMonths || 60)}
            onValueChange={(value) => onChange('changeFrequencyMonths', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGE_FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>טווח עוגן</Label>
          <Select
            value={String(track.anchorTermMonths || 60)}
            onValueChange={(value) => onChange('anchorTermMonths', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANCHOR_TERM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground xl:col-span-2">
          <div className="font-medium text-foreground mb-1">מאפייני המסלול</div>
          <div>{linked ? 'צמוד מדד' : 'לא צמוד מדד'}</div>
          <div>{track.loanType === 'prime' ? 'הריבית נגזרת מפריים חודשי' : 'הריבית נקבעת לפי סוג המסלול והעוגן'}</div>
        </div>
      </CardContent>
    </Card>
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

  const totalTracksPrincipal = state.tracks.reduce((sum, track) => sum + (Number(track.principal) || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">סימולציית משכנתא</h1>
          <p className="text-muted-foreground mt-1">
            MVP ראשון למנוע חישוב חודשי, בניית תמהיל, תחזית ידנית וסיכום תוצאות.
          </p>
        </div>
        <Button onClick={() => setCalculationNonce((value) => value + 1)}>
          <Calculator className="w-4 h-4 ml-2" />
          חישוב מחדש
        </Button>
      </div>

      {warnings.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">התראות עסקיות</CardTitle>
            <CardDescription className="text-amber-800">
              בשלב זה ההתראות אינן חוסמות את החישוב, רק מסמנות נקודות לבדיקה.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            {warnings.map((warning) => (
              <div key={warning}>• {warning}</div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="case" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="case">נתוני תיק</TabsTrigger>
          <TabsTrigger value="mix">תמהיל</TabsTrigger>
          <TabsTrigger value="forecast">תחזית</TabsTrigger>
          <TabsTrigger value="results">תוצאות</TabsTrigger>
        </TabsList>

        <TabsContent value="case" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>פרטי לקוח</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>שם פרטי</Label>
                  <Input value={state.client.firstName} onChange={(event) => updateClient('firstName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>שם משפחה</Label>
                  <Input value={state.client.lastName} onChange={(event) => updateClient('lastName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>הכנסה נטו</Label>
                  <Input value={formatInputNumber(state.client.householdIncomeNet)} onChange={(event) => updateClient('householdIncomeNet', sanitizeNumber(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>התחייבויות חודשיות</Label>
                  <Input value={formatInputNumber(state.client.monthlyObligations)} onChange={(event) => updateClient('monthlyObligations', sanitizeNumber(event.target.value))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>פרטי סימולציה</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>שם הסימולציה</Label>
                  <Input value={state.simulation.name} onChange={(event) => updateSimulation('name', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>מטרה</Label>
                  <Select value={state.simulation.purpose} onValueChange={(value) => updateSimulation('purpose', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>סכום משכנתא מבוקש</Label>
                  <Input value={formatInputNumber(state.simulation.requestedLoanAmount)} onChange={(event) => updateSimulation('requestedLoanAmount', sanitizeNumber(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>שווי נכס</Label>
                  <Input value={formatInputNumber(state.simulation.propertyValue)} onChange={(event) => updateSimulation('propertyValue', sanitizeNumber(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>יעד החזר חודשי</Label>
                  <Input value={formatInputNumber(state.simulation.targetMonthlyPayment)} onChange={(event) => updateSimulation('targetMonthlyPayment', sanitizeNumber(event.target.value))} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>סיכום תמהיל</CardTitle>
              <CardDescription>
                סך המסלולים כרגע: {formatCurrency(totalTracksPrincipal)} מתוך יעד של {formatCurrency(state.simulation.requestedLoanAmount)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={addTrack}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף מסלול
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {state.tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                onChange={(field, value) => updateTrack(track.id, field, value)}
                onDuplicate={() => duplicateTrack(track.id)}
                onDelete={() => deleteTrack(track.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>תרחיש תחזית</CardTitle>
              <CardDescription>
                MVP ידני עם פריסה חודשית אוטומטית ל-360 חודשים.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>סוג תרחיש</Label>
                <Select value={state.forecast.type} onValueChange={(value) => updateForecast('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORECAST_SCENARIOS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ריבית בנק ישראל</Label>
                <Input value={state.forecast.boiRate} onChange={(event) => updateForecast('boiRate', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>מדד שנתי</Label>
                <Input value={state.forecast.cpiAnnual} onChange={(event) => updateForecast('cpiAnnual', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>מק"מ</Label>
                <Input value={state.forecast.makamRate} onChange={(event) => updateForecast('makamRate', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>אג"ח צמוד 5Y</Label>
                <Input value={state.forecast.govBondLinked5Y} onChange={(event) => updateForecast('govBondLinked5Y', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>אג"ח לא צמוד 5Y</Label>
                <Input value={state.forecast.govBondUnlinked5Y} onChange={(event) => updateForecast('govBondUnlinked5Y', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>שינוי שנתי ב-BOI</Label>
                <Input value={state.forecast.annualBoiDelta} onChange={(event) => updateForecast('annualBoiDelta', Number(event.target.value || 0))} />
              </div>
              <div className="space-y-2">
                <Label>שינוי שנתי במדד</Label>
                <Input value={state.forecast.annualCpiDelta} onChange={(event) => updateForecast('annualCpiDelta', Number(event.target.value || 0))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'החזר ראשון', value: formatCurrency(result.summary.firstMonthlyPayment) },
              { label: 'החזר מייצג', value: formatCurrency(result.summary.representativePayment) },
              { label: 'עלות כוללת', value: formatCurrency(result.summary.totalCost) },
              { label: 'יחס החזר', value: formatPercent(result.summary.repaymentRatio) },
              { label: 'ריבית והצמדה', value: formatCurrency(result.summary.totalInterestAndIndexation) },
              { label: 'יתרה אחרי 5 שנים', value: formatCurrency(result.summary.debtAfter5Years) },
              { label: 'מח"מ משוקלל', value: formatMonths(result.summary.weightedAverageDuration) },
              { label: 'ריבית משוקללת', value: formatPercent(result.summary.weightedAverageInterest) },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-xl">{metric.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>החזר חודשי לאורך זמן</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[320px] w-full" config={chartConfig}>
                  <AreaChart data={chartRows}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="payment"
                      type="monotone"
                      fill="var(--color-payment)"
                      fillOpacity={0.18}
                      stroke="var(--color-payment)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>יתרת חוב לאורך זמן</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[320px] w-full" config={chartConfig}>
                  <LineChart data={chartRows}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="balance"
                      type="monotone"
                      stroke="var(--color-balance)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>סיכום ללקוח</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-foreground">
              {result.clientSummary}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>לוח סילוקין חודשי</CardTitle>
              <CardDescription>תצוגת 24 החודשים הראשונים של התמהיל המאוחד.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3 px-2 text-right">חודש</th>
                    <th className="py-3 px-2 text-right">החזר</th>
                    <th className="py-3 px-2 text-right">קרן</th>
                    <th className="py-3 px-2 text-right">ריבית</th>
                    <th className="py-3 px-2 text-right">הצמדה</th>
                    <th className="py-3 px-2 text-right">יתרה</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthlyRows.slice(0, 24).map((row) => (
                    <tr key={row.monthNumber} className="border-b border-border/70">
                      <td className="py-3 px-2">{row.monthNumber}</td>
                      <td className="py-3 px-2">{formatCurrency(row.monthlyPayment)}</td>
                      <td className="py-3 px-2">{formatCurrency(row.principalComponent)}</td>
                      <td className="py-3 px-2">{formatCurrency(row.interestComponent)}</td>
                      <td className="py-3 px-2">{formatCurrency(row.indexationComponent)}</td>
                      <td className="py-3 px-2">{formatCurrency(row.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
