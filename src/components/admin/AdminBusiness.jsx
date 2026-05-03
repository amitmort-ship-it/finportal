import { useEffect, useState, useMemo, useRef } from 'react';
import SimulationPanel from './SimulationPanel';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Pencil,
  ChevronDown,
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
const MONTHLY_GROSS_TARGET = 51500;
const TAX_BUFFER_RATE = 0.26;
const HITECH_TAX_RATE = 0.12;
const ACTIVE_STAGES = ['מכרז ריביות', 'בנק מנצח', 'ביטוחות וחתימות', 'המתנה לביצוע'];
const PIPELINE_STAGES = ['בנק מנצח', 'ביטוחות וחתימות', 'המתנה לביצוע'];
const HIGH_WORKLOAD_THRESHOLD = 5;
const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'אחר'];
const DEAL_BUCKETS = ['חדש', 'בתהליך', 'ממתין לתשלום', 'שולם חלקית', 'שולם מלא'];
const DB_KEY = 'main';
const DEAL_LOG_STORAGE_KEY = 'admin_business_deal_log_v1';

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabelFromDate(date) {
  return date.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
}

function getEntryMonthKey(entry) {
  if (entry?.monthKey) {
    return entry.monthKey;
  }

  if (entry?.createdAt) {
    const parsed = new Date(entry.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  return null;
}

function getEntryMonthLabel(entry) {
  if (entry?.month) {
    return entry.month;
  }

  if (entry?.createdAt) {
    const parsed = new Date(entry.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return getMonthLabelFromDate(parsed);
    }
  }

  return 'חודש לא ידוע';
}

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

function getTaxRateForCategory(category) {
  return category === 'הייטק' ? HITECH_TAX_RATE : TAX_BUFFER_RATE;
}

function GaugeBar({ value, max, color, label, sublabel, valueLabel }) {
  const pct = Math.min(100, Math.max(0, ((value || 0) / (max || 1)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-foreground text-sm font-semibold">{valueLabel || fmt(value)}</span>
      </div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground text-left">{Math.round(pct)}%</div>
    </div>
  );
}

function ColumnFilterButton({ label, active = false }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
      <span>{label}</span>
      <ChevronDown className="w-3.5 h-3.5" />
    </span>
  );
}

const DEFAULT_DATA = {
  incomeLog: [],
  dealLog: [],
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
  const [dealLogHydrated, setDealLogHydrated] = useState(false);

  // Data state
  const [incomeLog, setIncomeLog] = useState([]);
  const [dealLog, setDealLog] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [avgDealSize, setAvgDealSize] = useState(8000);
  const [manualPipeline, setManualPipeline] = useState(0);
  const [assetsValue, setAssetsValue] = useState(0);
  const [manualActiveCount, setManualActiveCount] = useState('');
  const [freeNotes, setFreeNotes] = useState('');

  // Input state
  const [newIncome, setNewIncome] = useState('');
  const [newIncomeSource, setNewIncomeSource] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState('משכנתאות');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeValue, setEditIncomeValue] = useState('');
  const [editIncomeSource, setEditIncomeSource] = useState('');
  const [editIncomeCategory, setEditIncomeCategory] = useState('משכנתאות');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarAmount, setNewVarAmount] = useState('');
  const [newVarInstallments, setNewVarInstallments] = useState('1');
  const [newDealClient, setNewDealClient] = useState('');
  const [newDealTotal, setNewDealTotal] = useState('');
  const [newDealCategory, setNewDealCategory] = useState('משכנתאות');
  const [newDealBucket, setNewDealBucket] = useState(DEAL_BUCKETS[0]);
  const [dealBucketFilter, setDealBucketFilter] = useState('all');
  const [dealCategoryFilter, setDealCategoryFilter] = useState('all');
  const [dealStatusFilter, setDealStatusFilter] = useState('all');
  const [dealSearch, setDealSearch] = useState('');
  const [editingDealId, setEditingDealId] = useState(null);
  const [editDealClient, setEditDealClient] = useState('');
  const [editDealTotal, setEditDealTotal] = useState('');
  const [editDealPaid, setEditDealPaid] = useState('');
  const [editDealCategory, setEditDealCategory] = useState('משכנתאות');
  const [editDealBucket, setEditDealBucket] = useState(DEAL_BUCKETS[0]);

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
          const localDealLog = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          setDealLog((Array.isArray(r.dealLog) && r.dealLog.length > 0) ? r.dealLog : (Array.isArray(localDealLog) ? localDealLog : []));
          setFixedExpenses(r.fixedExpenses || []);
          setVariableExpenses(r.variableExpenses || []);
          setAvgDealSize(r.avgDealSize ?? 8000);
          setManualPipeline(r.manualPipeline ?? 0);
          setAssetsValue(r.assetsValue ?? 0);
          setManualActiveCount(r.manualActiveCount ?? '');
          setFreeNotes(r.freeNotes ?? '');
        } else {
          const localDealLog = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          setDealLog(Array.isArray(localDealLog) ? localDealLog : []);
        }
      } catch (err) {
        console.error(err);
        try {
          const localDealLog = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          setDealLog(Array.isArray(localDealLog) ? localDealLog : []);
        } catch (_localErr) {
          setDealLog([]);
        }
      } finally {
        setDealLogHydrated(true);
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!dealLogHydrated) {
      return;
    }

    try {
      localStorage.setItem(DEAL_LOG_STORAGE_KEY, JSON.stringify(dealLog || []));
    } catch (error) {
      console.error('Failed to persist deal log locally:', error);
    }
  }, [dealLog, dealLogHydrated]);

  const persist = async (patch) => {
    const data = {
      incomeLog,
      dealLog,
      fixedExpenses,
      variableExpenses,
      avgDealSize,
      manualPipeline,
      assetsValue,
      manualActiveCount,
      freeNotes,
      ...patch,
    };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        localStorage.setItem(DEAL_LOG_STORAGE_KEY, JSON.stringify(data.dealLog || []));
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
    const taxRate = getTaxRateForCategory(newIncomeCategory);
    const net = amount * (1 - taxRate);
    const tax = amount * taxRate;
    const linkedDeal = selectedDealId ? dealLog.find((deal) => String(deal.id) === String(selectedDealId)) : null;
    const now = new Date();
    const entry = {
      id: Date.now(),
      gross: amount,
      net,
      tax,
      source: linkedDeal?.clientName || newIncomeSource.trim() || 'לא צוין',
      category: linkedDeal?.category || newIncomeCategory,
      date: now.toLocaleDateString('he-IL'),
      month: getMonthLabelFromDate(now),
      monthKey: getCurrentMonthKey(),
      createdAt: now.toISOString(),
      dealId: linkedDeal?.id || null,
    };
    const next = [...incomeLog, entry];
    let nextDeals = dealLog;

    if (linkedDeal) {
      nextDeals = dealLog.map((deal) => {
        if (deal.id !== linkedDeal.id) {
          return deal;
        }

        const totalAmount = Number(deal.totalAmount || 0);
        const paidAmount = Number(deal.paidAmount || 0);
        const updatedPaidAmount = Math.min(totalAmount, paidAmount + amount);
        const remaining = Math.max(0, totalAmount - updatedPaidAmount);

        return {
          ...deal,
          paidAmount: updatedPaidAmount,
          bucket: remaining === 0 ? 'שולם מלא' : updatedPaidAmount > 0 ? 'שולם חלקית' : deal.bucket,
          updatedAt: now.toISOString(),
        };
      });
    }

    setIncomeLog(next);
    if (linkedDeal) {
      setDealLog(nextDeals);
    }
    persist({ incomeLog: next, dealLog: nextDeals });
    setNewIncome('');
    setNewIncomeSource('');
    setNewIncomeCategory('משכנתאות');
    setSelectedDealId('');
    toast.success(`הכנסה של ${fmt(amount)} נרשמה. נטו למאגר: ${fmt(net)}`);
  };

  const handleRemoveIncome = (id) => {
    const currentEntry = incomeLog.find((entry) => entry.id === id);
    const next = incomeLog.filter((e) => e.id !== id);
    let nextDeals = dealLog;

    if (currentEntry?.dealId) {
      nextDeals = dealLog.map((deal) => {
        if (deal.id !== currentEntry.dealId) {
          return deal;
        }

        const nextPaidAmount = Math.max(0, Number(deal.paidAmount || 0) - Number(currentEntry.gross || 0));
        return {
          ...deal,
          paidAmount: nextPaidAmount,
          bucket: nextPaidAmount === 0 ? deal.bucket === 'שולם מלא' || deal.bucket === 'שולם חלקית' ? 'ממתין לתשלום' : deal.bucket : 'שולם חלקית',
          updatedAt: new Date().toISOString(),
        };
      });

      setDealLog(nextDeals);
    }

    setIncomeLog(next);
    persist({ incomeLog: next, dealLog: nextDeals });
  };

  const handleStartEditIncome = (entry) => {
    setEditingIncomeId(entry.id);
    setEditIncomeValue(String(entry.gross || ''));
    setEditIncomeSource(entry.source === 'לא צוין' ? '' : (entry.source || ''));
    setEditIncomeCategory(entry.category || 'משכנתאות');
  };

  const handleCancelEditIncome = () => {
    setEditingIncomeId(null);
    setEditIncomeValue('');
    setEditIncomeSource('');
    setEditIncomeCategory('משכנתאות');
  };

  const handleSaveIncomeEdit = (id) => {
    const amount = Number(String(editIncomeValue).replace(/,/g, ''));
    if (!amount || amount <= 0) return;
    const currentEntry = incomeLog.find((entry) => entry.id === id);

    const taxRate = getTaxRateForCategory(editIncomeCategory);
    const net = amount * (1 - taxRate);
    const tax = amount * taxRate;

    const next = incomeLog.map((entry) => (
      entry.id === id
        ? {
            ...entry,
            gross: amount,
            net,
            tax,
            source: editIncomeSource.trim() || 'לא צוין',
            category: editIncomeCategory,
          }
        : entry
    ));

    let nextDeals = dealLog;
    if (currentEntry?.dealId) {
      const delta = amount - Number(currentEntry.gross || 0);
      nextDeals = dealLog.map((deal) => {
        if (deal.id !== currentEntry.dealId) {
          return deal;
        }

        const totalAmount = Number(deal.totalAmount || 0);
        const paidAmount = Number(deal.paidAmount || 0);
        const nextPaidAmount = Math.min(totalAmount, Math.max(0, paidAmount + delta));
        const remaining = Math.max(0, totalAmount - nextPaidAmount);

        return {
          ...deal,
          paidAmount: nextPaidAmount,
          bucket: remaining === 0 ? 'שולם מלא' : nextPaidAmount > 0 ? 'שולם חלקית' : 'ממתין לתשלום',
          updatedAt: new Date().toISOString(),
        };
      });

      setDealLog(nextDeals);
    }

    setIncomeLog(next);
    persist({ incomeLog: next, dealLog: nextDeals });
    handleCancelEditIncome();
    toast.success('העסקה עודכנה');
  };

  const handleAddDeal = () => {
    const totalAmount = Number(String(newDealTotal).replace(/,/g, ''));
    if (!newDealClient.trim() || !totalAmount) return;

    const next = [
      ...dealLog,
      {
        id: Date.now(),
        clientName: newDealClient.trim(),
        totalAmount,
        paidAmount: 0,
        category: newDealCategory,
        bucket: newDealBucket,
        createdAt: new Date().toISOString(),
      },
    ];

    setDealLog(next);
    persist({ dealLog: next });
    setNewDealClient('');
    setNewDealTotal('');
    setNewDealCategory('משכנתאות');
    setNewDealBucket(DEAL_BUCKETS[0]);
    toast.success('העסקה נוספה');
  };

  const handleRemoveDeal = (id) => {
    const next = dealLog.filter((deal) => deal.id !== id);
    setDealLog(next);
    persist({ dealLog: next });
  };

  const handleStartEditDeal = (deal) => {
    setEditingDealId(deal.id);
    setEditDealClient(deal.clientName || '');
    setEditDealTotal(String(deal.totalAmount || ''));
    setEditDealPaid(String(deal.paidAmount || ''));
    setEditDealCategory(deal.category || 'משכנתאות');
    setEditDealBucket(deal.bucket || DEAL_BUCKETS[0]);
  };

  const handleCancelEditDeal = () => {
    setEditingDealId(null);
    setEditDealClient('');
    setEditDealTotal('');
    setEditDealPaid('');
    setEditDealCategory('משכנתאות');
    setEditDealBucket(DEAL_BUCKETS[0]);
  };

  const handleSaveDealEdit = (id) => {
    const totalAmount = Number(String(editDealTotal).replace(/,/g, ''));
    const paidAmount = Number(String(editDealPaid).replace(/,/g, ''));
    if (!editDealClient.trim() || !totalAmount || paidAmount < 0) return;

    const clampedPaidAmount = Math.min(totalAmount, paidAmount);
    const remaining = Math.max(0, totalAmount - clampedPaidAmount);
    const next = dealLog.map((deal) => (
      deal.id === id
        ? {
            ...deal,
            clientName: editDealClient.trim(),
            totalAmount,
            paidAmount: clampedPaidAmount,
            category: editDealCategory,
            bucket: remaining === 0 ? 'שולם מלא' : clampedPaidAmount > 0 ? 'שולם חלקית' : editDealBucket,
            updatedAt: new Date().toISOString(),
          }
        : deal
    ));

    setDealLog(next);
    persist({ dealLog: next });
    handleCancelEditDeal();
    toast.success('העסקה עודכנה');
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
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const currentMonthLabel = useMemo(() => getMonthLabelFromDate(new Date()), []);

  const currentMonthIncomeLog = useMemo(
    () => incomeLog.filter((entry) => getEntryMonthKey(entry) === currentMonthKey || entry?.month === currentMonthLabel),
    [incomeLog, currentMonthKey, currentMonthLabel]
  );

  const historicalIncomeLog = useMemo(
    () => incomeLog.filter((entry) => !(getEntryMonthKey(entry) === currentMonthKey || entry?.month === currentMonthLabel)),
    [incomeLog, currentMonthKey, currentMonthLabel]
  );

  const totalGross = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.gross, 0), [currentMonthIncomeLog]);
  const totalNet = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.net, 0), [currentMonthIncomeLog]);
  const totalTax = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.tax, 0), [currentMonthIncomeLog]);

  const monthlyFixedTotal = useMemo(() =>
    fixedExpenses.filter((e) => e.enabled !== false).reduce((s, e) => s + e.amount, 0),
    [fixedExpenses]
  );
  const activeVariableMonthly = useMemo(() =>
    variableExpenses.filter((e) => e.paidInstallments < e.installments).reduce((s, e) => s + e.installmentAmount, 0),
    [variableExpenses]
  );
  const totalMonthlyExpenses = monthlyFixedTotal + activeVariableMonthly;
  const monthlyGrossTargetGap = Math.max(0, MONTHLY_GROSS_TARGET - totalGross);
  const monthlyGrossTargetOver = Math.max(0, totalGross - MONTHLY_GROSS_TARGET);
  const openDeals = useMemo(
    () => dealLog.filter((deal) => Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0) > 0),
    [dealLog]
  );
  const openDealsOptions = useMemo(
    () => openDeals.map((deal) => ({
      id: deal.id,
      label: `${deal.clientName} · יתרה ${fmt(Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0))}`,
    })),
    [openDeals]
  );
  const openDealsTotal = useMemo(
    () => openDeals.reduce((sum, deal) => sum + Math.max(0, Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0)), 0),
    [openDeals]
  );

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

  const autoPipelineForecast = dealLog.length > 0 ? openDealsTotal : pipelineCount * (avgDealSize || 8000);
  const pipelineForecast = Number(manualPipeline) > 0 ? Number(manualPipeline) : autoPipelineForecast;

  const categoryTotals = useMemo(() => {
    const map = {};
    INCOME_CATEGORIES.forEach((c) => { map[c] = 0; });
    currentMonthIncomeLog.forEach((e) => { map[e.category || 'אחר'] = (map[e.category || 'אחר'] || 0) + e.net; });
    return map;
  }, [currentMonthIncomeLog]);

  const monthlyChart = useMemo(() => {
    const map = {};
    incomeLog.forEach((e) => {
      const label = getEntryMonthLabel(e);
      map[label] = (map[label] || 0) + e.net;
    });
    return Object.entries(map).map(([month, net]) => ({ month, net }));
  }, [incomeLog]);

  const historicalMonths = useMemo(() => {
    const grouped = historicalIncomeLog.reduce((acc, entry) => {
      const key = getEntryMonthKey(entry) || getEntryMonthLabel(entry);
      if (!acc[key]) {
        acc[key] = {
          key,
          month: getEntryMonthLabel(entry),
          gross: 0,
          net: 0,
          tax: 0,
          deals: 0,
        };
      }

      acc[key].gross += entry.gross || 0;
      acc[key].net += entry.net || 0;
      acc[key].tax += entry.tax || 0;
      acc[key].deals += 1;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => String(b.key).localeCompare(String(a.key), 'he'));
  }, [historicalIncomeLog]);

  const filteredDeals = useMemo(() => {
    return dealLog.filter((deal) => {
      const remaining = Math.max(0, Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0));
      const status = remaining === 0 ? 'שולם מלא' : Number(deal.paidAmount || 0) > 0 ? 'שולם חלקית' : 'ממתין לתשלום';
      const matchesBucket = dealBucketFilter === 'all' || deal.bucket === dealBucketFilter;
      const matchesCategory = dealCategoryFilter === 'all' || (deal.category || 'משכנתאות') === dealCategoryFilter;
      const matchesStatus = dealStatusFilter === 'all' || status === dealStatusFilter;
      const matchesSearch = !dealSearch.trim() || String(deal.clientName || '').toLowerCase().includes(dealSearch.trim().toLowerCase());

      return matchesBucket && matchesCategory && matchesStatus && matchesSearch;
    });
  }, [dealBucketFilter, dealCategoryFilter, dealStatusFilter, dealSearch, dealLog]);

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
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/25">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">עומס גבוה מזוהה — {activeCount} תיקים פעילים</p>
            <p className="text-sm text-amber-700 mt-0.5 dark:text-amber-300">סיכון לחריגה בתקציב זמן. מומלץ לתעדף ולהתארגן מראש.</p>
          </div>
        </div>
      )}

      {/* === TOP KPI ROW === */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>יעד ברוטו חודשי</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalGross)}</p>
          <p className="text-xs text-muted-foreground">
            {monthlyGrossTargetGap > 0 ? `חסר ליעד: ${fmt(monthlyGrossTargetGap)}` : `מעל היעד: ${fmt(monthlyGrossTargetOver)}`}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>נטו החודש</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalNet)}</p>
          <p className="text-xs text-muted-foreground">מיסים החודש: {fmt(totalTax)}</p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span>צנרת 2 חודשים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(pipelineForecast)}</p>
          <p className="text-xs text-muted-foreground">
            {Number(manualPipeline) > 0 ? 'הזנה ידנית' : dealLog.length > 0 ? `${openDeals.length} עסקאות פתוחות` : `${pipelineCount} תיקים אוטומטי`}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>תיקים פעילים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">
            {manualActiveCount !== '' ? 'הזנה ידנית' : 'אוטומטי'} · סף עומס: {HIGH_WORKLOAD_THRESHOLD}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <CreditCard className="w-4 h-4 text-red-500" />
            <span>הוצאות חודשיות</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalMonthlyExpenses)}</p>
          <p className="text-xs text-muted-foreground">קבועות: {fmt(monthlyFixedTotal)} | משתנות: {fmt(activeVariableMonthly)}</p>
        </div>
      </div>

      {/* === GAUGES === */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          מדדי חוסן
        </h3>
        <GaugeBar
          value={totalGross}
          max={MONTHLY_GROSS_TARGET}
          color="bg-blue-500"
          label="התקדמות ליעד הברוטו"
          valueLabel={fmt(totalGross)}
          sublabel={`יעד: ${fmt(MONTHLY_GROSS_TARGET)}`}
        />
        <GaugeBar
          value={pipelineForecast}
          max={SALARY_TARGET * 3}
          color="bg-violet-500"
          label="צנרת צפויה"
          valueLabel={fmt(pipelineForecast)}
          sublabel={`יעד חודשי: ${fmt(SALARY_TARGET)}`}
        />
        <GaugeBar
          value={Number(assetsValue) || 0}
          max={500000}
          color="bg-emerald-500"
          label="שווי נכסים מניבים"
          valueLabel={fmt(Number(assetsValue) || 0)}
          sublabel="הזנה ידנית"
        />
      </div>

      {/* === INPUT ROW === */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Add Income */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">קליטת הכנסה מתיק</h3>
          <p className="text-xs text-muted-foreground">הכנסות כאן נספרות לחודש הנוכחי בלבד. הייטק מחושב ב־12% מס, שאר הקטגוריות ב־26%.</p>
          <Label>סכום גולמי (₪)</Label>
          <Input type="number" value={newIncome} onChange={(e) => setNewIncome(e.target.value)} placeholder="למשל: 15000" dir="ltr" />
          <Label>ממי / שם הלקוח</Label>
          <Input value={newIncomeSource} onChange={(e) => setNewIncomeSource(e.target.value)} placeholder="למשל: ישראל ישראלי" />
          <Label>שייך לעסקה קיימת</Label>
          <select value={selectedDealId} onChange={(e) => setSelectedDealId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">ללא קישור לעסקה</option>
            {openDealsOptions.map((deal) => <option key={deal.id} value={deal.id}>{deal.label}</option>)}
          </select>
          <Label>קטגוריה</Label>
          <select value={newIncomeCategory} onChange={(e) => setNewIncomeCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button className="w-full gap-2" onClick={handleAddIncome} disabled={!newIncome}>
            <Plus className="w-4 h-4" />
            הוסף הכנסה
          </Button>
        </div>

        {/* Settings */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-foreground">מה לעשות עכשיו?</h3>
          <div className="space-y-2 text-sm">
            {totalGross < MONTHLY_GROSS_TARGET * 0.5 && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/25 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>החודש עדיין רחוק מיעד הברוטו — יש לתעדף סגירת עסקאות.</span>
              </div>
            )}
            {totalGross >= MONTHLY_GROSS_TARGET * 0.5 && totalGross < MONTHLY_GROSS_TARGET && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>אתה מתקרב ליעד הברוטו החודשי — להמשיך לעבוד על הצנרת.</span>
              </div>
            )}
            {totalGross >= MONTHLY_GROSS_TARGET && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>יעד הברוטו החודשי הושג — אפשר להתמקד בצמיחה.</span>
              </div>
            )}
            {isHighWorkload && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>עומס גבוה — לשקול האצלת אחריות.</span>
              </div>
            )}
            {pipelineCount === 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>הצנרת ריקה — להכניס תיקים חדשים.</span>
              </div>
            )}
            {pipelineCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/25 dark:text-blue-300">
                <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{pipelineCount} תיקים בשלב סגירה — לדחוף לסיום.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === DEAL MANAGEMENT === */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-foreground">ניהול עסקאות</h3>
            <p className="text-xs text-muted-foreground mt-1">כאן מנהלים סכום כולל, כמה כבר נגבה, כמה נשאר, ולאיזה באקט כל עסקה שייכת.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2">
          <Input value={newDealClient} onChange={(e) => setNewDealClient(e.target.value)} placeholder="שם הלקוח" />
          <Input type="number" value={newDealTotal} onChange={(e) => setNewDealTotal(e.target.value)} placeholder="סכום עסקה ₪" dir="ltr" />
          <select value={newDealCategory} onChange={(e) => setNewDealCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {INCOME_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={newDealBucket} onChange={(e) => setNewDealBucket(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {DEAL_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
          </select>
          <Button onClick={handleAddDeal} disabled={!newDealClient || !newDealTotal} className="gap-2 md:col-span-4">
            <Plus className="w-4 h-4" />
            הוסף עסקה
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-right font-medium">לקוח</th>
                <th className="py-2 text-right font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <ColumnFilterButton label="לקוח" active={!!dealSearch.trim()} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 space-y-2" align="start">
                      <Label>חיפוש לקוח</Label>
                      <Input
                        value={dealSearch}
                        onChange={(e) => setDealSearch(e.target.value)}
                        placeholder="הקלד שם לקוח..."
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => setDealSearch('')} disabled={!dealSearch.trim()}>
                        נקה
                      </Button>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <ColumnFilterButton label="קטגוריה" active={dealCategoryFilter !== 'all'} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 space-y-2" align="start">
                      <Label>סינון קטגוריה</Label>
                      <select value={dealCategoryFilter} onChange={(e) => setDealCategoryFilter(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="all">כל הקטגוריות</option>
                        {INCOME_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <ColumnFilterButton label="באקט" active={dealBucketFilter !== 'all'} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 space-y-2" align="start">
                      <Label>סינון באקט</Label>
                      <select value={dealBucketFilter} onChange={(e) => setDealBucketFilter(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="all">כל הבאקטים</option>
                        {DEAL_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
                      </select>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">סה"כ עסקה</th>
                <th className="py-2 text-right font-medium">נגבה</th>
                <th className="py-2 text-right font-medium">יתרה</th>
                <th className="py-2 text-right font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <ColumnFilterButton label="סטטוס" active={dealStatusFilter !== 'all'} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 space-y-2" align="start">
                      <Label>סינון סטטוס</Label>
                      <select value={dealStatusFilter} onChange={(e) => setDealStatusFilter(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="all">כל הסטטוסים</option>
                        <option value="ממתין לתשלום">ממתין לתשלום</option>
                        <option value="שולם חלקית">שולם חלקית</option>
                        <option value="שולם מלא">שולם מלא</option>
                      </select>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-muted-foreground">אין עסקאות להצגה</td>
                </tr>
              )}
              {filteredDeals.map((deal) => {
                const remaining = Math.max(0, Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0));
                const status = remaining === 0 ? 'שולם מלא' : Number(deal.paidAmount || 0) > 0 ? 'שולם חלקית' : 'ממתין לתשלום';

                return (
                  <tr key={deal.id} className="border-b border-border last:border-b-0">
                    <td className="py-3 text-foreground">
                      {editingDealId === deal.id ? (
                        <Input value={editDealClient} onChange={(e) => setEditDealClient(e.target.value)} />
                      ) : (
                        deal.clientName
                      )}
                    </td>
                    <td className="py-3">
                      {editingDealId === deal.id ? (
                        <select value={editDealCategory} onChange={(e) => setEditDealCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {INCOME_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{deal.category || 'משכנתאות'}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingDealId === deal.id ? (
                        <select value={editDealBucket} onChange={(e) => setEditDealBucket(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {DEAL_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{deal.bucket}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingDealId === deal.id ? (
                        <Input type="number" value={editDealTotal} onChange={(e) => setEditDealTotal(e.target.value)} dir="ltr" />
                      ) : (
                        fmt(deal.totalAmount)
                      )}
                    </td>
                    <td className="py-3">
                      {editingDealId === deal.id ? (
                        <Input type="number" value={editDealPaid} onChange={(e) => setEditDealPaid(e.target.value)} dir="ltr" />
                      ) : (
                        fmt(deal.paidAmount)
                      )}
                    </td>
                    <td className="py-3 font-medium text-foreground">{fmt(remaining)}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${remaining === 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-300' : Number(deal.paidAmount || 0) > 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-300'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {editingDealId === deal.id ? (
                          <>
                            <Button size="sm" onClick={() => handleSaveDealEdit(deal.id)}>שמור</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEditDeal}>ביטול</Button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => handleStartEditDeal(deal)} className="text-primary hover:underline inline-flex items-center gap-1">
                              <Pencil className="w-3.5 h-3.5" />
                              ערוך
                            </button>
                            <button type="button" onClick={() => handleRemoveDeal(deal.id)} className="text-destructive hover:underline">הסר</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* === INCOME CHART === */}
      {monthlyChart.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-bold text-foreground mb-4">פילוח הכנסות לפי קטגוריה (נטו, חודש נוכחי)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {INCOME_CATEGORIES.map((cat) => {
              const val = categoryTotals[cat] || 0;
              const pct = totalNet > 0 ? Math.round((val / totalNet) * 100) : 0;
              const colors = {
                'משכנתאות': 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300',
                'כ.ד': 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300',
                'הייטק': 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/25 dark:border-violet-900/50 dark:text-violet-300',
                'אחר': 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/70 dark:border-slate-800 dark:text-slate-300',
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
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
                <div key={e.id} className={`rounded-lg border px-3 py-2.5 text-sm space-y-1.5 ${done ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/25' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium ${done ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-foreground'}`}>{e.name}</span>
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

      {/* === FREE NOTES === */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <span>📝</span>
          רשימות והערות חופשיות
        </h3>
        <textarea
          value={freeNotes}
          onChange={(e) => {
            setFreeNotes(e.target.value);
            persist({ freeNotes: e.target.value });
          }}
          placeholder="כתוב כאן הערות, רשימות, תזכורות... הכל נשמר אוטומטית"
          className="w-full min-h-48 resize-y rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm text-right leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          dir="rtl"
        />
      </div>

      {/* === SIMULATION === */}
      <SimulationPanel fixedExpenses={fixedExpenses} monthlyFixedTotal={monthlyFixedTotal} variableExpenses={variableExpenses} activeVariableMonthly={activeVariableMonthly} />

      {/* === INCOME LOG === */}
      {currentMonthIncomeLog.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">עסקאות החודש</h3>
            <span className="text-xs text-muted-foreground">{currentMonthLabel} · סה״כ גולמי: {fmt(totalGross)}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...currentMonthIncomeLog].reverse().map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                {editingIncomeId === entry.id ? (
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-3 gap-2">
                      <Input type="number" value={editIncomeValue} onChange={(e) => setEditIncomeValue(e.target.value)} placeholder="סכום גולמי" dir="ltr" />
                      <Input value={editIncomeSource} onChange={(e) => setEditIncomeSource(e.target.value)} placeholder="ממי / שם הלקוח" />
                      <select value={editIncomeCategory} onChange={(e) => setEditIncomeCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Button size="sm" onClick={() => handleSaveIncomeEdit(entry.id)}>שמור</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEditIncome}>ביטול</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
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
                      <button type="button" onClick={() => handleStartEditIncome(entry)} className="text-primary hover:underline">ערוך</button>
                      <button type="button" onClick={() => handleRemoveIncome(entry.id)} className="text-destructive hover:underline">הסר</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {historicalMonths.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">היסטוריית חודשים</h3>
            <span className="text-xs text-muted-foreground">עסקאות שנסגרו לפני {currentMonthLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-right font-medium">חודש</th>
                  <th className="py-2 text-right font-medium">עסקאות</th>
                  <th className="py-2 text-right font-medium">גולמי</th>
                  <th className="py-2 text-right font-medium">מיסים</th>
                  <th className="py-2 text-right font-medium">נטו</th>
                </tr>
              </thead>
              <tbody>
                {historicalMonths.map((month) => (
                  <tr key={month.key} className="border-b border-border last:border-b-0">
                    <td className="py-3 font-medium text-foreground">{month.month}</td>
                    <td className="py-3 text-muted-foreground">{month.deals}</td>
                    <td className="py-3 text-foreground">{fmt(month.gross)}</td>
                    <td className="py-3 text-red-600">{fmt(month.tax)}</td>
                    <td className="py-3 text-emerald-600 font-semibold">{fmt(month.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
