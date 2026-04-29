import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const TRACK_TYPES = [
  'קל"צ', 'ק"צ',
  'משתנה צמודה כל 1', 'משתנה צמודה כל 2', 'משתנה צמודה כל 3', 'משתנה צמודה כל 5',
  'מל"צ כל 1.5', 'מל"צ כל 2', 'מל"צ כל 3', 'מל"צ כל 5',
  'פריים', 'מק"מ',
];

const BANKS = ['בנק הפועלים', 'בנק לאומי', 'בנק דיסקונט', 'בנק טפחות', 'הבנק הבינלאומי', 'חוץ בנקאי'];

const nativeSelect = "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full";

const emptyTrack = () => ({ track_type: TRACK_TYPES[0], principal: '', interest_rate: '', years: '' });

export default function AdminFinalMortgage({ selectedClient }) {
  const [mortgages, setMortgages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_email: selectedClient || '', bank_name: BANKS[0], execution_date: '', notes: '', tracks: [emptyTrack()] });

  const load = async () => {
    const [data, clientRes] = await Promise.all([
      base44.entities.FinalMortgage.filter({}, '-created_date'),
      base44.functions.invoke('getAllClients', {}),
    ]);
    setUsers(clientRes.data?.profiles || []);
    setMortgages(selectedClient ? data.filter(m => m.client_email === selectedClient) : data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedClient]);
  useEffect(() => { if (selectedClient) setForm(f => ({ ...f, client_email: selectedClient })); }, [selectedClient]);

  const addTrack = () => setForm(f => ({ ...f, tracks: [...f.tracks, emptyTrack()] }));
  const removeTrack = (i) => setForm(f => ({ ...f, tracks: f.tracks.filter((_, idx) => idx !== i) }));
  const updateTrack = (i, key, val) => setForm(f => ({
    ...f,
    tracks: f.tracks.map((t, idx) => idx === i ? { ...t, [key]: val } : t)
  }));

  const handleSubmit = async () => {
    if (!form.client_email || !form.bank_name || !form.execution_date) {
      toast.error('נא למלא לקוח, בנק ותאריך ביצוע');
      return;
    }
    const tracks = form.tracks.map(t => ({
      track_type: t.track_type,
      principal: Number(t.principal) || 0,
      interest_rate: Number(t.interest_rate) || 0,
      years: Number(t.years) || 0,
    }));
    await base44.entities.FinalMortgage.create({ ...form, tracks });
    toast.success('הצעה זוכה נשמרה');
    setOpen(false);
    setForm({ client_email: selectedClient || '', bank_name: BANKS[0], execution_date: '', notes: '', tracks: [emptyTrack()] });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.FinalMortgage.delete(id);
    toast.success('נמחק');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">הצעה זוכה - משכנתא בוצעה</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />הוסף</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>תיעוד הצעה זוכה</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>לקוח</Label>
                <select value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} className={nativeSelect + ' mt-1'}>
                  <option value="">בחר לקוח</option>
                  {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>בנק מבצע</Label>
                  <select value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className={nativeSelect + ' mt-1'}>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <Label>תאריך ביצוע</Label>
                  <Input type="date" value={form.execution_date} onChange={e => setForm(f => ({ ...f, execution_date: e.target.value }))} className="mt-1" dir="ltr" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>תמהיל מסלולים</Label>
                  <Button size="sm" variant="outline" onClick={addTrack} className="gap-1 h-7 text-xs"><Plus className="w-3 h-3" />הוסף מסלול</Button>
                </div>
                <div className="space-y-2">
                  {form.tracks.map((track, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center bg-muted/30 rounded-lg p-2">
                      <select value={track.track_type} onChange={e => updateTrack(i, 'track_type', e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring col-span-2">
                        {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Input type="number" value={track.principal} onChange={e => updateTrack(i, 'principal', e.target.value)} placeholder="קרן ₪" className="h-8 text-xs" dir="ltr" />
                      <div className="flex gap-1">
                        <Input type="number" step="0.01" value={track.interest_rate} onChange={e => updateTrack(i, 'interest_rate', e.target.value)} placeholder="ריבית%" className="h-8 text-xs" dir="ltr" />
                        <Input type="number" value={track.years} onChange={e => updateTrack(i, 'years', e.target.value)} placeholder="שנים" className="h-8 text-xs w-16" dir="ltr" />
                        {form.tracks.length > 1 && (
                          <button onClick={() => removeTrack(i)} className="text-destructive hover:opacity-70 px-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>הערות</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות..." className="mt-1" />
              </div>
              <Button onClick={handleSubmit} className="w-full">שמור הצעה זוכה</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mortgages.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין הצעות זוכות מתועדות</div>
      ) : (
        <div className="space-y-3">
          {mortgages.map(m => {
            const totalPrincipal = (m.tracks || []).reduce((s, t) => s + (t.principal || 0), 0);
            return (
              <div key={m.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-bold text-base">{m.bank_name}</span>
                      <span className="text-sm text-muted-foreground">{m.client_email}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {m.execution_date ? new Date(m.execution_date).toLocaleDateString('he-IL') : '—'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      סה"כ קרן: <span className="font-semibold text-foreground">₪{totalPrincipal.toLocaleString('he-IL')}</span>
                    </div>
                    <div className="space-y-1">
                      {(m.tracks || []).map((t, i) => (
                        <div key={i} className="flex gap-3 text-xs bg-muted/40 rounded px-3 py-1.5">
                          <span className="font-medium">{t.track_type}</span>
                          <span className="text-muted-foreground">₪{(t.principal || 0).toLocaleString('he-IL')}</span>
                          <span className="text-blue-600">{t.interest_rate}%</span>
                          <span className="text-muted-foreground">שנ' {t.years}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}