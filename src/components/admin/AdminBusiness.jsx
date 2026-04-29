import { useEffect, useState, useMemo, useRef } from 'react';
import SimulationPanel from './SimulationPanel';
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
  Trash2,
  Repeat,
  CreditCard,
  Power,
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
const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'אחר'];
const DB_KEY = 'main';

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
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
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground text-left">{Math.round(pct)}%</div>
    </div>
  );
}

const DEFAULT_DATA = {
  incomeLog: [],
  fixedExpenses: [],
  variableExpenses: [],
  avgDealSize: 8000,
  manualPipeline: 0,
  assetsValue: 0,
  manualActiveCount: '',
};

export default function AdminBusiness() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);

  // Data state
  const [incomeLog, setIncomeLog] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [avgDealSize, setAvgDealSize] = useState(8000);
  const [manualPipeline, setManualPipeline] = useState(0);
  const [assetsValue, setAssetsValue] = useState(0);
  const [manualActiveCount, setManualActiveCount] = useState('');

  // Input state
  const [newIncome, setNewIncome] = useState('');
  const [newIncomeSource, setNewIncomeSource] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState('משכנתאות');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarAmount, setNewVarAmount] = useState('');
  const [newVarInstallments, setNewVarInstallments] = useState('1');

  // Debounce save
  const saveTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [stagesRes, records] = await Promise.all([
          base44.entities.ProcessStage.filter({}, '-created_date'),
          base44.entities.BusinessData.filter({ key: DB_KEY }),
        ]);
        setStages(stagesRes);

        if (records.length > 0) {
          const r = records[0];
          setRecordId(r.id);
          setIncomeLog(r.incomeLog || []);
          setFixedExpenses(r.fixedExpenses || []);
          setVariableExpenses(r.variableExpenses || []);
          setAvgDealSize(r.avgDealSize ?? 8000);
          setManualPipeline(r.manualPipeline ?? 0);
          setAssetsValue(r.assetsValue ?? 0);
          setManualActiveCount(r.manualActiveCount ?? '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const persist = async (patch) => {
    const data = {
      incomeLog,
      fixedExpenses,
      variableExpenses,
      avgDealSize,
      manualPipeline,
      assetsValue,
      manualActiveCount,
      ...patch,
    };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        if (recordId) {
          await base44.entities.BusinessData.update(recordId, data);
        } else {
          const created = await base44.entities.BusinessData.create({ key: DB_KEY, ...data });
          setRecordId(created.id);
        }
      } catch (err) {
        toast.error('שגיאה בשמירת הנתונים');
      } finally {
        setSaving(false);
      }
    }, 600);
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
      source: newIncomeSource.trim() || 'לא צוין',
      category: newIncomeCategory,
      date: new Date().toLocaleDateString('he-IL'),
      month: new Date().toLocaleString('he-IL', { month: 'long', year: 'numeric' }),
    };
    const next = [...incomeLog, entry];
    setIncomeLog(next);
    persist({ incomeLog: next });
    setNewIncome('');
    setNewIncomeSource('');
    setNewIncomeCategory('משכנתאות');
    toast.success(`הכנסה של ${fmt(amount)} נרשמה. נטו למאגר: ${fmt(net)}`);
  };

  const handleRemoveIncome = (id) => {
    const next = incomeLog.filter((e) => e.id !== id);
    setIncomeLog(next);
    persist({ incomeLog: next });
  };

  const handleToggleFixed = (id) => {
    const next = fixedExpenses.map((e) =>
      e.id === id ? { ...e, enabled: e.enabled === false ? true : false } : e
    );
    setFixedExpenses(next);
    persist({ fixedExpenses: next });
  };

  const handleAddFixed = () => {
    const amount = Number(String(newFixedAmount).replace(/,/g, ''));
    if (!newFixedName.trim() || !amount) return;
    const next = [...fixedExpenses, { id: Date.now(), name: newFixedName.trim(), amount, enabled: true }];
    setFixedExpenses(next);
    persist({ fixedExpenses: next });
    setNewFixedName('');
    setNewFixedAmount('');
  };

  const handleRemoveFixed = (id) => {
    const next = fixedExpenses.filter((e) => e.id !== id);
    setFixedExpenses(next);
    persist({ fixedExpenses: next });
  };

  const handleAddVariable = () => {
    const amount = Number(String(newVarAmount).replace(/,/g, ''));
    const installments = Math.max(1, Number(newVarInstallments) || 1);
    if (!newVarName.trim() || !amount) return;
    const entry = {
      id: Date.now(),
      name: newVarName.trim(),
      totalAmount: amount,
      installments,
      installmentAmount: Math.round(amount / installments),
      paidInstallments: 0,
      startDate: new Date().toLocaleDateString('he-IL'),
    };
    const next = [...variableExpenses, entry];
    setVariableExpenses(next);
    persist({ variableExpenses: next });
    setNewVarName('');
    setNewVarAmount('');
    setNewVarInstallments('1');
    toast.success(`הוצאה "${entry.name}" נוספה — ${installments} תשלומים של ${fmt(entry.installmentAmount)}`);
  };

  const handlePayInstallment = (id) => {
    const next = variableExpenses.map((e) =>
      e.id === id ? { ...e, paidInstallments: Math.min(e.paidInstallments + 1, e.installments) } : e
    );
    setVariableExpenses(next);
    persist({ variableExpenses: next });
  };

  const handleRemoveVariable = (id) => {
    const next = variableExpenses.filter((e) => e.id !== id);
    setVariableExpenses(next);
    persist({ variableExpenses: next });
  };

  // === Derived metrics ===
  const totalGross = useMemo(() => incomeLog.reduce((s, e) => s + e.gross, 0), [incomeLog]);
  const totalNet = useMemo(() => incomeLog.reduce((s, e) => s + e.net, 0), [incomeLog]);
  const totalTax = useMemo(() => incomeLog.reduce((s, e) => s + e.tax, 0), [incomeLog]);

  const monthlyFixedTotal = useMemo(() =>
    fixedExpenses.filter((e) => e.enabled !== false).reduce((s, e) => s + e.amount, 0),
    [fixedExpenses]
  );
  const activeVariableMonthly = useMemo(() =>
    variableExpenses.filter((e) => e.paidInstallments < e.installments).reduce((s, e) => s + e.installmentAmount, 0),
    [variableExpenses]
  );
  const totalMonthlyExpenses = monthlyFixedTotal + activeVariableMonthly;
  const reservoirMonths = totalNet > 0 ? Math.floor(totalNet / SALARY_TARGET) : 0;
  const reservoirRemainder = totalNet % SALARY_TARGET;

  const activeCount = useMemo(() => {
    if (manualActiveCount !== '' && Number(manualActiveCount) >= 0) return Number(manualActiveCount);
    const activeStageEmails = new Set(
      stages.filter((s) => ACTIVE_STAGES.includes(s.current_stage)).map((s) => s.client_email),
    );
    return activeStageEmails.size;
  }, [stages, manualActiveCount]);

  const pipelineCount = useMemo(() =>
    stages.filter((s) => PIPELINE_STAGES.includes(s.current_stage)).length,
    [stages]
  );

  const autoPipelineForecast = pipelineCount * (avgDealSize || 8000);
  const pipelineForecast = Number(manualPipeline) > 0 ? Number(manualPipeline) : autoPipelineForecast;

  const categoryTotals = useMemo(() => {
    const map = {};
    INCOME_CATEGORIES.forEach((c) => { map[c] = 0; });
    incomeLog.forEach((e) => { map[e.category || 'אחר'] = (map[e.category || 'אחר'] || 0) + e.net; });
    return map;
  }, [incomeLog]);

  const monthlyChart = useMemo(() => {
    const map = {};
    incomeLog.forEach((e) => { map[e.month] = (map[e.month] || 0) + e.net; });
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
      {saving && (
        <div className="text-xs text-muted-foreground text-left">שומר...</div>
      )}

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
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
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
          <p className="text-xs text-muted-foreground">
            {Number(manualPipeline) > 0 ? 'הזנה ידנית' : `${pipelineCount} תיקים אוטומטי`}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>תיקים פעילים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">
            {manualActiveCount !== '' ? 'הזנה ידנית' : 'אוטומטי'} · סף עומס: {HIGH_WORKLOAD_THRESHOLD}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <CreditCard className="w-4 h-4 text-red-500" />
            <span>הוצאות חודשיות</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalMonthlyExpenses)}</p>
          <p className="text-xs text-muted-foreground">קבועות: {fmt(monthlyFixedTotal)} | משתנות: {fmt(activeVariableMonthly)}</p>
        </div>
      </div>

      {/* === GAUGES === */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          מדדי חוסן
        </h3>
        <GaugeBar value={totalNet} max={SALARY_TARGET * 6} color="bg-blue-500" label="מאגר משכורות" sublabel={`יעד: 6 חודשים × ${fmt(SALARY_TARGET)}`} />
        <GaugeBar value={pipelineForecast} max={SALARY_TARGET * 3} color="bg-violet-500" label="צנרת צפויה" sublabel={`יעד חודשי: ${fmt(SALARY_TARGET)}`} />
        <GaugeBar value={Number(assetsValue) || 0} max={500000} color="bg-emerald-500" label="שווי נכסים מניבים" sublabel="הזנה ידנית" />
      </div>

      {/* === INPUT ROW === */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Add Income */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">קליטת הכנסה מתיק</h3>
          <p className="text-xs text-muted-foreground">26% יועברו לקופת מיסים, היתרה למאגר</p>
          <Label>סכום גולמי (₪)</Label>
          <Input type="number" value={newIncome} onChange={(e) => setNewIncome(e.target.value)} placeholder="למשל: 15000" dir="ltr" />
          <Label>ממי / שם הלקוח</Label>
          <Input value={newIncomeSource} onChange={(e) => setNewIncomeSource(e.target.value)} placeholder="למשל: ישראל ישראלי" />
          <Label>קטגוריה</Label>
          <select value={newIncomeCategory} onChange={(e) => setNewIncomeCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
            <Input type="number" value={avgDealSize} onChange={(e) => { setAvgDealSize(e.target.value); persist({ avgDealSize: Number(e.target.value) }); }} dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label>צנרת ידנית (₪) — מבטל חישוב אוטומטי</Label>
            <Input type="number" value={manualPipeline} onChange={(e) => { setManualPipeline(e.target.value); persist({ manualPipeline: Number(e.target.value) }); }} dir="ltr" className="mt-1" placeholder="0 = חישוב אוטומטי" />
          </div>
          <div>
            <Label>שווי נכסים מניבים (₪)</Label>
            <Input type="number" value={assetsValue} onChange={(e) => { setAssetsValue(e.target.value); persist({ assetsValue: Number(e.target.value) }); }} dir="ltr" className="mt-1" />
          </div>
          <div>
            <Label>תיקים פעילים (ידני) — מבטל חישוב אוטומטי</Label>
            <Input type="number" value={manualActiveCount} onChange={(e) => { setManualActiveCount(e.target.value); persist({ manualActiveCount: e.target.value }); }} dir="ltr" className="mt-1" placeholder="ריק = חישוב אוטומטי" min="0" />
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

      {/* === CATEGORY BREAKDOWN === */}
      {incomeLog.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-bold text-foreground mb-4">פילוח הכנסות לפי קטגוריה (נטו)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {INCOME_CATEGORIES.map((cat) => {
              const val = categoryTotals[cat] || 0;
              const pct = totalNet > 0 ? Math.round((val / totalNet) * 100) : 0;
              const colors = {
                'משכנתאות': 'bg-blue-50 border-blue-200 text-blue-700',
                'כ.ד': 'bg-emerald-50 border-emerald-200 text-emerald-700',
                'הייטק': 'bg-violet-50 border-violet-200 text-violet-700',
                'אחר': 'bg-slate-50 border-slate-200 text-slate-600',
              };
              return (
                <div key={cat} className={`rounded-xl border p-4 ${colors[cat] || colors['אחר']}`}>
                  <p className="text-sm font-semibold">{cat}</p>
                  <p className="text-xl font-bold mt-1">{fmt(val)}</p>
                  <p className="text-xs opacity-70 mt-0.5">{pct}% מסך הנטו</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === EXPENSES === */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fixed Expenses */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-foreground">הוצאות קבועות חודשיות</h3>
          </div>
          <p className="text-xs text-muted-foreground">חוזרות כל חודש אוטומטית</p>
          <div className="flex gap-2">
            <Input value={newFixedName} onChange={(e) => setNewFixedName(e.target.value)} placeholder="שם ההוצאה" className="flex-1" />
            <Input type="number" value={newFixedAmount} onChange={(e) => setNewFixedAmount(e.target.value)} placeholder="₪" dir="ltr" className="w-28" onKeyDown={(e) => e.key === 'Enter' && handleAddFixed()} />
            <Button size="icon" onClick={handleAddFixed} disabled={!newFixedName || !newFixedAmount}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {fixedExpenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">אין הוצאות קבועות</p>}
            {fixedExpenses.map((e) => {
              const active = e.enabled !== false;
              return (
                <div key={e.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-opacity ${active ? 'border-border' : 'border-border opacity-50'}`}>
                  <span className={`font-medium ${active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${active ? 'text-red-600' : 'text-muted-foreground'}`}>{fmt(e.amount)}</span>
                    <button onClick={() => handleToggleFixed(e.id)} title={active ? 'כבה הוצאה החודש' : 'הדלק הוצאה'} className={`transition-colors ${active ? 'text-emerald-600 hover:text-emerald-800' : 'text-muted-foreground hover:text-emerald-600'}`}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRemoveFixed(e.id)} className="text-destructive hover:text-destructive/70">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {fixedExpenses.length > 0 && (
            <div className="pt-1 border-t border-border text-sm font-semibold flex justify-between">
              <span className="text-muted-foreground">סה"כ חודשי:</span>
              <span className="text-red-600">{fmt(monthlyFixedTotal)}</span>
            </div>
          )}
        </div>

        {/* Variable Expenses */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-foreground">הוצאות משתנות (תשלומים)</h3>
          </div>
          <p className="text-xs text-muted-foreground">מתפרסות על פני מספר חודשים</p>
          <div className="space-y-2">
            <Input value={newVarName} onChange={(e) => setNewVarName(e.target.value)} placeholder="שם ההוצאה" />
            <div className="flex gap-2">
              <Input type="number" value={newVarAmount} onChange={(e) => setNewVarAmount(e.target.value)} placeholder="סכום כולל ₪" dir="ltr" className="flex-1" />
              <Input type="number" value={newVarInstallments} onChange={(e) => setNewVarInstallments(e.target.value)} placeholder="תשלומים" dir="ltr" className="w-28" min="1" />
              <Button size="icon" onClick={handleAddVariable} disabled={!newVarName || !newVarAmount}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {newVarAmount && newVarInstallments && Number(newVarInstallments) > 1 && (
              <p className="text-xs text-muted-foreground">
                {Number(newVarInstallments)} × {fmt(Math.round(Number(newVarAmount) / Number(newVarInstallments)))} לחודש
              </p>
            )}
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {variableExpenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">אין הוצאות משתנות</p>}
            {variableExpenses.map((e) => {
              const remaining = e.installments - e.paidInstallments;
              const done = remaining === 0;
              return (
                <div key={e.id} className={`rounded-lg border px-3 py-2.5 text-sm space-y-1.5 ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium ${done ? 'text-emerald-700 line-through' : 'text-foreground'}`}>{e.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-xs ${done ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {done ? 'שולם' : `${fmt(e.installmentAmount)}/חודש`}
                      </span>
                      <button onClick={() => handleRemoveVariable(e.id)} className="text-destructive hover:text-destructive/70">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${(e.paidInstallments / e.installments) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{e.paidInstallments}/{e.installments} תשלומים</span>
                    {!done && (
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => handlePayInstallment(e.id)}>שולם</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {variableExpenses.some((e) => e.paidInstallments < e.installments) && (
            <div className="pt-1 border-t border-border text-sm font-semibold flex justify-between">
              <span className="text-muted-foreground">חודש נוכחי:</span>
              <span className="text-orange-600">{fmt(activeVariableMonthly)}</span>
            </div>
          )}
        </div>
      </div>

      {/* === SIMULATION === */}
      <SimulationPanel fixedExpenses={fixedExpenses} monthlyFixedTotal={monthlyFixedTotal} variableExpenses={variableExpenses} activeVariableMonthly={activeVariableMonthly} />

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
                  {entry.source && entry.source !== 'לא צוין' && (
                    <span className="text-xs text-primary font-medium mr-1">· {entry.source}</span>
                  )}
                  {entry.category && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-1">{entry.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-medium">נטו {fmt(entry.net)}</span>
                  <span className="text-red-500">מיסים {fmt(entry.tax)}</span>
                  <span>{entry.date}</span>
                  <button onClick={() => handleRemoveIncome(entry.id)} className="text-destructive hover:underline">הסר</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}