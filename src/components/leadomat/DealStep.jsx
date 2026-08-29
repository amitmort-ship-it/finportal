import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEAL_TYPES, selectClass, calcLTV, fmt } from './leadomatConfig';

export default function DealStep({ deal, onChange, dealValue, onDealValueChange }) {
  const set = (field, value) => onChange({ ...deal, [field]: value });
  const ltv = calcLTV(deal);

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">פרטי העסקה</h3>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">סוג ושווי</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">סוג העסקה</Label>
            <select value={deal.deal_type || ''} onChange={e => set('deal_type', e.target.value)} className={selectClass}>
              <option value="">בחר</option>
              {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">עלות הרכישה (₪)</Label>
            <Input type="number" value={deal.purchase_cost || ''} onChange={e => set('purchase_cost', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">שווי ע"פ שמאות (₪)</Label>
            <Input type="number" value={deal.appraisal_value || ''} onChange={e => set('appraisal_value', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">שווי נכס מייצג (₪)</Label>
            <Input type="number" value={deal.representative_value || ''} onChange={e => set('representative_value', e.target.value)} className="mt-1" dir="ltr" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-red-300 bg-red-50/50 p-3">
        <p className="text-xs font-semibold text-red-600 mb-2">תמחור התיק</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-red-600">גובה עסקה — שווי תיק (₪)</Label>
            <Input type="number" value={dealValue || ''} onChange={e => onDealValueChange(e.target.value)} className="mt-1 border-red-300 text-red-600 placeholder:text-red-400/70" dir="ltr" placeholder="עמלה צפויה" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">מימון ומשכנתה</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">משכנתה מבוקשת (₪)</Label>
            <Input type="number" value={deal.requested_mortgage || ''} onChange={e => set('requested_mortgage', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">הון עצמי (₪)</Label>
            <Input type="number" value={deal.equity || ''} onChange={e => set('equity', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">תשלומים נלווים (₪)</Label>
            <Input type="number" value={deal.additional_payments || ''} onChange={e => set('additional_payments', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">הלוואה להשלמת הון עצמי (₪)</Label>
            <Input type="number" value={deal.equity_completion_loan || ''} onChange={e => set('equity_completion_loan', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">אחוז מימון מחושב (LTV)</Label>
            <div className="mt-1 h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-bold text-primary">
              {ltv > 0 ? `${ltv}%` : '—'}
            </div>
            {ltv > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                משכנתה {fmt(deal.requested_mortgage)} מתוך {fmt(deal.appraisal_value || deal.purchase_cost)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">לוחות זמנים</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">תאריך חתימת חוזה</Label>
            <Input type="date" value={deal.contract_date || ''} onChange={e => set('contract_date', e.target.value)} className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">תאריך מסירה</Label>
            <Input type="date" value={deal.delivery_date || ''} onChange={e => set('delivery_date', e.target.value)} className="mt-1" dir="ltr" />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">תיאור העסקה (למכתב לבנק)</Label>
        <Textarea value={deal.deal_description || ''} onChange={e => set('deal_description', e.target.value)} className="mt-1" rows={4} placeholder="תיאור חופשי של העסקה..." />
      </div>
    </div>
  );
}