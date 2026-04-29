import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Droplets,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Plus,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const SALARY_TARGET = 25000;
const TAX_BUFFER_RATE = 0.26;
const ACTIVE_STAGES = ['מכרז ריביות', 'בנק מנצח', 'ביטוחות וחתימות', 'המתנה לביצוע'];
const PIPELINE_STAGES = ['בנק מנצח', 'ביטוחות וחתימות', 'המתנה לביצוע'];
const HIGH_WORKLOAD_THRESHOLD = 5;

const STORAGE_KEY = 'amit-business-data';

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStored(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function GaugeBar({ value, max, color, label, sublabel }) {
  const pct = Math.min(100, Math.max(0, ((value || 0) / (max || 1)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground text-xs">{sublabel}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-left">{Math.round(pct)}%</div>
    </div>
  );
}

export default function AdminBusiness() {
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState(loadStored);

  // Editable fields
  const [newIncome, setNewIncome] = useState('');
  const [avgDealSize, setAvgDealSize] = useState(stored.avgDealSize || 8000);
  const [assetsValue, setAssetsValue] = useState(stored.assetsValue || 0);
  const [incomeLog, setIncomeLog] = useState(stored.incomeLog || []);

  useEffect(() => {
    const load = async () => {
      try {
        const [profilesRes, stagesRes] = await Promise.all([
          base44.entities.ClientProfile.filter({}, '-created_date'),
          base44.entities.ProcessStage.filter({}, '-created_date'),
        ]);
        setClients(profilesRes);
        setStages(stagesRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const persist = (patch) => {
    const next = { ...stored, ...patch };
    setStored(next);
    saveStored(next);
  };

  const handleAddIncome = () => {
    const amount = Number(String(newIncome).replace(/,/g, ''));
    if (!amount || amount <= 0) return;
    const net = amount * (1 - TAX_BUFFER_RATE);
    const tax = amount * TAX_BUFFER_RATE;
    const entry = {
      id: Date.now(),
      gross: amount,
      net,
      tax,
      date: new Date().toLocaleDateString('he-IL'),
      month: new Date().toLocaleString('he-IL', { month: 'long', year: 'numeric' }),
    };
    const next = [...incomeLog, entry];
    setIncomeLog(next);
    persist({ incomeLog: next });
    setNewIncome('');
    toast.success(`הכנסה של ${fmt(amount)} נרשמה. נטו למאגר: ${fmt(net)}`);
  };

  const handleRemoveIncome = (id) => {
    const next = incomeLog.filter((e) => e.id !== id);
    setIncomeLog(next);
    persist({ incomeLog: next });
  };

  // === Derived metrics ===
  const totalGross = useMemo(() => incomeLog.reduce((s, e) => s + e.gross, 0), [incomeLog]);
  const totalNet = useMemo(() => incomeLog.reduce((s, e) => s + e.net, 0), [incomeLog]);
  const totalTax = useMemo(() => incomeLog.reduce((s, e) => s + e.tax, 0), [incomeLog]);
  const reservoirMonths = totalNet > 0 ? Math.floor(totalNet / SALARY_TARGET) : 0;
  const reservoirRemainder = totalNet % SALARY_TARGET;

  // Active cases (clients with a stage that isn't done)
  const activeCount = useMemo(() => {
    const activeStageEmails = new Set(
      stages
        .filter((s) => ACTIVE_STAGES.includes(s.current_stage))
        .map((s) => s.client_email),
    );
    return activeStageEmails.size;
  }, [stages]);

  // Pipeline — cases close to deal
  const pipelineCount = useMemo(() => {
    return stages.filter((s) => PIPELINE_STAGES.includes(s.current_stage)).length;
  }, [stages]);

  const pipelineForecast = pipelineCount * (avgDealSize || 8000);

  // Moving average chart — group by month
  const monthlyChart = useMemo(() => {
    const map = {};
    incomeLog.forEach((e) => {
      map[e.month] = (map[e.month] || 0) + e.net;
    });
    return Object.entries(map).map(([month, net]) => ({ month, net }));
  }, [incomeLog]);

  const isHighWorkload = activeCount >= HIGH_WORKLOAD_THRESHOLD;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* === ALERTS === */}
      {isHighWorkload && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">עומס גבוה מזוהה — {activeCount} תיקים פעילים</p>
            <p className="text-sm text-amber-700 mt-0.5">סיכון לחריגה בתקציב זמן. מומלץ לתעדף ולהתארגן מראש.</p>
          </div>
        </div>
      )}

      {/* === TOP KPI ROW === */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>דלק במאגר</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{reservoirMonths} חודשים</p>
          <p className="text-xs text-muted-foreground">+ {fmt(reservoirRemainder)} עודף</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>מאגר נטו</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalNet)}</p>
          <p className="text-xs text-muted-foreground">קופת מיסים: {fmt(totalTax)}</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span>צנרת 2 חודשים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(pipelineForecast)}</p>
          <p className="text-xs text-muted-foreground">{pipelineCount} תיקים בשלבי סגירה</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>תיקים פעילים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">סף עומס: {HIGH_WORKLOAD_THRESHOLD}</p>
        </div>
      </div>

      {/* === GAUGES === */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          מדדי חוסן
        </h3>
        <GaugeBar
          value={totalNet}
          max={SALARY_TARGET * 6}
          color="bg-blue-500"
          label="מאגר משכורות"
          sublabel={`יעד: 6 חודשים × ${fmt(SALARY_TARGET)}`}
        />
        <GaugeBar
          value={pipelineForecast}
          max={SALARY_TARGET * 3}
          color="bg-violet-500"
          label="צנרת צפויה"
          sublabel={`יעד חודשי: ${fmt(SALARY_TARGET)}`}
        />
        <GaugeBar
          value={Number(assetsValue) || 0}
          max={500000}
          color="bg-emerald-500"
          label="שווי נכסים מניבים"
          sublabel="הזנה ידנית"
        />
      </div>

      {/* === INPUT ROW === */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Add Income */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">קליטת הכנסה מתיק</h3>
          <p className="text-xs text-muted-foreground">26% יועברו לקופת מיסים, היתרה למאגר</p>
          <Label>סכום גולמי (₪)</Label>
          <Input
            type="number"
            value={newIncome}
            onChange={(e) => setNewIncome(e.target.value)}
            placeholder="למשל: 15000"
            dir="ltr"
          />
          <Button className="w-full gap-2" onClick={handleAddIncome} disabled={!newIncome}>
            <Plus className="w-4 h-4" />
            הוסף הכנסה
          </Button>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">הגדרות</h3>
          <div>
            <Label>עמלה ממוצעת לתיק (₪)</Label>
            <Input
              type="number"
              value={avgDealSize}
              onChange={(e) => {
                setAvgDealSize(e.target.value);
                persist({ avgDealSize: Number(e.target.value) });
              }}
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label>שווי נכסים מניבים (₪)</Label>
            <Input
              type="number"
              value={assetsValue}
              onChange={(e) => {
                setAssetsValue(e.target.value);
                persist({ assetsValue: Number(e.target.value) });
              }}
              dir="ltr"
              className="mt-1"
            />
          </div>
        </div>

        {/* What to do now */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">מה לעשות עכשיו?</h3>
          <div className="space-y-2 text-sm">
            {reservoirMonths < 2 && (
              <div className="flex items-start gap-2 text-red-700 bg-red-50 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>המאגר נמוך מ-2 חודשים — יש לתעדף סגירת עסקאות.</span>
              </div>
            )}
            {reservoirMonths >= 2 && reservoirMonths < 4 && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>מאגר בינוני — להמשיך לעבוד על הצנרת.</span>
              </div>
            )}
            {reservoirMonths >= 4 && (
              <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>מאגר חזק — אפשר להתמקד בצמיחה.</span>
              </div>
            )}
            {isHighWorkload && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>עומס גבוה — לשקול האצלת אחריות.</span>
              </div>
            )}
            {pipelineCount === 0 && (
              <div className="flex items-start gap-2 text-slate-700 bg-slate-50 rounded-lg p-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>הצנרת ריקה — להכניס תיקים חדשים.</span>
              </div>
            )}
            {pipelineCount > 0 && (
              <div className="flex items-start gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
                <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{pipelineCount} תיקים בשלב סגירה — לדחוף לסיום.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === INCOME CHART === */}
      {monthlyChart.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-bold text-foreground mb-4">הכנסות נטו לפי חודש</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(v) => [fmt(v), 'נטו']} />
              <ReferenceLine y={SALARY_TARGET} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'יעד', position: 'insideTopRight', fontSize: 11, fill: '#6366f1' }} />
              <Bar dataKey="net" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* === INCOME LOG === */}
      {incomeLog.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">יומן הכנסות</h3>
            <span className="text-xs text-muted-foreground">סה״כ גולמי: {fmt(totalGross)}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...incomeLog].reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold text-foreground">{fmt(entry.gross)}</span>
                  <span className="text-muted-foreground mr-2 text-xs">גולמי</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-medium">נטו {fmt(entry.net)}</span>
                  <span className="text-red-500">מיסים {fmt(entry.tax)}</span>
                  <span>{entry.date}</span>
                  <button
                    onClick={() => handleRemoveIncome(entry.id)}
                    className="text-destructive hover:underline"
                  >
                    הסר
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}