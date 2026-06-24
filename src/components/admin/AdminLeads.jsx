import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, ChevronUp, Users2 } from 'lucide-react';
import { toast } from 'sonner';

const SOURCES = ['המלצות', 'לקוח חוזר', 'פרסום', 'היכרות אישית', 'אחר'];
const MORTGAGE_TYPES = ['ראשונה', 'משפרי דיור', 'מחזור', 'נכס להשקעה', 'מסחרי', 'אחר'];

const SOURCE_COLORS = {
  'המלצות': 'bg-emerald-100 text-emerald-700',
  'לקוח חוזר': 'bg-blue-100 text-blue-700',
  'פרסום': 'bg-orange-100 text-orange-700',
  'היכרות אישית': 'bg-purple-100 text-purple-700',
  'אחר': 'bg-slate-100 text-slate-600',
};

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  client_name: '',
  phone: '',
  source: '',
  mortgage_type: '',
  price: '',
  notes: '',
};

const selectClass = 'mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

function fmt(num) {
  if (!num) return '—';
  return '₪' + Number(num).toLocaleString('he-IL');
}

function getMonthKey(dateStr) {
  if (!dateStr) return 'ללא תאריך';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
  if (key === 'ללא תאריך') return key;
  const [year, month] = key.split('-');
  const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Lead.list('-date', 200);
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      toast.error('שגיאה בטעינת הלידים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.date) {
      toast.error('שם לקוח ותאריך הם שדות חובה');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.price) payload.price = Number(payload.price);
      else delete payload.price;
      await base44.entities.Lead.create(payload);
      toast.success('ליד נוסף בהצלחה');
      setForm({ ...emptyForm });
      setShowForm(false);
      await load();
    } catch {
      toast.error('שגיאה בשמירת הליד');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Lead.delete(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('הליד נמחק');
    } catch {
      toast.error('שגיאה במחיקת הליד');
    }
  };

  const toggleMonth = (key) => {
    setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group by month
  const grouped = {};
  for (const lead of leads) {
    const key = getMonthKey(lead.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(lead);
  }
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">לידומט</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leads.length} לידים</span>
        </div>
        <Button type="button" className="gap-2" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" />
          {showForm ? 'סגור' : 'ליד חדש'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">הוספת ליד חדש</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">תאריך *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">שם הלקוח *</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="ישראל ישראלי" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">טלפון</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" className="mt-1" dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">איך הגיע</Label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className={selectClass}>
                <option value="">בחר מקור</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">סוג משכנתא</Label>
              <select value={form.mortgage_type} onChange={e => setForm(f => ({ ...f, mortgage_type: e.target.value }))} className={selectClass}>
                <option value="">בחר סוג</option>
                {MORTGAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">מחיר (₪)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className="mt-1" dir="ltr" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="form-closed" checked={!!form.closed} onChange={e => setForm(f => ({ ...f, closed: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary cursor-pointer" />
              <Label htmlFor="form-closed" className="text-xs cursor-pointer">ליד נסגר</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">הערות</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות..." className="mt-1" rows={2} />
          </div>
          <Button type="button" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'שומר...' : 'שמור ליד'}
          </Button>
        </div>
      )}

      {sortedMonths.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
          אין לידים עדיין. לחץ על "ליד חדש" להוספה.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map(monthKey => {
            const monthLeads = grouped[monthKey];
            const isCollapsed = collapsedMonths[monthKey];
            const totalRevenue = monthLeads.reduce((sum, l) => sum + (l.price || 0), 0);

            return (
              <div key={monthKey} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{getMonthLabel(monthKey)}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{monthLeads.length} לידים</span>
                    {totalRevenue > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{fmt(totalRevenue)}</span>
                    )}
                  </div>
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-right font-medium">תאריך</th>
                          <th className="px-4 py-2 text-right font-medium">שם</th>
                          <th className="px-4 py-2 text-right font-medium">טלפון</th>
                          <th className="px-4 py-2 text-right font-medium">מקור</th>
                          <th className="px-4 py-2 text-right font-medium">סוג משכנתא</th>
                          <th className="px-4 py-2 text-right font-medium">מחיר</th>
                          <th className="px-4 py-2 text-right font-medium">הערות</th>
                          <th className="px-4 py-2 text-right font-medium">סגירה</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthLeads.map((lead, idx) => (
                          <tr key={lead.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap" dir="ltr">{lead.date}</td>
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">{lead.client_name}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground" dir="ltr">{lead.phone || '—'}</td>
                            <td className="px-4 py-2.5">
                              {lead.source ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[lead.source] || 'bg-slate-100 text-slate-600'}`}>{lead.source}</span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs">{lead.mortgage_type || '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-medium text-emerald-700">{fmt(lead.price)}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{lead.notes || '—'}</td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = { ...lead, closed: !lead.closed };
                                  setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
                                  await base44.entities.Lead.update(lead.id, { closed: !lead.closed });
                                }}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${lead.closed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                {lead.closed ? 'נסגר ✓' : 'פתוח'}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              <button type="button" onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}