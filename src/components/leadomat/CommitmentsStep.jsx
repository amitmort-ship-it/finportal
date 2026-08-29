import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { COMMITMENT_TYPES, selectClass, emptyCommitment, calcTotalCommitments, fmt } from './leadomatConfig';

export default function CommitmentsStep({ commitments, financialWealth, onChange }) {
  const setCommitments = (val) => onChange({ commitments: val, financial_wealth: financialWealth });
  const setWealth = (val) => onChange({ commitments, financial_wealth: val });

  const addCommitment = () => setCommitments([...(commitments || []), emptyCommitment()]);
  const removeCommitment = (idx) => setCommitments((commitments || []).filter((_, i) => i !== idx));
  const setCommitment = (idx, field, value) => setCommitments((commitments || []).map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const totalMonthly = calcTotalCommitments(commitments);

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">התחייבויות ועושר פיננסי</h3>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground">התחייבויות קיימות</p>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addCommitment}>
            <Plus className="w-3.5 h-3.5" /> הוסף התחייבות
          </Button>
        </div>
        {(commitments || []).length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין התחייבויות. לחץ "הוסף התחייבות" להוספה.</p>
        ) : (
          <div className="space-y-2">
            {(commitments || []).map((c, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end bg-muted/20 rounded-lg p-2.5">
                <div>
                  <Label className="text-[11px]">סוג התחייבות</Label>
                  <select value={c.commitment_type} onChange={e => setCommitment(idx, 'commitment_type', e.target.value)} className={selectClass}>
                    <option value="">בחר</option>
                    {COMMITMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px]">יתרה נוכחית (₪)</Label>
                  <Input type="number" value={c.current_balance} onChange={e => setCommitment(idx, 'current_balance', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">החזר חודשי (₪)</Label>
                  <Input type="number" value={c.monthly_payment} onChange={e => setCommitment(idx, 'monthly_payment', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">תאריך סיום</Label>
                  <Input type="date" value={c.end_date} onChange={e => setCommitment(idx, 'end_date', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">הערות</Label>
                  <Input value={c.notes} onChange={e => setCommitment(idx, 'notes', e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeCommitment(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {totalMonthly > 0 && (
          <div className="mt-2 flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">סך החזר חודשי כולל</span>
            <span className="text-sm font-bold text-primary">{fmt(totalMonthly)}</span>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs">עושר פיננסי ונכסים נוספים</Label>
        <Textarea value={financialWealth || ''} onChange={e => setWealth(e.target.value)} className="mt-1" rows={3} placeholder="פיקדונות, קרנות, חסכונות, נכסים נוספים..." />
      </div>
    </div>
  );
}