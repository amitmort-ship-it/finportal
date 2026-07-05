import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, ChevronUp, Users2, Pencil, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  referrer_name: '',
  mortgage_type: '',
  price: '',
  closed_amount: '',
  notes: '',
};

const selectClass = 'mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';
const inlineSelectClass = 'w-full h-8 rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [viewLead, setViewLead] = useState(null);

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
      if (payload.closed_amount) payload.closed_amount = Number(payload.closed_amount);
      else delete payload.closed_amount;
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

  const handleStartEdit = (lead) => {
    setEditingId(lead.id);
    setEditForm({
      date: lead.date || '',
      client_name: lead.client_name || '',
      phone: lead.phone || '',
      source: lead.source || '',
      referrer_name: lead.referrer_name || '',
      mortgage_type: lead.mortgage_type || '',
      price: lead.price ? String(lead.price) : '',
      closed_amount: lead.closed_amount ? String(lead.closed_amount) : '',
      notes: lead.notes || '',
      closed: !!lead.closed,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.client_name.trim() || !editForm.date) {
      toast.error('שם לקוח ותאריך הם שדות חובה');
      return;
    }
    setEditSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.price) payload.price = Number(payload.price);
      else { payload.price = null; }
      if (payload.closed_amount) payload.closed_amount = Number(payload.closed_amount);
      else { payload.closed_amount = 0; }
      await base44.entities.Lead.update(id, payload);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
      toast.success('הליד עודכן');
      handleCancelEdit();
    } catch {
      toast.error('שגיאה בעדכון הליד');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleMonth = (key) => {
    setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value, referrer_name: e.target.value === 'המלצות' ? f.referrer_name : '' }))} className={selectClass}>
                <option value="">בחר מקור</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {form.source === 'המלצות' && (
              <div>
                <Label className="text-xs">מי המליץ</Label>
                <Input value={form.referrer_name} onChange={e => setForm(f => ({ ...f, referrer_name: e.target.value }))} placeholder="שם הממליץ" className="mt-1" />
              </div>
            )}
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
            <div>
              <Label className="text-xs">סכום שנסגר (₪)</Label>
              <Input type="number" value={form.closed_amount} onChange={e => setForm(f => ({ ...f, closed_amount: e.target.value }))} placeholder="0" className="mt-1" dir="ltr" />
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
            const totalClosedAmount = monthLeads.reduce((sum, l) => sum + (l.closed_amount || 0), 0);

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
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">סה"כ {fmt(totalRevenue)}</span>
                    )}
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">נסגר {fmt(totalClosedAmount)}</span>
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
                          <th className="px-4 py-2 text-right font-medium">ממליץ</th>
                          <th className="px-4 py-2 text-right font-medium">סוג משכנתא</th>
                          <th className="px-4 py-2 text-right font-medium">מחיר</th>
                          <th className="px-4 py-2 text-right font-medium">נסגר ₪</th>
                          <th className="px-4 py-2 text-right font-medium">הערות</th>
                          <th className="px-4 py-2 text-right font-medium">סגירה</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthLeads.map((lead, idx) => {
                          const isEditing = editingId === lead.id;
                          return (
                            <tr key={lead.id} className={`border-b border-border last:border-0 ${isEditing ? 'bg-primary/5' : idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                                {isEditing
                                  ? <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs w-32" dir="ltr" />
                                  : lead.date}
                              </td>
                              <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                                {isEditing
                                  ? <Input value={editForm.client_name} onChange={e => setEditForm(f => ({ ...f, client_name: e.target.value }))} className="h-8 text-xs w-32" />
                                  : lead.client_name}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground" dir="ltr">
                                {isEditing
                                  ? <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-xs w-28" dir="ltr" />
                                  : (lead.phone || '—')}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <select value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value, referrer_name: e.target.value === 'המלצות' ? f.referrer_name : '' }))} className={inlineSelectClass}>
                                    <option value="">—</option>
                                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                ) : lead.source ? (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[lead.source] || 'bg-slate-100 text-slate-600'}`}>{lead.source}</span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                                {isEditing ? (
                                  editForm.source === 'המלצות'
                                    ? <Input value={editForm.referrer_name} onChange={e => setEditForm(f => ({ ...f, referrer_name: e.target.value }))} className="h-8 text-xs w-28" placeholder="שם ממליץ" />
                                    : <span className="text-muted-foreground">—</span>
                                ) : (lead.source === 'המלצות' ? (lead.referrer_name || '—') : '—')}
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                {isEditing ? (
                                  <select value={editForm.mortgage_type} onChange={e => setEditForm(f => ({ ...f, mortgage_type: e.target.value }))} className={inlineSelectClass}>
                                    <option value="">—</option>
                                    {MORTGAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                ) : (lead.mortgage_type || '—')}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-emerald-700">
                                {isEditing
                                  ? <Input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-xs w-24" dir="ltr" />
                                  : fmt(lead.price)}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-primary">
                                {isEditing
                                  ? <Input type="number" value={editForm.closed_amount} onChange={e => setEditForm(f => ({ ...f, closed_amount: e.target.value }))} className="h-8 text-xs w-24" dir="ltr" />
                                  : fmt(lead.closed_amount)}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px]">
                                {isEditing
                                  ? <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs w-40" />
                                  : <span className="truncate block">{lead.notes || '—'}</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={!!editForm.closed} onChange={e => setEditForm(f => ({ ...f, closed: e.target.checked }))} className="w-4 h-4 accent-primary" />
                                    <span className="text-xs">נסגר</span>
                                  </label>
                                ) : (
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
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => handleSaveEdit(lead.id)} disabled={editSaving} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={handleCancelEdit} className="text-muted-foreground hover:text-foreground transition-colors">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button type="button" onClick={() => setViewLead(lead)} title="פתח ליד" className="text-muted-foreground hover:text-accent transition-colors">
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => handleStartEdit(lead)} className="text-muted-foreground hover:text-primary transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewLead} onOpenChange={(open) => !open && setViewLead(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right">פרטי הליד</DialogTitle>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">תאריך</span>
                  <p className="font-medium" dir="ltr">{viewLead.date || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">שם הלקוח</span>
                  <p className="font-medium">{viewLead.client_name || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">טלפון</span>
                  <p className="font-medium" dir="ltr">{viewLead.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">מקור</span>
                  <p className="font-medium">{viewLead.source || '—'}</p>
                </div>
                {viewLead.source === 'המלצות' && (
                  <div>
                    <span className="text-xs text-muted-foreground">מי המליץ</span>
                    <p className="font-medium">{viewLead.referrer_name || '—'}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">סוג משכנתא</span>
                  <p className="font-medium">{viewLead.mortgage_type || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">מחיר</span>
                  <p className="font-medium text-emerald-700">{fmt(viewLead.price)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">סכום שנסגר</span>
                  <p className="font-medium text-primary">{fmt(viewLead.closed_amount)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">סטטוס</span>
                  <p className="font-medium">{viewLead.closed ? 'נסגר ✓' : 'פתוח'}</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">הערות</span>
                <div className="mt-1 rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap break-words text-foreground">
                  {viewLead.notes || 'אין הערות'}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setViewLead(null); handleStartEdit(viewLead); }} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> ערוך
                </Button>
                <Button type="button" size="sm" onClick={() => setViewLead(null)}>סגור</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}