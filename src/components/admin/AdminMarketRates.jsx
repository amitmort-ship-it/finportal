import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingDown, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const TRACK_TYPES = [
  'קל"צ', 'ק"צ',
  'משתנה צמודה כל 1', 'משתנה צמודה כל 2', 'משתנה צמודה כל 3', 'משתנה צמודה כל 5',
  'מל"צ כל 1.5', 'מל"צ כל 2', 'מל"צ כל 3', 'מל"צ כל 5',
  'פריים', 'מק"מ',
];

const YEARS_RANGES = ['0-15', '15-20', '20-25', '25-30'];

const nativeSelect = "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

export default function AdminMarketRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [newRow, setNewRow] = useState({ track_type: TRACK_TYPES[0], years_range: YEARS_RANGES[0], target_rate: '' });

  const load = async () => {
    const data = await base44.entities.MarketRate.filter({}, 'track_type');
    setRates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newRow.target_rate) return;
    const rate = Number(newRow.target_rate);
    if (isNaN(rate)) return;
    await base44.entities.MarketRate.create({ ...newRow, target_rate: rate });
    toast.success('ריבית נוספה');
    setNewRow({ track_type: TRACK_TYPES[0], years_range: YEARS_RANGES[0], target_rate: '' });
    load();
  };

  const handleUpdate = async (id, target_rate) => {
    const rate = Number(target_rate);
    if (isNaN(rate)) return;
    setSaving(id);
    await base44.entities.MarketRate.update(id, { target_rate: rate });
    toast.success('עודכן');
    setSaving(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.MarketRate.delete(id);
    toast.success('נמחק');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">דופק שוק - ריביות יעד</h2>
      </div>

      {/* Add new row */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-muted-foreground block mb-1">סוג מסלול</label>
          <select value={newRow.track_type} onChange={e => setNewRow(r => ({ ...r, track_type: e.target.value }))} className={nativeSelect + ' w-full'}>
            {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">טווח שנים</label>
          <select value={newRow.years_range} onChange={e => setNewRow(r => ({ ...r, years_range: e.target.value }))} className={nativeSelect}>
            {YEARS_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">ריבית יעד (%)</label>
          <Input
            type="number"
            step="0.01"
            value={newRow.target_rate}
            onChange={e => setNewRow(r => ({ ...r, target_rate: e.target.value }))}
            placeholder="למשל: 3.5"
            className="w-32"
            dir="ltr"
          />
        </div>
        <Button onClick={handleAdd} disabled={!newRow.target_rate} className="gap-2">
          <Plus className="w-4 h-4" />הוסף
        </Button>
      </div>

      {/* Table */}
      {rates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין ריביות שוק מוגדרות עדיין</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">מסלול</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">טווח שנים</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">ריבית יעד (%)</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">עדכון אחרון</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate, i) => (
                <RateRow key={rate.id} rate={rate} onUpdate={handleUpdate} onDelete={handleDelete} saving={saving} isLast={i === rates.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RateRow({ rate, onUpdate, onDelete, saving, isLast }) {
  const [val, setVal] = useState(String(rate.target_rate));
  const changed = Number(val) !== rate.target_rate;

  return (
    <tr className={!isLast ? 'border-b border-border' : ''}>
      <td className="px-4 py-3 font-medium">{rate.track_type}</td>
      <td className="px-4 py-3 text-center text-muted-foreground">{rate.years_range}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Input
            type="number"
            step="0.01"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-24 text-center"
            dir="ltr"
          />
          {changed && (
            <Button size="icon" variant="ghost" className="text-primary h-7 w-7" onClick={() => onUpdate(rate.id, val)} disabled={saving === rate.id}>
              <Save className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
        {rate.updated_date ? new Date(rate.updated_date).toLocaleDateString('he-IL') : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => onDelete(rate.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
}