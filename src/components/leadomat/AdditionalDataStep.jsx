import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { selectClass } from './leadomatConfig';

export default function AdditionalDataStep({ data, onChange }) {
  const set = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">נתונים נוספים והערות אישיות</h3>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">פיננסי והתנהלות</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">מקורות הון עצמי</Label>
            <Input value={data.equity_sources || ''} onChange={e => set('equity_sources', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">שכר דירה חודשי כיום (₪)</Label>
            <Input type="number" value={data.current_rent || ''} onChange={e => set('current_rent', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">דוח אשראי צרכני נקי</Label>
            <select value={data.clean_credit_report ? 'yes' : 'no'} onChange={e => set('clean_credit_report', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">בעיה בהתנהלות פיננסית</Label>
            <select value={data.financial_issues ? 'yes' : 'no'} onChange={e => set('financial_issues', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">צרכי אשראי והעדפות</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">החזר חודשי מבוקש (₪)</Label>
            <Input type="number" value={data.requested_monthly_payment || ''} onChange={e => set('requested_monthly_payment', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">יום החזר מועדף</Label>
            <Input value={data.preferred_payment_day || ''} onChange={e => set('preferred_payment_day', e.target.value)} className="mt-1" placeholder="לדוגמה: 1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">גרייס</Label>
            <select value={data.grace ? 'yes' : 'no'} onChange={e => set('grace', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          {data.grace && (
            <div>
              <Label className="text-xs">משך גרייס</Label>
              <Input value={data.grace_duration || ''} onChange={e => set('grace_duration', e.target.value)} className="mt-1" placeholder="לדוגמה: 3 חודשים" />
            </div>
          )}
          <div>
            <Label className="text-xs">חוסכים כל חודש</Label>
            <select value={data.monthly_savings ? 'yes' : 'no'} onChange={e => set('monthly_savings', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          {data.monthly_savings && (
            <div>
              <Label className="text-xs">סכום חיסכון חודשי (₪)</Label>
              <Input type="number" value={data.monthly_savings_amount || ''} onChange={e => set('monthly_savings_amount', e.target.value)} className="mt-1" dir="ltr" />
            </div>
          )}
          <div>
            <Label className="text-xs">הטבת ריביות עובדי בנק</Label>
            <select value={data.bank_employee_benefits ? 'yes' : 'no'} onChange={e => set('bank_employee_benefits', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">פרעונות עתידיים צפויים</Label>
            <Input value={data.expected_prepayments || ''} onChange={e => set('expected_prepayments', e.target.value)} className="mt-1" placeholder="תיאור פרעונות צפויים..." />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">רקע אישי</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">בעיה בריאותית מיוחדת</Label>
            <select value={data.health_issues ? 'yes' : 'no'} onChange={e => set('health_issues', e.target.value === 'yes')} className={selectClass}>
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">הערות אישיות</Label>
        <Textarea value={data.personal_notes || ''} onChange={e => set('personal_notes', e.target.value)} className="mt-1" rows={4} placeholder="הערות אישיות חופשיות..." />
      </div>
    </div>
  );
}