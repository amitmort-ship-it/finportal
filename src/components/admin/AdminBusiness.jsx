import { useEffect, useState, useMemo, useRef } from 'react';
import SimulationPanel from './SimulationPanel';
import AccountantAI from './AccountantAI';
import DealCard from './business/DealCard';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Droplets, TrendingUp, AlertTriangle, Wallet, Plus, CheckCircle2,
  Clock, Info, Trash2, Repeat, CreditCard, Power,
  Download, Upload, RefreshCw, Link2, Settings, BarChart2,
  Briefcase, StickyNote,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import {
  SALARY_TARGET, DEFAULT_MONTHLY_GROSS_TARGET, DEFAULT_TAX_BUFFER_RATE, DEFAULT_HITECH_TAX_RATE,
  ACTIVE_STAGES, PIPELINE_STAGES, INCOME_CATEGORIES, CATEGORY_COLORS, DEAL_BUCKETS,
} from '@/lib/business-config';
import {
  getCurrentMonthKey, getMonthLabelFromDate, getEntryMonthKey, getEntryMonthLabel,
  fmt, getTaxRateForCategory, getDealStatus, escapeCsvValue, parseCsvLine,
} from './business/businessUtils';
import { KpiCard, GaugeBar } from './business/BusinessMetricWidgets';

const HIGH_WORKLOAD_THRESHOLD = 5;
const DB_KEY = 'main';
const DEAL_LOG_STORAGE_KEY = 'admin_business_deal_log_v1';

const TABS = [
  { id: 'overview', label: 'סקירה', icon: BarChart2 },
  { id: 'income', label: 'הכנסות', icon: Wallet },
  { id: 'deals', label: 'עסקאות', icon: Briefcase },
  { id: 'expenses', label: 'הוצאות', icon: CreditCard },
  { id: 'notes', label: 'הערות', icon: StickyNote },
  { id: 'settings', label: 'הגדרות', icon: Settings },
];

export default function AdminBusiness() {
  const [activeTab, setActiveTab] = useState('overview');
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
  const [taxBufferRate, setTaxBufferRate] = useState(DEFAULT_TAX_BUFFER_RATE);
  const [hitechTaxRate, setHitechTaxRate] = useState(DEFAULT_HITECH_TAX_RATE);
  const [monthlyGrossTarget, setMonthlyGrossTarget] = useState(DEFAULT_MONTHLY_GROSS_TARGET);
  const [miluimDayValue, setMiluimDayValue] = useState(0);

  // Income input
  const [newIncome, setNewIncome] = useState('');
  const [newIncomeDays, setNewIncomeDays] = useState('');
  const [newIncomeSource, setNewIncomeSource] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState('משכנתאות');
  const [newIncomeMonthKey, setNewIncomeMonthKey] = useState(getCurrentMonthKey());
  const [selectedDealId, setSelectedDealId] = useState('');
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeValue, setEditIncomeValue] = useState('');
  const [editIncomeSource, setEditIncomeSource] = useState('');
  const [editIncomeCategory, setEditIncomeCategory] = useState('משכנתאות');
  const [editIncomeMonthKey, setEditIncomeMonthKey] = useState('');

  // Deal input
  const [newDealClient, setNewDealClient] = useState('');
  const [newDealTotal, setNewDealTotal] = useState('');
  const [newDealCategory, setNewDealCategory] = useState('משכנתאות');
  const [newDealBucket, setNewDealBucket] = useState(DEAL_BUCKETS[0]);
  const [dealSearch, setDealSearch] = useState('');
  const [dealStatusFilter, setDealStatusFilter] = useState('all');
  const [hidePaidDeals, setHidePaidDeals] = useState(true);
  const [importingDeals, setImportingDeals] = useState(false);
  const [dealMonthFilter, setDealMonthFilter] = useState('');

  // Expense input
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarAmount, setNewVarAmount] = useState('');
  const [newVarInstallments, setNewVarInstallments] = useState('1');

  // Notion
  const [notionSetupLoading, setNotionSetupLoading] = useState(false);
  const [notionSyncLoading, setNotionSyncLoading] = useState(false);
  const [notionStatus, setNotionStatus] = useState(null);

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
          const localDL = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          const resolvedDL = (Array.isArray(r.dealLog) && r.dealLog.length > 0) ? r.dealLog : (Array.isArray(localDL) ? localDL : []);
          setDealLog(resolvedDL);
          if (!(Array.isArray(r.dealLog) && r.dealLog.length > 0) && resolvedDL.length > 0) {
            base44.entities.BusinessData.update(r.id, { dealLog: resolvedDL }).catch(() => {});
          }
          setFixedExpenses(r.fixedExpenses || []);
          setVariableExpenses(r.variableExpenses || []);
          setAvgDealSize(r.avgDealSize ?? 8000);
          setManualPipeline(r.manualPipeline ?? 0);
          setAssetsValue(r.assetsValue ?? 0);
          setManualActiveCount(r.manualActiveCount ?? '');
          setFreeNotes(r.freeNotes ?? '');
          setTaxBufferRate(r.taxBufferRate ?? DEFAULT_TAX_BUFFER_RATE);
          setHitechTaxRate(r.hitechTaxRate ?? DEFAULT_HITECH_TAX_RATE);
          setMonthlyGrossTarget(r.monthlyGrossTarget ?? DEFAULT_MONTHLY_GROSS_TARGET);
          setMiluimDayValue(r.miluimDayValue ?? 0);
        } else {
          const localDL = JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]');
          setDealLog(Array.isArray(localDL) ? localDL : []);
        }
      } catch (err) {
        console.error(err);
        try { setDealLog(JSON.parse(localStorage.getItem(DEAL_LOG_STORAGE_KEY) || '[]')); } catch { setDealLog([]); }
      } finally {
        setDealLogHydrated(true);
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!dealLogHydrated) return;
    try { localStorage.setItem(DEAL_LOG_STORAGE_KEY, JSON.stringify(dealLog || [])); } catch {}
  }, [dealLog, dealLogHydrated]);

  const persist = (patch) => {
    const data = { incomeLog, dealLog, fixedExpenses, variableExpenses, avgDealSize, manualPipeline, assetsValue, manualActiveCount, freeNotes, taxBufferRate, hitechTaxRate, monthlyGrossTarget, miluimDayValue, ...patch };
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
      } catch { toast.error('שגיאה בשמירת הנתונים'); }
      finally { setSaving(false); }
    }, 600);
  };

  // === Income handlers ===
  const handleAddIncome = () => {
    const isMiluim = newIncomeCategory === 'מילואים';
    let amount;
    let miluimDays = null;
    if (isMiluim) {
      miluimDays = Number(String(newIncomeDays).replace(/,/g, ''));
      if (!miluimDays || miluimDays <= 0) return;
      amount = miluimDays * (Number(miluimDayValue) || 0);
      if (!amount || amount <= 0) { toast.error('הגדר תחילה שווי יום מילואים בהגדרות'); return; }
    } else {
      amount = Number(String(newIncome).replace(/,/g, ''));
      if (!amount || amount <= 0) return;
    }
    const taxRate = getTaxRateForCategory(newIncomeCategory, taxBufferRate, hitechTaxRate);
    const linkedDeal = (!isMiluim && selectedDealId) ? dealLog.find(d => String(d.id) === String(selectedDealId)) : null;
    const now = new Date();
    const targetMonthKey = newIncomeMonthKey || getCurrentMonthKey();
    const [mY, mM] = targetMonthKey.split('-').map(Number);
    const entry = {
      id: Date.now(), gross: amount, net: amount * (1 - taxRate), tax: amount * taxRate,
      source: isMiluim ? 'שירות מילואים' : (linkedDeal?.clientName || newIncomeSource.trim() || 'לא צוין'),
      category: linkedDeal?.category || newIncomeCategory,
      date: now.toLocaleDateString('he-IL'), month: getMonthLabelFromDate(new Date(mY, mM - 1, 1)),
      monthKey: targetMonthKey, createdAt: now.toISOString(), dealId: linkedDeal?.id || null,
      ...(miluimDays ? { miluimDays } : {}),
    };
    const nextIncome = [...incomeLog, entry];
    let nextDeals = dealLog;
    if (linkedDeal) {
      nextDeals = dealLog.map(d => {
        if (d.id !== linkedDeal.id) return d;
        const updated = Math.min(Number(d.totalAmount || 0), Number(d.paidAmount || 0) + amount);
        const rem = Math.max(0, Number(d.totalAmount || 0) - updated);
        return { ...d, paidAmount: updated, bucket: d.isFrozen ? d.bucket : rem === 0 ? 'שולם מלא' : updated > 0 ? 'שולם חלקית' : d.bucket, updatedAt: now.toISOString() };
      });
    }
    setIncomeLog(nextIncome);
    if (linkedDeal) setDealLog(nextDeals);
    persist({ incomeLog: nextIncome, dealLog: nextDeals });
    setNewIncome(''); setNewIncomeSource(''); setNewIncomeCategory('משכנתאות'); setNewIncomeDays('');
    setNewIncomeMonthKey(getCurrentMonthKey()); setSelectedDealId('');
    toast.success(`הכנסה של ${fmt(amount)} נרשמה${isMiluim ? ` (${miluimDays} ימים)` : ''}`);
  };

  const handleRemoveIncome = (id) => {
    const cur = incomeLog.find(e => e.id === id);
    const next = incomeLog.filter(e => e.id !== id);
    let nextDeals = dealLog;
    if (cur?.dealId) {
      nextDeals = dealLog.map(d => {
        if (d.id !== cur.dealId) return d;
        const nextPaid = Math.max(0, Number(d.paidAmount || 0) - Number(cur.gross || 0));
        return { ...d, paidAmount: nextPaid, bucket: d.isFrozen ? d.bucket : nextPaid === 0 ? 'ממתין לתשלום' : 'שולם חלקית', updatedAt: new Date().toISOString() };
      });
      setDealLog(nextDeals);
    }
    setIncomeLog(next);
    persist({ incomeLog: next, dealLog: nextDeals });
  };

  const handleSaveIncomeEdit = (id) => {
    const amount = Number(String(editIncomeValue).replace(/,/g, ''));
    if (!amount || amount <= 0) return;
    const cur = incomeLog.find(e => e.id === id);
    const taxRate = getTaxRateForCategory(editIncomeCategory, taxBufferRate, hitechTaxRate);
    const targetMonthKey = editIncomeMonthKey || getCurrentMonthKey();
    const [mY, mM] = targetMonthKey.split('-').map(Number);
    const next = incomeLog.map(e => e.id === id ? { ...e, gross: amount, net: amount * (1 - taxRate), tax: amount * taxRate, source: editIncomeSource.trim() || 'לא צוין', category: editIncomeCategory, monthKey: targetMonthKey, month: getMonthLabelFromDate(new Date(mY, mM - 1, 1)) } : e);
    let nextDeals = dealLog;
    if (cur?.dealId) {
      const delta = amount - Number(cur.gross || 0);
      nextDeals = dealLog.map(d => {
        if (d.id !== cur.dealId) return d;
        const np = Math.min(Number(d.totalAmount || 0), Math.max(0, Number(d.paidAmount || 0) + delta));
        const rem = Math.max(0, Number(d.totalAmount || 0) - np);
        return { ...d, paidAmount: np, bucket: d.isFrozen ? d.bucket : rem === 0 ? 'שולם מלא' : np > 0 ? 'שולם חלקית' : 'ממתין לתשלום', updatedAt: new Date().toISOString() };
      });
      setDealLog(nextDeals);
    }
    setIncomeLog(next);
    persist({ incomeLog: next, dealLog: nextDeals });
    setEditingIncomeId(null);
    toast.success('עודכן');
  };

  // === Deal handlers ===
  const handleAddDeal = () => {
    const totalAmount = Number(String(newDealTotal).replace(/,/g, ''));
    if (!newDealClient.trim() || !totalAmount) return;
    const next = [...dealLog, { id: Date.now(), clientName: newDealClient.trim(), totalAmount, paidAmount: 0, category: newDealCategory, bucket: newDealBucket, isFrozen: false, createdAt: new Date().toISOString() }];
    setDealLog(next); persist({ dealLog: next });
    setNewDealClient(''); setNewDealTotal(''); setNewDealCategory('משכנתאות'); setNewDealBucket(DEAL_BUCKETS[0]);
    toast.success('העסקה נוספה');
  };

  const handleEditDeal = (id, updates) => {
    const total = updates.totalAmount, paid = updates.paidAmount;
    const rem = Math.max(0, total - paid);
    const next = dealLog.map(d => d.id === id ? {
      ...d, ...updates,
      bucket: d.isFrozen ? (updates.bucket || d.bucket) : rem === 0 ? 'שולם מלא' : paid > 0 ? 'שולם חלקית' : (updates.bucket || d.bucket),
      updatedAt: new Date().toISOString(),
    } : d);
    setDealLog(next); persist({ dealLog: next }); toast.success('העסקה עודכנה');
  };

  const handleRemoveDeal = (id) => {
    const next = dealLog.filter(d => d.id !== id);
    setDealLog(next); persist({ dealLog: next });
  };

  const handleToggleFrozen = (id) => {
    const next = dealLog.map(d => d.id === id ? { ...d, isFrozen: !d.isFrozen, updatedAt: new Date().toISOString() } : d);
    setDealLog(next); persist({ dealLog: next });
  };

  // === Expense handlers ===
  const handleAddFixed = () => {
    const amount = Number(String(newFixedAmount).replace(/,/g, ''));
    if (!newFixedName.trim() || !amount) return;
    const next = [...fixedExpenses, { id: Date.now(), name: newFixedName.trim(), amount, enabled: true }];
    setFixedExpenses(next); persist({ fixedExpenses: next });
    setNewFixedName(''); setNewFixedAmount('');
  };
  const handleRemoveFixed = (id) => { const n = fixedExpenses.filter(e => e.id !== id); setFixedExpenses(n); persist({ fixedExpenses: n }); };
  const handleToggleFixed = (id) => { const n = fixedExpenses.map(e => e.id === id ? { ...e, enabled: e.enabled === false } : e); setFixedExpenses(n); persist({ fixedExpenses: n }); };

  const handleAddVariable = () => {
    const amount = Number(String(newVarAmount).replace(/,/g, ''));
    const installments = Math.max(1, Number(newVarInstallments) || 1);
    if (!newVarName.trim() || !amount) return;
    const entry = { id: Date.now(), name: newVarName.trim(), totalAmount: amount, installments, installmentAmount: Math.round(amount / installments), paidInstallments: 0, startDate: new Date().toLocaleDateString('he-IL') };
    const next = [...variableExpenses, entry];
    setVariableExpenses(next); persist({ variableExpenses: next });
    setNewVarName(''); setNewVarAmount(''); setNewVarInstallments('1');
    toast.success(`הוצאה נוספה — ${installments} × ${fmt(entry.installmentAmount)}`);
  };
  const handlePayInstallment = (id) => { const n = variableExpenses.map(e => e.id === id ? { ...e, paidInstallments: Math.min(e.paidInstallments + 1, e.installments) } : e); setVariableExpenses(n); persist({ variableExpenses: n }); };
  const handleRemoveVariable = (id) => { const n = variableExpenses.filter(e => e.id !== id); setVariableExpenses(n); persist({ variableExpenses: n }); };

  // === CSV ===
  const downloadCsvFile = (rows, filename) => {
    const csv = rows.map(r => r.map(escapeCsvValue).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const handleExportDeals = () => {
    downloadCsvFile([['clientName', 'category', 'bucket', 'totalAmount', 'paidAmount', 'isFrozen'], ...dealLog.map(d => [d.clientName || '', d.category || 'משכנתאות', d.bucket || 'חדש', Number(d.totalAmount || 0), Number(d.paidAmount || 0), d.isFrozen ? 'true' : 'false'])], 'deals-export.csv');
    toast.success('יוצא');
  };
  const handleDownloadDealsTemplate = () => { downloadCsvFile([['clientName', 'category', 'bucket', 'totalAmount', 'paidAmount', 'isFrozen'], ['ישראל ישראלי', 'משכנתאות', 'חדש', '12000', '0', 'false']], 'deals-template.csv'); };
  const handleImportDeals = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingDeals(true);
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '').trim();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('אין שורות');
      const headers = parseCsvLine(lines[0]);
      const hm = Object.fromEntries(headers.map((h, i) => [h, i]));
      if (hm.clientName === undefined || hm.totalAmount === undefined) throw new Error('עמודות חסרות');
      const imported = lines.slice(1).map((line, idx) => {
        const cols = parseCsvLine(line);
        const clientName = cols[hm.clientName] || ''; const totalAmount = Number(String(cols[hm.totalAmount] || '').replace(/,/g, ''));
        if (!clientName.trim() || !totalAmount) return null;
        const paidAmount = Math.min(totalAmount, Math.max(0, Number(String(cols[hm.paidAmount] || '0').replace(/,/g, '')) || 0));
        const rem = Math.max(0, totalAmount - paidAmount);
        return { id: Date.now() + idx, clientName: clientName.trim(), totalAmount, paidAmount, category: INCOME_CATEGORIES.includes(cols[hm.category]) ? cols[hm.category] : 'משכנתאות', bucket: rem === 0 ? 'שולם מלא' : paidAmount > 0 ? 'שולם חלקית' : (DEAL_BUCKETS.includes(cols[hm.bucket]) ? cols[hm.bucket] : 'חדש'), isFrozen: ['true','1','yes','כן'].includes(String(cols[hm.isFrozen] || '').toLowerCase()), createdAt: new Date().toISOString() };
      }).filter(Boolean);
      if (!imported.length) throw new Error('אין עסקאות תקינות');
      const next = [...dealLog, ...imported]; setDealLog(next); persist({ dealLog: next });
      toast.success(`יובאו ${imported.length} עסקאות`);
    } catch (e) { toast.error(String(e?.message || 'שגיאה')); }
    finally { event.target.value = ''; setImportingDeals(false); }
  };

  // === Notion ===
  const handleSetupNotion = async () => {
    setNotionSetupLoading(true);
    try {
      const data = (await base44.functions.invoke('setupBusinessNotionDB', {}))?.data;
      if (data?.database_id) { setNotionStatus('ok'); toast.success(data.already_existed ? 'כבר קיים ✓' : 'נוצר!'); await base44.functions.invoke('syncBusinessToNotion', {}); }
      else toast.error(data?.error || 'שגיאה');
    } catch { toast.error('שגיאה'); } finally { setNotionSetupLoading(false); }
  };
  const handleManualSync = async () => {
    setNotionSyncLoading(true);
    try {
      const data = (await base44.functions.invoke('syncBusinessToNotion', {}))?.data;
      if (data?.error?.includes('not found')) { setNotionStatus('not_setup'); toast.error('מסד לא נמצא'); }
      else { setNotionStatus('ok'); toast.success(`סונכרן: ${data?.created || 0} חדשים`); }
    } catch { toast.error('שגיאה'); } finally { setNotionSyncLoading(false); }
  };

  // === Derived ===
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const currentMonthLabel = useMemo(() => getMonthLabelFromDate(new Date()), []);
  const currentMonthIncomeLog = useMemo(() => incomeLog.filter(e => getEntryMonthKey(e) === currentMonthKey || e?.month === currentMonthLabel), [incomeLog, currentMonthKey, currentMonthLabel]);
  const historicalIncomeLog = useMemo(() => incomeLog.filter(e => !(getEntryMonthKey(e) === currentMonthKey || e?.month === currentMonthLabel)), [incomeLog, currentMonthKey, currentMonthLabel]);
  const totalGross = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.gross, 0), [currentMonthIncomeLog]);
  const totalNet = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.net, 0), [currentMonthIncomeLog]);
  const totalTax = useMemo(() => currentMonthIncomeLog.reduce((s, e) => s + e.tax, 0), [currentMonthIncomeLog]);
  const monthlyFixedTotal = useMemo(() => fixedExpenses.filter(e => e.enabled !== false).reduce((s, e) => s + e.amount, 0), [fixedExpenses]);
  const activeVariableMonthly = useMemo(() => variableExpenses.filter(e => e.paidInstallments < e.installments).reduce((s, e) => s + e.installmentAmount, 0), [variableExpenses]);
  const totalMonthlyExpenses = monthlyFixedTotal + activeVariableMonthly;
  const monthlyGrossTargetGap = Math.max(0, monthlyGrossTarget - totalGross);
  const monthlyGrossTargetOver = Math.max(0, totalGross - monthlyGrossTarget);
  const openDeals = useMemo(() => dealLog.filter(d => !d.isFrozen && Number(d.totalAmount || 0) - Number(d.paidAmount || 0) > 0), [dealLog]);
  const openDealsOptions = useMemo(() => openDeals.map(d => ({ id: d.id, label: `${d.clientName} · יתרה ${fmt(Number(d.totalAmount || 0) - Number(d.paidAmount || 0))}` })), [openDeals]);
  const openDealsTotal = useMemo(() => openDeals.reduce((s, d) => s + Math.max(0, Number(d.totalAmount || 0) - Number(d.paidAmount || 0)), 0), [openDeals]);
  const frozenDealsCount = useMemo(() => dealLog.filter(d => d.isFrozen).length, [dealLog]);
  const paidDealsCount = useMemo(() => dealLog.filter(d => getDealStatus(d) === 'שולם מלא').length, [dealLog]);
  const activeCount = useMemo(() => {
    if (manualActiveCount !== '' && Number(manualActiveCount) >= 0) return Number(manualActiveCount);
    return new Set(stages.filter(s => ACTIVE_STAGES.includes(s.current_stage)).map(s => s.client_email)).size;
  }, [stages, manualActiveCount]);
  const pipelineCount = useMemo(() => stages.filter(s => PIPELINE_STAGES.includes(s.current_stage)).length, [stages]);
  const pipelineForecast = Number(manualPipeline) > 0 ? Number(manualPipeline) : dealLog.length > 0 ? openDealsTotal : pipelineCount * (avgDealSize || 8000);
  const categoryTotals = useMemo(() => { const m = {}; INCOME_CATEGORIES.forEach(c => { m[c] = 0; }); currentMonthIncomeLog.forEach(e => { m[e.category || 'אחר'] = (m[e.category || 'אחר'] || 0) + e.net; }); return m; }, [currentMonthIncomeLog]);
  const monthlyChart = useMemo(() => {
    const m = {};
    incomeLog.forEach(e => {
      const k = getEntryMonthKey(e); if (!k) return;
      if (!m[k]) { const [y, mo] = k.split('-').map(Number); m[k] = { key: k, month: new Date(y, mo - 1, 1).toLocaleString('he-IL', { month: 'short', year: '2-digit' }), net: 0, gross: 0 }; INCOME_CATEGORIES.forEach(c => { m[k][`cat_${c}`] = 0; }); }
      m[k].net += e.net || 0; m[k].gross += e.gross || 0;
      const cat = INCOME_CATEGORIES.includes(e.category) ? e.category : 'אחר';
      m[k][`cat_${cat}`] = (m[k][`cat_${cat}`] || 0) + (e.net || 0);
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-6).map(d => ({ ...d, realNet: Math.max(0, d.net - totalMonthlyExpenses) }));
  }, [incomeLog, totalMonthlyExpenses]);
  const historicalMonths = useMemo(() => {
    const g = historicalIncomeLog.reduce((acc, e) => {
      const k = getEntryMonthKey(e) || getEntryMonthLabel(e);
      if (!acc[k]) acc[k] = { key: k, month: getEntryMonthLabel(e), gross: 0, net: 0, tax: 0, deals: 0 };
      acc[k].gross += e.gross || 0; acc[k].net += e.net || 0; acc[k].tax += e.tax || 0; acc[k].deals++;
      return acc;
    }, {});
    return Object.values(g).sort((a, b) => String(b.key).localeCompare(String(a.key), 'he'));
  }, [historicalIncomeLog]);
  const dealMonthKey = (d) => {
    if (!d?.createdAt) return null;
    const p = new Date(d.createdAt);
    if (Number.isNaN(p.getTime())) return null;
    return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
  };
  const availableDealMonths = useMemo(() => {
    const map = {};
    dealLog.forEach(d => {
      const k = dealMonthKey(d);
      if (!k) return;
      if (!map[k]) { const [y, m] = k.split('-').map(Number); map[k] = { key: k, label: new Date(y, m - 1, 1).toLocaleString('he-IL', { month: 'long', year: 'numeric' }), count: 0, total: 0 }; }
      map[k].count++; map[k].total += Number(d.totalAmount || 0);
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [dealLog]);
  const filteredDeals = useMemo(() => dealLog.filter(d => {
    const status = getDealStatus(d);
    if (hidePaidDeals && status === 'שולם מלא') return false;
    if (dealStatusFilter !== 'all' && status !== dealStatusFilter) return false;
    if (dealMonthFilter && dealMonthKey(d) !== dealMonthFilter) return false;
    if (dealSearch.trim() && !String(d.clientName || '').toLowerCase().includes(dealSearch.trim().toLowerCase())) return false;
    return true;
  }).sort((a, b) => String(a.clientName || '').localeCompare(String(b.clientName || ''), 'he')), [dealLog, hidePaidDeals, dealStatusFilter, dealMonthFilter, dealSearch]);
  const filteredDealsMonthSummary = useMemo(() => {
    const count = filteredDeals.length;
    const total = filteredDeals.reduce((s, d) => s + Number(d.totalAmount || 0), 0);
    const paid = filteredDeals.reduce((s, d) => s + Number(d.paidAmount || 0), 0);
    return { count, total, paid };
  }, [filteredDeals]);

  const isHighWorkload = activeCount >= HIGH_WORKLOAD_THRESHOLD;
  const targetPct = Math.min(100, monthlyGrossTarget > 0 ? Math.round((totalGross / monthlyGrossTarget) * 100) : 0);

  const selectCls = "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Saving indicator */}
      {saving && <div className="text-xs text-muted-foreground text-center animate-pulse">שומר...</div>}

      {/* High workload alert */}
      {isHighWorkload && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-900/50 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">עומס גבוה — {activeCount} תיקים פעילים. מומלץ לתעדף.</p>
        </div>
      )}

      {/* ===== KPI SUMMARY ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />} label="ברוטו החודש" value={fmt(totalGross)} sub={monthlyGrossTargetGap > 0 ? `חסר: ${fmt(monthlyGrossTargetGap)}` : `✓ מעל יעד ב-${fmt(monthlyGrossTargetOver)}`} gradient="bg-gradient-to-br from-blue-50/60 to-background dark:from-blue-950/10 dark:to-background" />
        <KpiCard icon={<Wallet className="w-3.5 h-3.5 text-emerald-500" />} label="נטו החודש" value={fmt(totalNet)} sub={`מס: ${fmt(totalTax)}`} gradient="bg-gradient-to-br from-emerald-50/60 to-background dark:from-emerald-950/10 dark:to-background" />
        <KpiCard icon={<TrendingUp className="w-3.5 h-3.5 text-violet-500" />} label="צנרת" value={fmt(pipelineForecast)} sub={`${openDeals.length} עסקאות פתוחות`} gradient="bg-gradient-to-br from-violet-50/60 to-background dark:from-violet-950/10 dark:to-background" />
        <KpiCard icon={<Clock className="w-3.5 h-3.5 text-orange-500" />} label="תיקים פעילים" value={activeCount} sub={manualActiveCount !== '' ? 'ידני' : 'אוטומטי'} gradient="bg-gradient-to-br from-orange-50/60 to-background dark:from-orange-950/10 dark:to-background" />
        <KpiCard icon={<CreditCard className="w-3.5 h-3.5 text-red-500" />} label="הוצאות חודשי" value={fmt(totalMonthlyExpenses)} sub={`קבועות ${fmt(monthlyFixedTotal)}`} gradient="bg-gradient-to-br from-red-50/60 to-background dark:from-red-950/10 dark:to-background" />
      </div>

      {/* Monthly target progress bar */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-semibold text-foreground">יעד ברוטו חודשי — {fmt(monthlyGrossTarget)}</span>
          <span className={`font-bold text-sm ${targetPct >= 100 ? 'text-emerald-600' : targetPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{targetPct}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${targetPct >= 100 ? 'bg-emerald-500' : targetPct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${targetPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{fmt(totalGross)}</span>
          <span>{fmt(monthlyGrossTarget)}</span>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-border bg-muted/20 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Chart */}
              {monthlyChart.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />מגמת הכנסות — 6 חודשים</h3>
                    {monthlyChart.length >= 2 && (() => {
                      const trend = monthlyChart[monthlyChart.length - 1].realNet - monthlyChart[monthlyChart.length - 2].realNet;
                      const trendPct = monthlyChart[monthlyChart.length - 2].realNet > 0 ? Math.round((trend / monthlyChart[monthlyChart.length - 2].realNet) * 100) : null;
                      return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{trend >= 0 ? '▲' : '▼'} {trendPct !== null ? `${trendPct}%` : fmt(Math.abs(trend))}</span>;
                    })()}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyChart} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} reversed />
                      <YAxis tickFormatter={v => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={44} orientation="right" />
                      <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 11 }} />
                      <ReferenceLine y={SALARY_TARGET} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'יעד', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {INCOME_CATEGORIES.map((cat, i) => (
                        <Bar key={cat} dataKey={`cat_${cat}`} name={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#64748b'} maxBarSize={56} radius={i === INCOME_CATEGORIES.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gauges */}
              <div className="space-y-4">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><Info className="w-4 h-4 text-primary" />מדדים</h3>
                <GaugeBar value={totalGross} max={monthlyGrossTarget} color="bg-blue-500" label="התקדמות ליעד ברוטו" valueLabel={fmt(totalGross)} sublabel={`יעד: ${fmt(monthlyGrossTarget)}`} />
                <GaugeBar value={pipelineForecast} max={SALARY_TARGET * 3} color="bg-violet-500" label="צנרת" valueLabel={fmt(pipelineForecast)} sublabel={`יעד: ${fmt(SALARY_TARGET)}`} />
                <GaugeBar value={Number(assetsValue) || 0} max={500000} color="bg-emerald-500" label="נכסים מניבים" valueLabel={fmt(Number(assetsValue) || 0)} sublabel="הזנה ידנית" />
              </div>

              {/* Category breakdown */}
              {currentMonthIncomeLog.length > 0 && (
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-3">פילוח נטו לפי קטגוריה</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {INCOME_CATEGORIES.map(cat => {
                      const val = categoryTotals[cat] || 0;
                      const pct = totalNet > 0 ? Math.round((val / totalNet) * 100) : 0;
                      const cls = { 'משכנתאות': 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300', 'כ.ד': 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300', 'הייטק': 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/25 dark:border-violet-900/50 dark:text-violet-300', 'מילואים': 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/25 dark:border-cyan-900/50 dark:text-cyan-300', 'אחר': 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/70 dark:border-slate-800 dark:text-slate-300' };
                      return <div key={cat} className={`rounded-xl border p-3 ${cls[cat] || cls['אחר']}`}><p className="text-xs font-semibold">{cat}</p><p className="text-lg font-bold mt-0.5">{fmt(val)}</p><p className="text-xs opacity-70">{pct}%</p></div>;
                    })}
                  </div>
                </div>
              )}

              {/* What to do */}
              <div>
                <h3 className="font-bold text-foreground text-sm mb-3">מה לעשות עכשיו?</h3>
                <div className="space-y-2 text-sm">
                  {totalGross < monthlyGrossTarget * 0.5 && <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/25 p-3 text-red-700 dark:text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>עדיין רחוק מהיעד — לתעדף סגירות.</span></div>}
                  {totalGross >= monthlyGrossTarget * 0.5 && totalGross < monthlyGrossTarget && <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/25 p-3 text-amber-700 dark:text-amber-300"><Info className="w-4 h-4 mt-0.5 shrink-0" /><span>מתקרב ליעד — להמשיך על הצנרת.</span></div>}
                  {totalGross >= monthlyGrossTarget && <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/25 p-3 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>יעד הושג ✓ — להתמקד בצמיחה.</span></div>}
                  {pipelineCount > 0 && <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/25 p-3 text-blue-700 dark:text-blue-300"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0" /><span>{pipelineCount} תיקים בשלב סגירה — לדחוף לסיום.</span></div>}
                </div>
              </div>

              {/* AI */}
              <AccountantAI incomeLog={incomeLog} fixedExpenses={fixedExpenses} variableExpenses={variableExpenses} taxBufferRate={taxBufferRate} hitechTaxRate={hitechTaxRate} totalMonthlyExpenses={totalMonthlyExpenses} />

              {/* Simulation */}
              <SimulationPanel fixedExpenses={fixedExpenses} monthlyFixedTotal={monthlyFixedTotal} variableExpenses={variableExpenses} activeVariableMonthly={activeVariableMonthly} taxBufferRate={taxBufferRate} hitechTaxRate={hitechTaxRate} />
            </div>
          )}

          {/* ===== INCOME TAB ===== */}
          {activeTab === 'income' && (
            <div className="space-y-5">
              {/* Add income form */}
              <div className="bg-muted/20 rounded-xl p-4 space-y-3 border border-border">
                <h3 className="font-bold text-foreground text-sm">קליטת הכנסה</h3>
                <p className="text-xs text-muted-foreground">הייטק: {Math.round(hitechTaxRate * 100)}% מס · שאר: {Math.round(taxBufferRate * 100)}% · מילואים: פטור ממס ומע"ם</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newIncomeCategory === 'מילואים' ? (
                    <>
                      <div><Label className="text-xs mb-1">מספר ימי מילואים</Label><Input type="number" value={newIncomeDays} onChange={e => setNewIncomeDays(e.target.value)} placeholder="5" dir="ltr" className="mt-1" min="0" /></div>
                      <div><Label className="text-xs mb-1">חישוב אוטומטי</Label><div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-foreground mt-1">{newIncomeDays && miluimDayValue ? `${newIncomeDays} × ${fmt(miluimDayValue)} = ${fmt(Number(newIncomeDays) * miluimDayValue)}` : miluimDayValue ? `שווי יום: ${fmt(miluimDayValue)}` : 'הגדר שווי יום בהגדרות'}</div></div>
                    </>
                  ) : (
                    <>
                      <div><Label className="text-xs mb-1">סכום גולמי (₪)</Label><Input type="number" value={newIncome} onChange={e => setNewIncome(e.target.value)} placeholder="15000" dir="ltr" className="mt-1" /></div>
                      <div><Label className="text-xs mb-1">שם הלקוח / מקור</Label><Input value={newIncomeSource} onChange={e => setNewIncomeSource(e.target.value)} placeholder="ישראל ישראלי" className="mt-1" /></div>
                      <div><Label className="text-xs mb-1">שייך לעסקה</Label><select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)} className={`${selectCls} mt-1`}><option value="">ללא קישור</option>{openDealsOptions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
                    </>
                  )}
                  <div><Label className="text-xs mb-1">קטגוריה</Label><select value={newIncomeCategory} onChange={e => setNewIncomeCategory(e.target.value)} className={`${selectCls} mt-1`}>{INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div className="sm:col-span-2"><Label className="text-xs mb-1">חודש</Label><input type="month" value={newIncomeMonthKey} onChange={e => setNewIncomeMonthKey(e.target.value)} className={`${selectCls} mt-1`} dir="ltr" /></div>
                </div>
                <Button className="w-full gap-2" onClick={handleAddIncome} disabled={newIncomeCategory === 'מילואים' ? !newIncomeDays : !newIncome}><Plus className="w-4 h-4" />הוסף הכנסה</Button>
              </div>

              {/* Current month log */}
              {currentMonthIncomeLog.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground text-sm">החודש הנוכחי</h3>
                    <span className="text-xs text-muted-foreground">{currentMonthLabel} · {fmt(totalGross)} גולמי</span>
                  </div>
                  <div className="space-y-2">
                    {[...currentMonthIncomeLog].reverse().map(entry => (
                      <div key={entry.id} className="rounded-xl border border-border bg-card p-3">
                        {editingIncomeId === entry.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="number" value={editIncomeValue} onChange={e => setEditIncomeValue(e.target.value)} placeholder="סכום" dir="ltr" />
                              <Input value={editIncomeSource} onChange={e => setEditIncomeSource(e.target.value)} placeholder="מקור" />
                              <select value={editIncomeCategory} onChange={e => setEditIncomeCategory(e.target.value)} className={selectCls}>{INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                              <input type="month" value={editIncomeMonthKey} onChange={e => setEditIncomeMonthKey(e.target.value)} className={selectCls} dir="ltr" />
                            </div>
                            <div className="flex gap-2"><Button size="sm" onClick={() => handleSaveIncomeEdit(entry.id)}>שמור</Button><Button size="sm" variant="outline" onClick={() => setEditingIncomeId(null)}>ביטול</Button></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground">{fmt(entry.gross)}</span>
                                <span className="text-xs rounded-full bg-muted px-2 py-0.5">{entry.category}</span>
                                {entry.miluimDays && <span className="text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5">{entry.miluimDays} ימים</span>}
                              </div>
                              {entry.source && entry.source !== 'לא צוין' && <p className="text-sm text-primary mt-0.5">{entry.source}</p>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="text-emerald-600 font-medium">נטו {fmt(entry.net)}</span>
                              <span className="text-red-500">מס {fmt(entry.tax)}</span>
                              <button onClick={() => { setEditingIncomeId(entry.id); setEditIncomeValue(String(entry.gross)); setEditIncomeSource(entry.source === 'לא צוין' ? '' : entry.source || ''); setEditIncomeCategory(entry.category || 'משכנתאות'); setEditIncomeMonthKey(entry.monthKey || getCurrentMonthKey()); }} className="text-primary hover:underline">ערוך</button>
                              <button onClick={() => handleRemoveIncome(entry.id)} className="text-destructive hover:underline">הסר</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {historicalMonths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-3">היסטוריה</h3>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="bg-muted/40"><tr className="border-b border-border"><th className="py-2 px-3 text-right font-medium text-muted-foreground">חודש</th><th className="py-2 px-3 text-right font-medium text-muted-foreground">עסקאות</th><th className="py-2 px-3 text-right font-medium text-muted-foreground">גולמי</th><th className="py-2 px-3 text-right font-medium text-muted-foreground">מס</th><th className="py-2 px-3 text-right font-medium text-muted-foreground">נטו אחרי הוצאות</th></tr></thead>
                      <tbody>
                        {historicalMonths.map(m => (
                          <tr key={m.key} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-medium text-foreground">{m.month}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{m.deals}</td>
                            <td className="py-2.5 px-3">{fmt(m.gross)}</td>
                            <td className="py-2.5 px-3 text-red-600">{fmt(m.tax)}</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-semibold">{fmt(Math.max(0, m.net - totalMonthlyExpenses))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== DEALS TAB ===== */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20 px-3 py-2.5"><p className="text-xs text-blue-700 dark:text-blue-300">פתוחות</p><p className="text-xl font-bold text-blue-900 dark:text-blue-100">{openDeals.length}</p></div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 dark:border-violet-900/40 dark:bg-violet-950/20 px-3 py-2.5"><p className="text-xs text-violet-700 dark:text-violet-300">יתרה</p><p className="text-xl font-bold text-violet-900 dark:text-violet-100">{fmt(openDealsTotal)}</p></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2.5"><p className="text-xs text-amber-700 dark:text-amber-300">מוקפאות</p><p className="text-xl font-bold text-amber-900 dark:text-amber-100">{frozenDealsCount}</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-3 py-2.5"><p className="text-xs text-emerald-700 dark:text-emerald-300">נסגרו</p><p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{paidDealsCount}</p></div>
              </div>

              {/* Add deal form */}
              <div className="bg-muted/20 rounded-xl p-4 space-y-3 border border-border">
                <h3 className="font-bold text-foreground text-sm">הוספת עסקה</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 sm:col-span-1"><Input value={newDealClient} onChange={e => setNewDealClient(e.target.value)} placeholder="שם הלקוח" /></div>
                  <div><Input type="number" value={newDealTotal} onChange={e => setNewDealTotal(e.target.value)} placeholder="סכום ₪" dir="ltr" /></div>
                  <div><select value={newDealCategory} onChange={e => setNewDealCategory(e.target.value)} className={selectCls}>{INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><select value={newDealBucket} onChange={e => setNewDealBucket(e.target.value)} className={selectCls}>{DEAL_BUCKETS.slice(0, 3).map(b => <option key={b}>{b}</option>)}</select></div>
                </div>
                <Button onClick={handleAddDeal} disabled={!newDealClient || !newDealTotal} className="w-full gap-2"><Plus className="w-4 h-4" />הוסף עסקה</Button>
              </div>

              {/* Filters + CSV */}
              <div className="flex flex-wrap items-center gap-2">
                <Input value={dealSearch} onChange={e => setDealSearch(e.target.value)} placeholder="חיפוש לקוח..." className="flex-1 min-w-[160px]" />
                <select value={dealMonthFilter} onChange={e => setDealMonthFilter(e.target.value)} className={`${selectCls} w-auto`}>
                  <option value="">כל החודשים</option>
                  {availableDealMonths.map(m => <option key={m.key} value={m.key}>{m.label} ({m.count})</option>)}
                </select>
                <select value={dealStatusFilter} onChange={e => setDealStatusFilter(e.target.value)} className={`${selectCls} w-auto`}>
                  <option value="all">כל הסטטוסים</option>
                  <option value="ממתין לתשלום">ממתין לתשלום</option>
                  <option value="שולם חלקית">שולם חלקית</option>
                  <option value="מוקפאת">מוקפאת</option>
                  <option value="שולם מלא">שולם מלא</option>
                </select>
                <Button type="button" variant={hidePaidDeals ? 'secondary' : 'outline'} size="sm" onClick={() => setHidePaidDeals(v => !v)}>
                  {hidePaidDeals ? `הצג נסגרו (${paidDealsCount})` : 'הסתר נסגרו'}
                </Button>
                {(dealMonthFilter || dealStatusFilter !== 'all' || dealSearch.trim()) && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setDealMonthFilter(''); setDealStatusFilter('all'); setDealSearch(''); }}>נקה</Button>
                )}
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadDealsTemplate}><Download className="w-3.5 h-3.5" /></Button>
                  <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-accent">
                    <Upload className="w-3.5 h-3.5" />{importingDeals ? '...' : 'ייבוא'}
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportDeals} disabled={importingDeals} />
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={handleExportDeals} disabled={!dealLog.length}><Download className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {/* Month/filter summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-center"><p className="text-xs text-muted-foreground">עסקאות</p><p className="text-lg font-bold text-foreground">{filteredDealsMonthSummary.count}</p></div>
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-center"><p className="text-xs text-muted-foreground">סה"כ עסקאות</p><p className="text-lg font-bold text-violet-600">{fmt(filteredDealsMonthSummary.total)}</p></div>
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-center"><p className="text-xs text-muted-foreground">סה"כ נגבה</p><p className="text-lg font-bold text-emerald-600">{fmt(filteredDealsMonthSummary.paid)}</p></div>
              </div>

              {/* Deal cards grid */}
              {filteredDeals.length === 0
                ? <p className="text-center text-muted-foreground py-8 text-sm">אין עסקאות להצגה</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredDeals.map((deal, i) => (
                      <DealCard key={deal.id} deal={deal} index={i} onEdit={handleEditDeal} onRemove={handleRemoveDeal} onToggleFrozen={handleToggleFrozen} />
                    ))}
                  </div>
              }

              {/* RAG summary */}
              {(() => {
                const rg = { green: [], yellow: [], red: [] };
                dealLog.forEach(d => { if (['green','yellow','red'].includes(d.rag_status)) rg[d.rag_status].push(d); });
                const total = rg.green.length + rg.yellow.length + rg.red.length;
                if (!total) return null;
                return (
                  <div className="bg-muted/20 rounded-xl border border-border p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">חלוקת סיכונים R/Y/G</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ k:'green', e:'🟢', l:'ירוק', c:'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-300' }, { k:'yellow', e:'🟡', l:'צהוב', c:'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/25 dark:border-yellow-900/50 dark:text-yellow-300' }, { k:'red', e:'🔴', l:'אדום', c:'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/25 dark:border-red-900/50 dark:text-red-300' }].map(r => (
                        <div key={r.k} className={`rounded-xl border p-3 ${r.c}`}>
                          <p className="text-xs font-semibold">{r.e} {r.l}</p>
                          <p className="text-xl font-bold mt-0.5">{rg[r.k].length}</p>
                          <p className="text-xs opacity-75">{fmt(rg[r.k].reduce((s,d) => s + Number(d.totalAmount||0), 0))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===== EXPENSES TAB ===== */}
          {activeTab === 'expenses' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center"><p className="text-xs text-muted-foreground">קבועות</p><p className="text-lg font-bold text-red-600">{fmt(monthlyFixedTotal)}</p></div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center"><p className="text-xs text-muted-foreground">משתנות</p><p className="text-lg font-bold text-orange-600">{fmt(activeVariableMonthly)}</p></div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center"><p className="text-xs text-muted-foreground">סה"כ</p><p className="text-lg font-bold text-foreground">{fmt(totalMonthlyExpenses)}</p></div>
              </div>

              {/* Fixed */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Repeat className="w-4 h-4 text-red-500" /><h3 className="font-bold text-foreground text-sm">קבועות חודשיות</h3></div>
                <div className="flex gap-2">
                  <Input value={newFixedName} onChange={e => setNewFixedName(e.target.value)} placeholder="שם ההוצאה" className="flex-1" />
                  <Input type="number" value={newFixedAmount} onChange={e => setNewFixedAmount(e.target.value)} placeholder="₪" dir="ltr" className="w-24" onKeyDown={e => e.key === 'Enter' && handleAddFixed()} />
                  <Button size="icon" onClick={handleAddFixed} disabled={!newFixedName || !newFixedAmount}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {fixedExpenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">אין הוצאות קבועות</p>}
                  {fixedExpenses.map(e => {
                    const active = e.enabled !== false;
                    return (
                      <div key={e.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${active ? 'border-border bg-card' : 'border-border bg-muted/20 opacity-60'}`}>
                        <span className={`font-medium ${active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{e.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${active ? 'text-red-600' : 'text-muted-foreground'}`}>{fmt(e.amount)}</span>
                          <button onClick={() => handleToggleFixed(e.id)} className={`transition-colors ${active ? 'text-emerald-500 hover:text-emerald-700' : 'text-muted-foreground hover:text-emerald-500'}`}><Power className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleRemoveFixed(e.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Variable */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-500" /><h3 className="font-bold text-foreground text-sm">משתנות (תשלומים)</h3></div>
                <div className="space-y-2">
                  <Input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="שם ההוצאה" />
                  <div className="flex gap-2">
                    <Input type="number" value={newVarAmount} onChange={e => setNewVarAmount(e.target.value)} placeholder="סכום כולל ₪" dir="ltr" className="flex-1" />
                    <Input type="number" value={newVarInstallments} onChange={e => setNewVarInstallments(e.target.value)} placeholder="תשלומים" dir="ltr" className="w-24" min="1" />
                    <Button size="icon" onClick={handleAddVariable} disabled={!newVarName || !newVarAmount}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {variableExpenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">אין הוצאות משתנות</p>}
                  {variableExpenses.map(e => {
                    const done = e.paidInstallments >= e.installments;
                    return (
                      <div key={e.id} className={`rounded-xl border px-3 py-3 space-y-2 ${done ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/25' : 'border-border bg-card'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium text-sm ${done ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-foreground'}`}>{e.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${done ? 'text-emerald-600' : 'text-orange-600'}`}>{done ? 'שולם ✓' : `${fmt(e.installmentAmount)}/חודש`}</span>
                            <button onClick={() => handleRemoveVariable(e.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${(e.paidInstallments / e.installments) * 100}%` }} /></div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{e.paidInstallments}/{e.installments}</span>
                          {!done && <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => handlePayInstallment(e.id)}>שולם</Button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== NOTES TAB ===== */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-500" />הערות חופשיות</h3>
              <textarea value={freeNotes} onChange={e => { setFreeNotes(e.target.value); persist({ freeNotes: e.target.value }); }} placeholder="כתוב כאן הערות, רשימות, תזכורות... הכל נשמר אוטומטית" className="w-full min-h-64 resize-y rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm text-right leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" dir="rtl" />
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Notion Sync */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="w-4 h-4 text-muted-foreground" />סנכרון נושן</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {notionStatus !== 'ok' && <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSetupNotion} disabled={notionSetupLoading}>{notionSetupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}הגדר נושן</Button>}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleManualSync} disabled={notionSyncLoading}><RefreshCw className={`w-3.5 h-3.5 ${notionSyncLoading ? 'animate-spin' : ''}`} />סנכרן</Button>
                  {notionStatus === 'ok' && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />מחובר</span>}
                </div>
              </div>

              {/* Settings fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>יעד ברוטו חודשי (₪)</Label><Input type="number" value={monthlyGrossTarget} onChange={e => { const v = Math.max(0, Number(e.target.value)); setMonthlyGrossTarget(v); persist({ monthlyGrossTarget: v }); }} dir="ltr" className="mt-1" /></div>
                <div><Label>עמלה ממוצעת לתיק (₪)</Label><Input type="number" value={avgDealSize} onChange={e => { setAvgDealSize(e.target.value); persist({ avgDealSize: Number(e.target.value) }); }} dir="ltr" className="mt-1" /></div>
                <div><Label>צנרת ידנית (₪) — מבטל אוטומטי</Label><Input type="number" value={manualPipeline} onChange={e => { setManualPipeline(e.target.value); persist({ manualPipeline: Number(e.target.value) }); }} dir="ltr" className="mt-1" placeholder="0 = אוטומטי" /></div>
                <div><Label>שווי נכסים מניבים (₪)</Label><Input type="number" value={assetsValue} onChange={e => { setAssetsValue(e.target.value); persist({ assetsValue: Number(e.target.value) }); }} dir="ltr" className="mt-1" /></div>
                <div><Label>תיקים פעילים (ידני)</Label><Input type="number" value={manualActiveCount} onChange={e => { setManualActiveCount(e.target.value); persist({ manualActiveCount: e.target.value }); }} dir="ltr" className="mt-1" placeholder="ריק = אוטומטי" min="0" /></div>
                <div><Label>שווי יום מילואים אחד (₪)</Label><Input type="number" value={miluimDayValue} onChange={e => { const v = Math.max(0, Number(e.target.value)); setMiluimDayValue(v); persist({ miluimDayValue: v }); }} dir="ltr" className="mt-1" placeholder="0" min="0" /><p className="text-xs text-muted-foreground mt-1">משמש לחישוב אוטומטי של הכנסת מילואים — פטור ממס הכנסה ומע"ם</p></div>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">שיעורי מס</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">מס רגיל (%)</Label><Input type="number" value={Math.round(taxBufferRate * 100)} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value))) / 100; setTaxBufferRate(v); persist({ taxBufferRate: v }); }} dir="ltr" className="mt-1" min="0" max="100" /></div>
                  <div><Label className="text-xs">מס הייטק (%)</Label><Input type="number" value={Math.round(hitechTaxRate * 100)} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value))) / 100; setHitechTaxRate(v); persist({ hitechTaxRate: v }); }} dir="ltr" className="mt-1" min="0" max="100" /></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
