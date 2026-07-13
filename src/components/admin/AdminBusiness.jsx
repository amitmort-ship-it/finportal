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
  Download,
  Upload,
  RefreshCw,
  Link2,
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
const TAX_BUFFER_RATE = 0.29;
const HITECH_TAX_RATE = 0.16;
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

function getDealStatus(deal) {
  if (deal?.isFrozen) {
    return 'מוקפאת';
  }

  const remaining = Math.max(0, Number(deal?.totalAmount || 0) - Number(deal?.paidAmount || 0));
  return remaining === 0 ? 'שולם מלא' : Number(deal?.paidAmount || 0) > 0 ? 'שולם חלקית' : 'ממתין לתשלום';
}

function getDealStatusStyles(deal) {
  if (deal?.isFrozen) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300';
  }

  const remaining = Math.max(0, Number(deal?.totalAmount || 0) - Number(deal?.paidAmount || 0));
  if (remaining === 0) {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-300';
  }

  return Number(deal?.paidAmount || 0) > 0
    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-300'
    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-300';
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

function SortButton({ active = false, direction = 'asc' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
      <span>א-ב</span>
      <span>{direction === 'asc' ? '↑' : '↓'}</span>
    </span>
  );
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
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
  const [newIncomeMonthKey, setNewIncomeMonthKey] = useState(getCurrentMonthKey());
  const [selectedDealId, setSelectedDealId] = useState('');
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeValue, setEditIncomeValue] = useState('');
  const [editIncomeSource, setEditIncomeSource] = useState('');
  const [editIncomeCategory, setEditIncomeCategory] = useState('משכנתאות');
  const [editIncomeMonthKey, setEditIncomeMonthKey] = useState('');
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
  const [dealSortBy, setDealSortBy] = useState('default');
  const [dealSortDirection, setDealSortDirection] = useState('asc');
  const [hidePaidDeals, setHidePaidDeals] = useState(true);
  const [editingDealId, setEditingDealId] = useState(null);
  const [editDealClient, setEditDealClient] = useState('');
  const [editDealTotal, setEditDealTotal] = useState('');
  const [editDealPaid, setEditDealPaid] = useState('');
  const [editDealCategory, setEditDealCategory] = useState('משכנתאות');
  const [editDealBucket, setEditDealBucket] = useState(DEAL_BUCKETS[0]);
  const [editDealRag, setEditDealRag] = useState('');
  const [importingDeals, setImportingDeals] = useState(false);
  const [notionSetupLoading, setNotionSetupLoading] = useState(false);
  const [notionSyncLoading, setNotionSyncLoading] = useState(false);
  const [notionStatus, setNotionStatus] = useState(null); // null | 'ok' | 'not_setup'

  // Debounce save
  const saveTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [stagesRes, records] = await Promise.all([
                                  base44.entities.ProcessStage.filter({}, '-created_date'),
                      base44.entities.BusinessData.filter({ key: DB_KEY }),
                    ]);

                            if (records.length > 0) {
                                  const r = records[0];
          setRecordId(r.id);
          setIncomeLog(r.incomeLog || []);
          const localDealLog = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          const resolvedDealLog = (Array.isArray(r.dealLog) && r.dealLog.length > 0)
            ? r.dealLog
            : (Array.isArray(localDealLog) ? localDealLog : []);
          setDealLog(resolvedDealLog);
          // If DB had no dealLog but localStorage does, persist to DB immediately
          if (!(Array.isArray(r.dealLog) && r.dealLog.length > 0) && resolvedDealLog.length > 0) {
                                      base44.entities.BusinessData.update(r.id, { dealLog: resolvedDealLog }).catch(() => {});
          }
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
    // Determine the target month
    const targetMonthKey = newIncomeMonthKey || getCurrentMonthKey();
    const [mYear, mMonth] = targetMonthKey.split('-').map(Number);
    const targetDate = new Date(mYear, mMonth - 1, 1);
    const entry = {
      id: Date.now(),
      gross: amount,
      net,
      tax,
      source: linkedDeal?.clientName || newIncomeSource.trim() || 'לא צוין',
      category: linkedDeal?.category || newIncomeCategory,
      date: now.toLocaleDateString('he-IL'),
      month: getMonthLabelFromDate(targetDate),
      monthKey: targetMonthKey,
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
          bucket: deal.isFrozen ? deal.bucket : remaining === 0 ? 'שולם מלא' : updatedPaidAmount > 0 ? 'שולם חלקית' : deal.bucket,
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
    setNewIncomeMonthKey(getCurrentMonthKey());
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
          bucket: deal.isFrozen ? deal.bucket : nextPaidAmount === 0 ? deal.bucket === 'שולם מלא' || deal.bucket === 'שולם חלקית' ? 'ממתין לתשלום' : deal.bucket : 'שולם חלקית',
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
    setEditIncomeMonthKey(entry.monthKey || getCurrentMonthKey());
  };

  const handleCancelEditIncome = () => {
    setEditingIncomeId(null);
    setEditIncomeValue('');
    setEditIncomeSource('');
    setEditIncomeCategory('משכנתאות');
    setEditIncomeMonthKey('');
  };

  const handleSaveIncomeEdit = (id) => {
    const amount = Number(String(editIncomeValue).replace(/,/g, ''));
    if (!amount || amount <= 0) return;
    const currentEntry = incomeLog.find((entry) => entry.id === id);

    const taxRate = getTaxRateForCategory(editIncomeCategory);
    const net = amount * (1 - taxRate);
    const tax = amount * taxRate;

    const targetMonthKey = editIncomeMonthKey || getCurrentMonthKey();
    const [mYear, mMonth] = targetMonthKey.split('-').map(Number);
    const targetDate = new Date(mYear, mMonth - 1, 1);

    const next = incomeLog.map((entry) => (
      entry.id === id
        ? {
            ...entry,
            gross: amount,
            net,
            tax,
            source: editIncomeSource.trim() || 'לא צוין',
            category: editIncomeCategory,
            monthKey: targetMonthKey,
            month: getMonthLabelFromDate(targetDate),
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
          bucket: deal.isFrozen ? deal.bucket : remaining === 0 ? 'שולם מלא' : nextPaidAmount > 0 ? 'שולם חלקית' : 'ממתין לתשלום',
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
        isFrozen: false,
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
    setEditDealRag(deal.rag_status || '');
  };

  const handleCancelEditDeal = () => {
    setEditingDealId(null);
    setEditDealClient('');
    setEditDealTotal('');
    setEditDealPaid('');
    setEditDealCategory('משכנתאות');
    setEditDealBucket(DEAL_BUCKETS[0]);
    setEditDealRag('');
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
            bucket: deal.isFrozen ? editDealBucket : remaining === 0 ? 'שולם מלא' : clampedPaidAmount > 0 ? 'שולם חלקית' : editDealBucket,
            rag_status: editDealRag,
            updatedAt: new Date().toISOString(),
          }
        : deal
    ));

    setDealLog(next);
    persist({ dealLog: next });
    handleCancelEditDeal();
    toast.success('העסקה עודכנה');
  };

  const handleToggleDealFrozen = (id) => {
    const next = dealLog.map((deal) => (
      deal.id === id
        ? {
            ...deal,
            isFrozen: !deal.isFrozen,
            updatedAt: new Date().toISOString(),
          }
        : deal
    ));

    setDealLog(next);
    persist({ dealLog: next });
    toast.success('סטטוס ההקפאה של העסקה עודכן');
  };

  const downloadCsvFile = (rows, filename) => {
    const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDeals = () => {
    const rows = [
      ['clientName', 'category', 'bucket', 'totalAmount', 'paidAmount', 'isFrozen'],
      ...dealLog.map((deal) => [
        deal.clientName || '',
        deal.category || 'משכנתאות',
        deal.bucket || 'חדש',
        Number(deal.totalAmount || 0),
        Number(deal.paidAmount || 0),
        deal.isFrozen ? 'true' : 'false',
      ]),
    ];

    downloadCsvFile(rows, 'deals-export.csv');
    toast.success('קובץ העסקאות יוצא לאקסל/CSV');
  };

  const handleDownloadDealsTemplate = () => {
    const rows = [
      ['clientName', 'category', 'bucket', 'totalAmount', 'paidAmount', 'isFrozen'],
      ['ישראל ישראלי', 'משכנתאות', 'חדש', '12000', '0', 'false'],
    ];

    downloadCsvFile(rows, 'deals-template.csv');
    toast.success('טמפלט העסקאות ירד');
  };

  const handleSetupNotion = async () => {
    setNotionSetupLoading(true);
    try {
      const res = await base44.functions.invoke('setupBusinessNotionDB', {});
      const data = res?.data || res;
      if (data?.database_id) {
        setNotionStatus('ok');
        toast.success(data.already_existed ? 'מסד הנתונים כבר קיים בנושן ✓' : 'מסד הנתונים נוצר בהצלחה בנושן!');
        // Trigger first sync
        await base44.functions.invoke('syncBusinessToNotion', {});
      } else {
        toast.error(data?.error || 'שגיאה ביצירת מסד הנתונים');
      }
    } catch (err) {
      toast.error('שגיאה בחיבור לנושן');
    } finally {
      setNotionSetupLoading(false);
    }
  };

  const handleManualSync = async () => {
    setNotionSyncLoading(true);
    try {
      const res = await base44.functions.invoke('syncBusinessToNotion', {});
      const data = res?.data || res;
      if (data?.success) {
        setNotionStatus('ok');
        toast.success(`סונכרן לנושן: ${data.created} חדשים, ${data.updated} עודכנו`);
      } else if (data?.error?.includes('not found')) {
        setNotionStatus('not_setup');
        toast.error('מסד הנתונים לא נמצא — יש להגדיר תחילה');
      } else {
        // Try anyway — might still work
        setNotionStatus('ok');
        toast.success('סונכרן לנושן');
      }
    } catch (err) {
      toast.error('שגיאה בסנכרון לנושן');
    } finally {
      setNotionSyncLoading(false);
    }
  };

  const handleImportDeals = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingDeals(true);

    try {
      const text = await file.text();
      const normalizedText = text.replace(/^\uFEFF/, '').trim();
      if (!normalizedText) {
        throw new Error('הקובץ ריק');
      }

      const lines = normalizedText.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('לא נמצאו שורות לייבוא');
      }

      const headers = parseCsvLine(lines[0]);
      const headerMap = Object.fromEntries(headers.map((header, index) => [header, index]));

      if (headerMap.clientName === undefined || headerMap.totalAmount === undefined) {
        throw new Error('הקובץ חייב לכלול לפחות עמודות clientName ו-totalAmount');
      }

      const importedDeals = lines.slice(1).map((line, index) => {
        const cols = parseCsvLine(line);
        const clientName = cols[headerMap.clientName] || '';
        const totalAmount = Number(String(cols[headerMap.totalAmount] || '').replace(/,/g, ''));
        const paidAmount = Number(String(cols[headerMap.paidAmount] || '0').replace(/,/g, '')) || 0;
        const category = cols[headerMap.category] || 'משכנתאות';
        const bucket = cols[headerMap.bucket] || 'חדש';
        const isFrozen = ['true', '1', 'yes', 'כן'].includes(String(cols[headerMap.isFrozen] || '').trim().toLowerCase());

        if (!clientName.trim() || !totalAmount) {
          return null;
        }

        const safePaidAmount = Math.min(totalAmount, Math.max(0, paidAmount));
        const remaining = Math.max(0, totalAmount - safePaidAmount);

        return {
          id: Date.now() + index,
          clientName: clientName.trim(),
          totalAmount,
          paidAmount: safePaidAmount,
          category: INCOME_CATEGORIES.includes(category) ? category : 'משכנתאות',
          bucket: remaining === 0 ? 'שולם מלא' : safePaidAmount > 0 ? 'שולם חלקית' : (DEAL_BUCKETS.includes(bucket) ? bucket : 'חדש'),
          isFrozen,
          createdAt: new Date().toISOString(),
        };
      }).filter(Boolean);

      if (!importedDeals.length) {
        throw new Error('לא נמצאו עסקאות תקינות לייבוא');
      }

      const next = [...dealLog, ...importedDeals];
      setDealLog(next);
      persist({ dealLog: next });
      toast.success(`יובאו ${importedDeals.length} עסקאות`);
    } catch (error) {
      console.error('Deal import failed:', error);
      toast.error(String(error?.message || error || 'שגיאה בייבוא העסקאות'));
    } finally {
      event.target.value = '';
      setImportingDeals(false);
    }
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
    () => dealLog.filter((deal) => !deal.isFrozen && Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0) > 0),
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
  const frozenDealsCount = useMemo(
    () => dealLog.filter((deal) => deal.isFrozen).length,
    [dealLog]
  );
  const paidDealsCount = useMemo(
    () => dealLog.filter((deal) => getDealStatus(deal) === 'שולם מלא').length,
    [dealLog]
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
      const key = getEntryMonthKey(e);
      if (!key) return;
      if (!map[key]) {
        const [y, m] = key.split('-').map(Number);
        const date = new Date(y, m - 1, 1);
        map[key] = {
          key,
          month: date.toLocaleString('he-IL', { month: 'short', year: '2-digit' }),
          net: 0,
          gross: 0,
        };
      }
      map[key].net += e.net || 0;
      map[key].gross += e.gross || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map((d) => ({ ...d, realNet: Math.max(0, d.net - totalMonthlyExpenses) }));
  }, [incomeLog, totalMonthlyExpenses]);

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
    const filtered = dealLog.filter((deal) => {
      const status = getDealStatus(deal);
      if (hidePaidDeals && status === 'שולם מלא') return false;
      const matchesBucket = dealBucketFilter === 'all' || deal.bucket === dealBucketFilter;
      const matchesCategory = dealCategoryFilter === 'all' || (deal.category || 'משכנתאות') === dealCategoryFilter;
      const matchesStatus = dealStatusFilter === 'all' || status === dealStatusFilter;
      const matchesSearch = !dealSearch.trim() || String(deal.clientName || '').toLowerCase().includes(dealSearch.trim().toLowerCase());

      return matchesBucket && matchesCategory && matchesStatus && matchesSearch;
    });

    if (dealSortBy === 'default') {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      if (dealSortBy === 'clientName') {
        aValue = String(a.clientName || '');
        bValue = String(b.clientName || '');
      } else if (dealSortBy === 'category') {
        aValue = String(a.category || 'משכנתאות');
        bValue = String(b.category || 'משכנתאות');
      } else if (dealSortBy === 'bucket') {
        aValue = String(a.bucket || '');
        bValue = String(b.bucket || '');
      } else if (dealSortBy === 'status') {
        aValue = getDealStatus(a);
        bValue = getDealStatus(b);
      }

      const comparison = aValue.localeCompare(bValue, 'he');
      return dealSortDirection === 'asc' ? comparison : comparison * -1;
    });

    return sorted;
  }, [dealBucketFilter, dealCategoryFilter, dealStatusFilter, dealSearch, dealLog, dealSortBy, dealSortDirection]);

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
      {/* === NOTION SYNC BANNER === */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">סנכרון נושן</span>
          {notionStatus === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              מחובר — מתעדכן אוטומטית
            </span>
          )}
          {notionStatus === 'not_setup' && (
            <span className="text-xs text-amber-600">לא מוגדר</span>
          )}
          {notionStatus === null && (
            <span className="text-xs text-muted-foreground">לא הוגדר עדיין</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notionStatus !== 'ok' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleSetupNotion}
              disabled={notionSetupLoading}
            >
              {notionSetupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {notionSetupLoading ? 'מגדיר...' : 'הגדר מסד נתונים בנושן'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleManualSync}
            disabled={notionSyncLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${notionSyncLoading ? 'animate-spin' : ''}`} />
            {notionSyncLoading ? 'מסנכרן...' : 'סנכרן עכשיו'}
          </Button>
        </div>
      </div>

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
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-1 bg-gradient-to-br from-blue-50/60 to-background dark:from-blue-950/10 dark:to-background">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>יעד ברוטו חודשי</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalGross)}</p>
          <p className="text-xs text-muted-foreground">
            {monthlyGrossTargetGap > 0 ? `חסר ליעד: ${fmt(monthlyGrossTargetGap)}` : `מעל היעד: ${fmt(monthlyGrossTargetOver)}`}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-1 bg-gradient-to-br from-emerald-50/60 to-background dark:from-emerald-950/10 dark:to-background">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>נטו החודש</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalNet)}</p>
          <p className="text-xs text-muted-foreground">מיסים החודש: {fmt(totalTax)}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-1 bg-gradient-to-br from-violet-50/60 to-background dark:from-violet-950/10 dark:to-background">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span>צנרת 2 חודשים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(pipelineForecast)}</p>
          <p className="text-xs text-muted-foreground">
            {Number(manualPipeline) > 0 ? 'הזנה ידנית' : dealLog.length > 0 ? `${openDeals.length} עסקאות פתוחות` : `${pipelineCount} תיקים אוטומטי`}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-1 bg-gradient-to-br from-orange-50/60 to-background dark:from-orange-950/10 dark:to-background">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>תיקים פעילים</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">
            {manualActiveCount !== '' ? 'הזנה ידנית' : 'אוטומטי'} · סף עומס: {HIGH_WORKLOAD_THRESHOLD}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-1 bg-gradient-to-br from-red-50/60 to-background dark:from-red-950/10 dark:to-background">
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
          <p className="text-xs text-muted-foreground">הכנסות כאן נספרות לחודש הנוכחי בלבד. הייטק מחושב ב־16% מס, שאר הקטגוריות ב־29%.</p>
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
          <Label>שייך לחודש</Label>
          <input type="month" value={newIncomeMonthKey} onChange={(e) => setNewIncomeMonthKey(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" dir="ltr" />
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDownloadDealsTemplate}>
              <Download className="w-4 h-4" />
              טמפלט אקסל
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Upload className="w-4 h-4" />
              {importingDeals ? 'מייבא...' : 'ייבוא אקסל/CSV'}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportDeals} disabled={importingDeals} />
            </label>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleExportDeals} disabled={dealLog.length === 0}>
              <Download className="w-4 h-4" />
              ייצוא אקסל
            </Button>
            <Button
              type="button"
              variant={hidePaidDeals ? 'secondary' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setHidePaidDeals((v) => !v)}
            >
              <CheckCircle2 className="w-4 h-4" />
              {hidePaidDeals ? `הצג שולם מלא (${paidDealsCount})` : 'הסתר שולם מלא'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/20">
            <p className="text-xs text-blue-700 dark:text-blue-300">עסקאות פתוחות</p>
            <p className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-100">{openDeals.length}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-xs text-violet-700 dark:text-violet-300">יתרה פתוחה</p>
            <p className="mt-1 text-xl font-bold text-violet-900 dark:text-violet-100">{fmt(openDealsTotal)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">מוקפאות</p>
            <p className="mt-1 text-xl font-bold text-amber-900 dark:text-amber-100">{frozenDealsCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">נסגרו מלא</p>
            <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-100">{paidDealsCount}</p>
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

        <div className="max-h-[540px] overflow-auto rounded-2xl border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-right font-medium">#</th>
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
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={dealSortBy === 'clientName' ? 'default' : 'outline'} onClick={() => { setDealSortBy('clientName'); setDealSortDirection('asc'); }}>
                          א-ב
                        </Button>
                        <Button type="button" size="sm" variant={dealSortBy === 'clientName' && dealSortDirection === 'desc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('clientName'); setDealSortDirection('desc'); }}>
                          ב-א
                        </Button>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={dealSortBy === 'category' && dealSortDirection === 'asc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('category'); setDealSortDirection('asc'); }}>
                          א-ב
                        </Button>
                        <Button type="button" size="sm" variant={dealSortBy === 'category' && dealSortDirection === 'desc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('category'); setDealSortDirection('desc'); }}>
                          ב-א
                        </Button>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={dealSortBy === 'bucket' && dealSortDirection === 'asc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('bucket'); setDealSortDirection('asc'); }}>
                          א-ב
                        </Button>
                        <Button type="button" size="sm" variant={dealSortBy === 'bucket' && dealSortDirection === 'desc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('bucket'); setDealSortDirection('desc'); }}>
                          ב-א
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">R/Y/G</th>
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
                        <option value="מוקפאת">מוקפאת</option>
                        <option value="ממתין לתשלום">ממתין לתשלום</option>
                        <option value="שולם חלקית">שולם חלקית</option>
                        <option value="שולם מלא">שולם מלא</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={dealSortBy === 'status' && dealSortDirection === 'asc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('status'); setDealSortDirection('asc'); }}>
                          א-ב
                        </Button>
                        <Button type="button" size="sm" variant={dealSortBy === 'status' && dealSortDirection === 'desc' ? 'default' : 'outline'} onClick={() => { setDealSortBy('status'); setDealSortDirection('desc'); }}>
                          ב-א
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="py-2 text-right font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-6 text-center text-muted-foreground">אין עסקאות להצגה</td>
                </tr>
              )}
              {filteredDeals.map((deal, index) => {
                const remaining = Math.max(0, Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0));
                const status = getDealStatus(deal);

                return (
                  <tr key={deal.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30">
                    <td className="py-3 text-xs text-muted-foreground">{index + 1}</td>
                    <td className="py-3 text-foreground">
                      {editingDealId === deal.id ? (
                        <Input value={editDealClient} onChange={(e) => setEditDealClient(e.target.value)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{deal.clientName}</span>
                          {deal.isFrozen && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                              <Power className="h-3 w-3" />
                              מוקפאת
                            </span>
                          )}
                        </div>
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
                        <select value={editDealRag} onChange={(e) => setEditDealRag(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          <option value="">—</option>
                          <option value="green">🟢 ירוק</option>
                          <option value="yellow">🟡 צהוב</option>
                          <option value="red">🔴 אדום</option>
                        </select>
                      ) : (
                        <span className="text-lg leading-none">
                          {deal.rag_status === 'green' ? '🟢' : deal.rag_status === 'yellow' ? '🟡' : deal.rag_status === 'red' ? '🔴' : '—'}
                        </span>
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
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${getDealStatusStyles(deal)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {editingDealId === deal.id ? (
                          <>
                            <Button size="sm" onClick={() => handleSaveDealEdit(deal.id)}>שמור</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEditDeal}>ביטול</Button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleDealFrozen(deal.id)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                deal.isFrozen
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {deal.isFrozen ? 'הפעל' : 'הקפא'}
                            </button>
                            <button type="button" onClick={() => handleStartEditDeal(deal)} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
                              <Pencil className="w-3.5 h-3.5" />
                              ערוך
                            </button>
                            <button type="button" onClick={() => handleRemoveDeal(deal.id)} className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                              הסר
                            </button>
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

      {/* === RAG SUMMARY === */}
      {dealLog.length > 0 && (() => {
        const ragGroups = { green: [], yellow: [], red: [], none: [] };
        dealLog.forEach((deal) => {
          const key = ['green','yellow','red'].includes(deal.rag_status) ? deal.rag_status : 'none';
          ragGroups[key].push(deal);
        });
        const ragConfig = [
          { key: 'green', emoji: '🟢', label: 'ירוק', count: ragGroups.green.length, amount: ragGroups.green.reduce((s,d) => s + Number(d.totalAmount||0), 0), color: '#22c55e', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300' },
          { key: 'yellow', emoji: '🟡', label: 'צהוב', count: ragGroups.yellow.length, amount: ragGroups.yellow.reduce((s,d) => s + Number(d.totalAmount||0), 0), color: '#eab308', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/25 dark:border-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300' },
          { key: 'red', emoji: '🔴', label: 'אדום', count: ragGroups.red.length, amount: ragGroups.red.reduce((s,d) => s + Number(d.totalAmount||0), 0), color: '#ef4444', bg: 'bg-red-50 border-red-200 dark:bg-red-950/25 dark:border-red-900/50', text: 'text-red-700 dark:text-red-300' },
        ];
        const total = ragGroups.green.length + ragGroups.yellow.length + ragGroups.red.length;
        const totalAmount = ragConfig.reduce((s, r) => s + r.amount, 0);
        if (total === 0) return null;
        return (
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-foreground">חלוקת סיכונים — R/Y/G</h3>
            {/* Bar chart */}
            <div className="space-y-2">
              {ragConfig.map((r) => {
                const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                return (
                  <div key={r.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.emoji} {r.label}</span>
                      <span className="text-muted-foreground text-xs">{r.count} עסקאות · {pct}%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {ragConfig.map((r) => (
                <div key={r.key} className={`rounded-xl border p-4 ${r.bg}`}>
                  <p className={`text-sm font-semibold ${r.text}`}>{r.emoji} {r.label}</p>
                  <p className={`text-xl font-bold mt-1 ${r.text}`}>{r.count}</p>
                  <p className={`text-xs mt-0.5 opacity-80 ${r.text}`}>{fmt(r.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* === INCOME TREND CHART === */}
      {monthlyChart.length > 0 && (() => {
        const trend = monthlyChart.length >= 2
          ? monthlyChart[monthlyChart.length - 1].realNet - monthlyChart[monthlyChart.length - 2].realNet
          : 0;
        const trendPct = monthlyChart.length >= 2 && monthlyChart[monthlyChart.length - 2].realNet > 0
          ? Math.round((trend / monthlyChart[monthlyChart.length - 2].realNet) * 100)
          : null;
        return (
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground">מגמת הכנסות — 6 חודשים אחרונים</h3>
              </div>
              {monthlyChart.length >= 2 && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                  {trend >= 0 ? '▲' : '▼'} {trendPct !== null ? `${trendPct}%` : fmt(Math.abs(trend))} מול חודש קודם
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyChart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} reversed />
                <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} orientation="right" />
                <Tooltip formatter={(v) => [fmt(v), 'נטו אחרי הוצאות']} />
                <ReferenceLine y={SALARY_TARGET} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'יעד', position: 'insideTopRight', fontSize: 11, fill: '#6366f1' }} />
                <Bar dataKey="realNet" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

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
                    <div className="grid md:grid-cols-4 gap-2">
                      <Input type="number" value={editIncomeValue} onChange={(e) => setEditIncomeValue(e.target.value)} placeholder="סכום גולמי" dir="ltr" />
                      <Input value={editIncomeSource} onChange={(e) => setEditIncomeSource(e.target.value)} placeholder="ממי / שם הלקוח" />
                      <select value={editIncomeCategory} onChange={(e) => setEditIncomeCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="month" value={editIncomeMonthKey} onChange={(e) => setEditIncomeMonthKey(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" dir="ltr" title="שייך לחודש" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Button size="sm" onClick={() => handleSaveIncomeEdit(entry.id)}>שמור</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEditIncome}>ביטול</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground text-sm">{fmt(entry.gross)}</span>
                        <span>גולמי</span>
                        {entry.category && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{entry.category}</span>
                        )}
                      </div>
                      {entry.source && entry.source !== 'לא צוין' && (
                        <div className="truncate text-sm font-medium text-primary">
                          {entry.source}
                        </div>
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
                  <th className="py-2 text-right font-medium">נטו (אחרי מס)</th>
                  <th className="py-2 text-right font-medium">נטו אחרי הוצאות</th>
                </tr>
              </thead>
              <tbody>
                {historicalMonths.map((month) => (
                  <tr key={month.key} className="border-b border-border last:border-b-0">
                    <td className="py-3 font-medium text-foreground">{month.month}</td>
                    <td className="py-3 text-muted-foreground">{month.deals}</td>
                    <td className="py-3 text-foreground">{fmt(month.gross)}</td>
                    <td className="py-3 text-red-600">{fmt(month.tax)}</td>
                    <td className="py-3 text-muted-foreground">{fmt(month.net)}</td>
                    <td className="py-3 text-emerald-600 font-semibold">{fmt(Math.max(0, month.net - totalMonthlyExpenses))}</td>
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