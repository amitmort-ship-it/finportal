import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EMPLOYMENT_STATUSES, MARITAL_STATUSES, GENDERS, INCOME_TYPES, selectClass, calcAge, emptyIncome } from './leadomatConfig';

export default function BorrowerStep({ borrower, onChange, title }) {
  const set = (field, value) => onChange({ ...borrower, [field]: value });

  const addIncome = () => set('incomes', [...(borrower.incomes || []), emptyIncome()]);
  const removeIncome = (idx) => set('incomes', (borrower.incomes || []).filter((_, i) => i !== idx));
  const setIncome = (idx, field, value) => set('incomes', (borrower.incomes || []).map((inc, i) => i === idx ? { ...inc, [field]: value } : inc));

  const age = calcAge(borrower.birth_date);

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">{title}</h3>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">פרטי זהות וקשר</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">שם פרטי</Label>
            <Input value={borrower.first_name || ''} onChange={e => set('first_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">שם משפחה</Label>
            <Input value={borrower.last_name || ''} onChange={e => set('last_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">תעודת זהות</Label>
            <Input value={borrower.id_number || ''} onChange={e => set('id_number', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">תאריך לידה</Label>
            <Input type="date" value={borrower.birth_date || ''} onChange={e => set('birth_date', e.target.value)} className="mt-1" dir="ltr" />
            {age != null && <p className="text-[11px] text-muted-foreground mt-0.5">גיל: {age}</p>}
          </div>
          <div>
            <Label className="text-xs">תאריך הנפקת תעודה</Label>
            <Input type="date" value={borrower.id_issue_date || ''} onChange={e => set('id_issue_date', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">תוקף תעודת זהות</Label>
            <Input type="date" value={borrower.id_expiry_date || ''} onChange={e => set('id_expiry_date', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">מגדר</Label>
            <select value={borrower.gender || ''} onChange={e => set('gender', e.target.value)} className={selectClass}>
              <option value="">בחר</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">טלפון נייד</Label>
            <Input value={borrower.mobile_phone || ''} onChange={e => set('mobile_phone', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">אימייל</Label>
            <Input value={borrower.email || ''} onChange={e => set('email', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">מעמד תעסוקתי</Label>
            <select value={borrower.employment_status || ''} onChange={e => set('employment_status', e.target.value)} className={selectClass}>
              <option value="">בחר</option>
              {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">אזרחות זרה</Label>
            <select value={borrower.foreign_citizenship ? 'yes' : 'no'} onChange={e => set('foreign_citizenship', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">דרכון</Label>
            <Input value={borrower.passport || ''} onChange={e => set('passport', e.target.value)} className="mt-1" dir="ltr" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">פרטים אישיים ומשפחתיים</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">מצב משפחתי</Label>
            <select value={borrower.marital_status || ''} onChange={e => set('marital_status', e.target.value)} className={selectClass}>
              <option value="">בחר</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">ילדים מתחת לגיל 18</Label>
            <Input type="number" value={borrower.children_under_18 || 0} onChange={e => set('children_under_18', Number(e.target.value))} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">גילאי הילדים</Label>
            <Input value={borrower.children_ages || ''} onChange={e => set('children_ages', e.target.value)} className="mt-1" placeholder="לדוגמה: 3, 7, 12" />
          </div>
          <div>
            <Label className="text-xs">בחופשת לידה</Label>
            <select value={borrower.maternity_leave ? 'yes' : 'no'} onChange={e => set('maternity_leave', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">עיר מגורים</Label>
            <Input value={borrower.city || ''} onChange={e => set('city', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">כתובת מלאה</Label>
            <Input value={borrower.address || ''} onChange={e => set('address', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">מיקוד</Label>
            <Input value={borrower.zip_code || ''} onChange={e => set('zip_code', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">השכלה</Label>
            <Input value={borrower.education || ''} onChange={e => set('education', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">קירבה לאיש ציבור</Label>
            <select value={borrower.public_figure ? 'yes' : 'no'} onChange={e => set('public_figure', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground">הכנסות</p>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addIncome}>
            <Plus className="w-3.5 h-3.5" /> הוסף הכנסה
          </Button>
        </div>
        {(borrower.incomes || []).length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין הכנסות. לחץ "הוסף הכנסה" להוספה.</p>
        ) : (
          <div className="space-y-2">
            {(borrower.incomes || []).map((inc, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-muted/20 rounded-lg p-2.5">
                <div>
                  <Label className="text-[11px]">סוג הכנסה</Label>
                  <select value={inc.income_type} onChange={e => setIncome(idx, 'income_type', e.target.value)} className={selectClass}>
                    <option value="">בחר</option>
                    {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px]">מעסיק / עסק</Label>
                  <Input value={inc.employer} onChange={e => setIncome(idx, 'employer', e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">נטו (₪)</Label>
                  <Input type="number" value={inc.net_amount} onChange={e => setIncome(idx, 'net_amount', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">ברוטו (₪)</Label>
                  <Input type="number" value={inc.gross_amount} onChange={e => setIncome(idx, 'gross_amount', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeIncome(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}