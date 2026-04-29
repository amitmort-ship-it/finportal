import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

const TRACK_TYPES = [
  'קל"צ', 'ק"צ', 'משתנה צמודה כל 1', 'משתנה צמודה כל 2', 'משתנה צמודה כל 3',
  'משתנה צמודה כל 5', 'מל"צ כל 1.5', 'מל"צ כל 2', 'מל"צ כל 3', 'מל"צ כל 5',
  'פריים', 'מק"מ',
];

const emptyTrack = { track_type: 'קל"צ', principal: '', interest_rate: '', years: '' };

export default function RefinanceAddTemp({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    bank_name: '',
    execution_date: '',
    tracks: [{ ...emptyTrack }],
  });

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const setTrackField = (i, field, value) => {
    setForm(f => {
      const tracks = [...f.tracks];
      tracks[i] = { ...tracks[i], [field]: value };
      return { ...f, tracks };
    });
  };

  const addTrack = () => setForm(f => ({ ...f, tracks: [...f.tracks, { ...emptyTrack }] }));
  const removeTrack = (i) => setForm(f => ({ ...f, tracks: f.tracks.filter((_, idx) => idx !== i) }));

  const handleAdd = () => {
    if (!form.name || !form.email || !form.execution_date || !form.tracks.length) return;
    const tracks = form.tracks.map(t => ({
      track_type: t.track_type,
      principal: Number(t.principal) || 0,
      interest_rate: Number(t.interest_rate) || 0,
      years: Number(t.years) || 0,
    }));
    onAdd({
      id: `temp-${Date.now()}`,
      client_email: form.email,
      clientName: form.name,
      clientPhone: form.phone,
      bank_name: form.bank_name,
      execution_date: form.execution_date,
      tracks,
      isTemp: true,
    });
    setForm({ name: '', phone: '', email: '', bank_name: '', execution_date: '', tracks: [{ ...emptyTrack }] });
    setOpen(false);
  };

  return (
    <div className="mb-4 border border-dashed border-amber-300 rounded-xl bg-amber-50/40" dir="rtl">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-50 rounded-xl transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <UserPlus className="w-4 h-4" />
        הוסף לקוח ארעי לבדיקת מחזור
        {open ? <ChevronUp className="w-4 h-4 mr-auto" /> : <ChevronDown className="w-4 h-4 mr-auto" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* פרטי לקוח */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">שם מלא *</Label>
              <Input className="mt-1 h-8 text-sm" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="ישראל ישראלי" />
            </div>
            <div>
              <Label className="text-xs">טלפון</Label>
              <Input className="mt-1 h-8 text-sm" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="050-0000000" dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">מייל *</Label>
              <Input className="mt-1 h-8 text-sm" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="israel@example.com" dir="ltr" />
            </div>
          </div>

          {/* פרטי משכנתא */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">בנק</Label>
              <Input className="mt-1 h-8 text-sm" value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} placeholder="בנק הפועלים" />
            </div>
            <div>
              <Label className="text-xs">תאריך ביצוע *</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={form.execution_date} onChange={e => setField('execution_date', e.target.value)} dir="ltr" />
            </div>
          </div>

          {/* מסלולים */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">מסלולים</Label>
              <Button type="button" size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={addTrack}>
                <Plus className="w-3 h-3" /> מסלול
              </Button>
            </div>
            <div className="space-y-2">
              {form.tracks.map((track, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end bg-white rounded-lg border border-amber-100 p-2">
                  <div>
                    <Label className="text-xs">סוג מסלול</Label>
                    <select
                      className="mt-1 w-full h-8 text-xs rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={track.track_type}
                      onChange={e => setTrackField(i, 'track_type', e.target.value)}
                    >
                      {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">קרן (₪)</Label>
                    <Input className="mt-1 h-8 text-xs" type="number" dir="ltr" value={track.principal} onChange={e => setTrackField(i, 'principal', e.target.value)} placeholder="500000" />
                  </div>
                  <div>
                    <Label className="text-xs">ריבית (%)</Label>
                    <Input className="mt-1 h-8 text-xs" type="number" dir="ltr" step="0.01" value={track.interest_rate} onChange={e => setTrackField(i, 'interest_rate', e.target.value)} placeholder="4.5" />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <Label className="text-xs">שנים</Label>
                      <Input className="mt-1 h-8 text-xs" type="number" dir="ltr" value={track.years} onChange={e => setTrackField(i, 'years', e.target.value)} placeholder="25" />
                    </div>
                    {form.tracks.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeTrack(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            onClick={handleAdd}
            disabled={!form.name || !form.email || !form.execution_date}
          >
            <Plus className="w-4 h-4" />
            הוסף לבדיקה
          </Button>
        </div>
      )}
    </div>
  );
}