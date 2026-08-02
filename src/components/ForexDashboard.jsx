import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  BarChart3,
  Bitcoin,
  DollarSign,
  Euro,
  PoundSterling,
  AlertCircle,
  Info,
} from 'lucide-react';
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

const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP'];
const ALL_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'BTC'];

const CURRENCY_META = {
  USD: { label: 'דולר ארה"ב', symbol: '$', icon: DollarSign, color: '#22c55e' },
  EUR: { label: 'אירו', symbol: '€', icon: Euro, color: '#3b82f6' },
  GBP: { label: 'לירה שטרלינג', symbol: '£', icon: PoundSterling, color: '#a855f7' },
  BTC: { label: 'ביטקוין', symbol: '₿', icon: Bitcoin, color: '#f59e0b' },
  ILS: { label: 'שקל חדש', symbol: '₪', icon: null, color: '#0ea5e9' },
};

const CONSERVATIVE_OPTIONS = [
  { value: 0, label: 'שער רציף (0%)' },
  { value: 0.03, label: 'שמרני 3%' },
  { value: 0.05, label: 'שמרני 5%' },
  { value: 0.10, label: 'שמרני 10%' },
];

const LS_KEY = 'forex_dashboard_manual_v1';

function fmtNum(n, digits = 2) {
  return Number(n || 0).toLocaleString('he-IL', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtRate(n) {
  if (!n) return '—';
  if (n >= 1000) return fmtNum(n, 0);
  if (n >= 100) return fmtNum(n, 2);
  return fmtNum(n, 4);
}
function fmtPct(n) {
  const v = Number(n || 0);
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

// ---- Sparkline (inline SVG) ----
function Sparkline({ data, color = '#3b82f6', width = 120, height = 36 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M ${points.join(' L ')}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---- Rate Card ----
function RateCard({ code, rate, change, history, lastUpdate, loading }) {
  const meta = CURRENCY_META[code];
  const Icon = meta?.icon;
  const isUp = (change || 0) >= 0;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
              <Icon className="w-5 h-5" style={{ color: meta.color }} />
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground text-sm">{meta?.label}</p>
            <p className="text-xs text-muted-foreground">{code}/ILS</p>
          </div>
        </div>
        {loading ? (
          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {fmtPct(change)}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{loading ? '—' : `₪${fmtRate(rate)}`}</p>
          {lastUpdate && <p className="text-[10px] text-muted-foreground mt-1.5">עדכון: {lastUpdate}</p>}
        </div>
        <Sparkline data={history} color={meta?.color || '#3b82f6'} />
      </div>
    </div>
  );
}

// ---- Indicator Card (manual / editable) ----
function IndicatorCard({ icon: Icon, title, value, suffix, subtitle, editable, onSave, tone }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => { setDraft(String(value ?? '')); }, [value]);
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${tone || 'bg-card border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">ערוך</button>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
          <Button size="sm" className="h-8" onClick={() => { onSave(Number(draft)); setEditing(false); }}>שמור</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(false)}>ביטול</Button>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-foreground leading-none">
            {value != null ? `${value}${suffix || ''}` : '—'}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

export default function ForexDashboard() {
  const [rates, setRates] = useState({}); // { USD: {rate, change, history, lastUpdate}, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Manual indicators
  const [manual, setManual] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return {
        boiRate: saved.boiRate ?? 4.5,
        primeRate: saved.primeRate ?? 5.97,
        cpiValue: saved.cpiValue ?? 108.5,
        cpiMonthly: saved.cpiMonthly ?? 0.3,
        cpiAnnual: saved.cpiAnnual ?? 3.2,
      };
    } catch {
      return { boiRate: 4.5, primeRate: 5.97, cpiValue: 108.5, cpiMonthly: 0.3, cpiAnnual: 3.2 };
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(manual));
  }, [manual]);

  // Converter state
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('ILS');

  // Conservative income calculator
  const [incomeAmount, setIncomeAmount] = useState('5000');
  const [incomeCurrency, setIncomeCurrency] = useState('USD');
  const [conservativeFactor, setConservativeFactor] = useState(0);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // --- Fiat via Frankfurter ---
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 35);
      const fmtD = (d) => d.toISOString().slice(0, 10);

      const fiatResults = {};
      await Promise.all(
        FIAT_CURRENCIES.map(async (cur) => {
          try {
            const url = `https://api.frankfurter.app/${fmtD(startDate)}..${fmtD(endDate)}?from=${cur}&to=ILS`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const entries = Object.entries(json.rates || {}).sort(([a], [b]) => a.localeCompare(b));
            const history = entries.map(([, v]) => v?.ILS || v || 0);
            const lastRate = history[history.length - 1];
            const prevRate = history[history.length - 2] || lastRate;
            const change = prevRate ? ((lastRate - prevRate) / prevRate) * 100 : 0;
            const lastDate = entries[entries.length - 1]?.[0];
            fiatResults[cur] = { rate: lastRate, change, history, lastUpdate: lastDate };
          } catch (e) {
            fiatResults[cur] = { rate: null, change: null, history: [], lastUpdate: null };
          }
        })
      );

      // --- BTC via CoinGecko ---
      let btcResult = { rate: null, change: null, history: [], lastUpdate: null };
      try {
        const [priceRes, chartRes] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=ils&include_24hr_change=true&include_last_updated_at=true'),
          fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=ils&days=30'),
        ]);
        if (priceRes.ok) {
          const priceJson = await priceRes.json();
          const btc = priceJson.bitcoin;
          if (btc) {
            const rate = btc.ils;
            const change = btc.ils_24h_change || 0; // 24h change in %
            const ts = btc.last_updated_at;
            btcResult.rate = rate;
            btcResult.change = change;
            btcResult.lastUpdate = ts ? new Date(ts * 1000).toLocaleDateString('he-IL') : null;
          }
        }
        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          // Sample hourly data to ~daily points for consistent sparkline density
          const allPrices = chartJson.prices || [];
          const step = Math.max(1, Math.floor(allPrices.length / 30));
          btcResult.history = allPrices
            .filter((_, i) => i % step === 0)
            .map(([, p]) => p);
        }
      } catch {
        // keep nulls
      }

      setRates({ ...fiatResults, BTC: btcResult });
    } catch (err) {
      setError('שגיאה בטעינת נתוני שערי חליפין. ניתן לרענן או להזין נתונים ידנית.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Conversion logic ---
  // Build a rate matrix: rate[from][to] = factor
  const rateMatrix = useMemo(() => {
    const m = {};
    ALL_CURRENCIES.forEach((c) => { m[c] = {}; m[c][c] = 1; });
    // ILS to fiat
    FIAT_CURRENCIES.forEach((c) => {
      const r = rates[c]?.rate;
      if (r) {
        m.ILS[c] = 1 / r;
        m[c].ILS = r;
      }
    });
    // BTC
    const btcRate = rates.BTC?.rate;
    if (btcRate) {
      m.ILS.BTC = 1 / btcRate;
      m.BTC.ILS = btcRate;
    }
    // Cross rates via ILS
    ALL_CURRENCIES.forEach((a) => {
      ALL_CURRENCIES.forEach((b) => {
        if (a !== b && m[a].ILS && m.ILS[b]) {
          m[a][b] = m[a].ILS * m.ILS[b];
        }
      });
    });
    return m;
  }, [rates]);

  const convert = (amount, from, to) => {
    const factor = rateMatrix[from]?.[to];
    if (!factor || !amount) return 0;
    return amount * factor;
  };

  const convResult = convert(Number(String(convAmount).replace(/,/g, '')) || 0, convFrom, convTo);

  const handleSwap = () => {
    setConvFrom(convTo);
    setConvTo(convFrom);
  };

  // --- Conservative income ---
  const incomeAmt = Number(String(incomeAmount).replace(/,/g, '')) || 0;
  const baseRate = rateMatrix[incomeCurrency]?.ILS || 0;
  const conservativeRate = baseRate * (1 - conservativeFactor);
  const incomeResultILS = incomeAmt * conservativeRate;
  const incomeResultDiff = incomeAmt * baseRate - incomeResultILS;

  const lastUpdateText = useMemo(() => {
    const dates = Object.values(rates).map((r) => r?.lastUpdate).filter(Boolean);
    if (!dates.length) return null;
    return dates.sort().reverse()[0];
  }, [rates]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">דשבורד מט"ח ומדדים כלכליים</h2>
          <p className="text-sm text-muted-foreground mt-1">שערי חליפין בזמן אמת, ריבית בנק ישראל, מדד המחירים לצרכן ומחשבון המרה</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdateText && <span className="text-xs text-muted-foreground">עדכון אחרון: {lastUpdateText}</span>}
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchAll} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-900/50 p-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Exchange rate cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          שערי חליפין מול השקל
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {['USD', 'EUR', 'GBP', 'BTC'].map((code) => (
            <RateCard
              key={code}
              code={code}
              rate={rates[code]?.rate}
              change={rates[code]?.change}
              history={rates[code]?.history}
              lastUpdate={rates[code]?.lastUpdate}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* Economic indicators */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          מדדים כלכליים — השוק הישראלי
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <IndicatorCard
            icon={Landmark}
            title="ריבית בנק ישראל"
            value={manual.boiRate}
            suffix="%"
            subtitle="שיעור ריבית נומינלית"
            editable
            tone="bg-blue-50 border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50"
            onSave={(v) => setManual((p) => ({ ...p, boiRate: v }))}
          />
          <IndicatorCard
            icon={Landmark}
            title="ריבית פריים"
            value={manual.primeRate}
            suffix="%"
            subtitle="ריבית בנקאית בסיסית"
            editable
            tone="bg-violet-50 border-violet-200 dark:bg-violet-950/25 dark:border-violet-900/50"
            onSave={(v) => setManual((p) => ({ ...p, primeRate: v }))}
          />
          <IndicatorCard
            icon={BarChart3}
            title="מדד המחירים לצרכן"
            value={manual.cpiValue}
            subtitle={`שינוי חודשי: ${manual.cpiMonthly}% · שנתי: ${manual.cpiAnnual}%`}
            editable
            tone="bg-amber-50 border-amber-200 dark:bg-amber-950/25 dark:border-amber-900/50"
            onSave={(v) => setManual((p) => ({ ...p, cpiValue: v }))}
          />
          <IndicatorCard
            icon={BarChart3}
            title="שינוי שנתי CPI"
            value={manual.cpiAnnual}
            suffix="%"
            subtitle="אינפלציה שנתית"
            editable
            tone="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50"
            onSave={(v) => setManual((p) => ({ ...p, cpiAnnual: v }))}
          />
        </div>
        <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>נתוני ריבית ומדד מתעדכנים ידנית. לחץ על "ערוך" בכל כרטיסייה לעדכון. הערכים נשמרים באופן מקומי בדפדפן.</p>
        </div>
      </div>

      {/* Converter */}
      <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">מחשבון המרה</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-2">
            <Label className="text-xs">סכום</Label>
            <Input type="number" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} dir="ltr" placeholder="100" />
            <Select value={convFrom} onValueChange={setConvFrom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{CURRENCY_META[c].label} ({c})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center pb-1">
            <Button variant="outline" size="icon" onClick={handleSwap} className="rounded-full">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">תוצאה</Label>
            <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-semibold text-foreground" dir="ltr">
              {convResult ? `${fmtNum(convResult, convTo === 'BTC' ? 6 : 2)} ${convTo}` : '—'}
            </div>
            <Select value={convTo} onValueChange={setConvTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{CURRENCY_META[c].label} ({c})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {convFrom !== convTo && rates[convFrom]?.rate && (
          <p className="text-xs text-muted-foreground">
            1 {convFrom} = {fmtRate(rateMatrix[convFrom]?.[convTo])} {convTo}
          </p>
        )}
      </div>

      {/* Conservative income calculator */}
      <div className="bg-card rounded-2xl border border-border p-4 md:p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">מחשבון הכנסה במט"ח (שמרני)</h3>
          <p className="text-sm text-muted-foreground mt-1">המרת הכנסה במט"ח לשקלים עם מקדם שמרנות — שימושי לבדיקת יחס החזר והכנסה פנויה</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">סכום הכנסה</Label>
            <Input type="number" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">מטבע ההכנסה</Label>
            <Select value={incomeCurrency} onValueChange={setIncomeCurrency}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['USD', 'EUR', 'GBP', 'BTC'].map((c) => <SelectItem key={c} value={c}>{CURRENCY_META[c].label} ({c})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">מקדם שמרנות</Label>
            <Select value={String(conservativeFactor)} onValueChange={(v) => setConservativeFactor(Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSERVATIVE_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">שער רציף</p>
            <p className="text-lg font-bold text-foreground">{baseRate ? `₪${fmtRate(baseRate)}` : '—'}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-900/50 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">שער לאחר שמרנות</p>
            <p className="text-lg font-bold text-foreground">{conservativeRate ? `₪${fmtRate(conservativeRate)}` : '—'}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/25 dark:border-emerald-900/50 p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">סכום בשקלים</p>
            <p className="text-lg font-bold text-foreground">{incomeResultILS ? `₪${fmtNum(incomeResultILS, 0)}` : '—'}</p>
            {conservativeFactor > 0 && incomeResultDiff > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">הפחתה: ₪{fmtNum(incomeResultDiff, 0)}</p>
            )}
          </div>
        </div>
        {!baseRate && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>שער המטבע הנבחר אינו זמין כעת. רענן את הנתונים או נסה שוב מאוחר יותר.</p>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground leading-6">
        מקורות: Frankfurter API (מט"ח), CoinGecko (BTC). נתוני ריבית ומדד מחירים מתעדכנים ידנית. הנתונים להערכה בלבד ואינם מהווים ייעוץ מקצועי.
      </div>
    </div>
  );
}