import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { SOURCES, STATUSES, selectClass, emptyLead } from './leadomatConfig';
import BorrowerStep from './BorrowerStep';
import DealStep from './DealStep';
import CommitmentsStep from './CommitmentsStep';
import BankAccountsStep from './BankAccountsStep';
import AdditionalDataStep from './AdditionalDataStep';

const STEPS = [
  { id: 'meta', label: 'פרטי ליד' },
  { id: 'borrower1', label: 'לווה 1' },
  { id: 'borrower2', label: 'לווה 2' },
  { id: 'deal', label: 'פרטי עסקה' },
  { id: 'commitments', label: 'התחייבויות' },
  { id: 'banks', label: 'חשבונות בנק' },
  { id: 'additional', label: 'נתונים נוספים' },
];

export default function LeadomatForm({ initialData, onSave, onCancel, saving }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData || emptyLead());

  const set = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 0) return !!data.lead_name?.trim();
    return true;
  };

  const handleSave = () => {
    if (!data.lead_name?.trim()) return;
    onSave(data);
  };

  const renderStep = () => {
    switch (STEPS[step].id) {
      case 'meta':
        return (
          <div className="space-y-4" dir="rtl">
            <h3 className="text-sm font-bold text-primary border-b border-border pb-2">פרטי ליד</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">שם הליד *</Label>
                <Input value={data.lead_name} onChange={e => set('lead_name', e.target.value)} className="mt-1" placeholder="לדוגמה: ישראל ישראלי" />
              </div>
              <div>
                <Label className="text-xs">סטטוס</Label>
                <select value={data.status} onChange={e => set('status', e.target.value)} className={selectClass}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">טלפון</Label>
                <Input value={data.phone || ''} onChange={e => set('phone', e.target.value)} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">מקור</Label>
                <select value={data.source || ''} onChange={e => set('source', e.target.value)} className={selectClass}>
                  <option value="">בחר</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {data.source === 'המלצות' && (
                <div>
                  <Label className="text-xs">מי המליץ</Label>
                  <Input value={data.referrer_name || ''} onChange={e => set('referrer_name', e.target.value)} className="mt-1" />
                </div>
              )}
              <div>
                <Label className="text-xs">קשר בין הלווים</Label>
                <Input value={data.relationship_between_borrowers || ''} onChange={e => set('relationship_between_borrowers', e.target.value)} className="mt-1" placeholder="לדוגמה: נשואים" />
              </div>
            </div>
          </div>
        );
      case 'borrower1':
        return <BorrowerStep title="לווה 1" borrower={data.borrower1} onChange={b => set('borrower1', b)} />;
      case 'borrower2':
        return <BorrowerStep title="לווה 2" borrower={data.borrower2} onChange={b => set('borrower2', b)} />;
      case 'deal':
        return <DealStep deal={data.deal} onChange={d => set('deal', d)} dealValue={data.deal_value} onDealValueChange={v => set('deal_value', v)} />;
      case 'commitments':
        return <CommitmentsStep commitments={data.commitments} financialWealth={data.financial_wealth} onChange={({ commitments, financial_wealth }) => { set('commitments', commitments); set('financial_wealth', financial_wealth); }} />;
      case 'banks':
        return <BankAccountsStep bankAccounts={data.bank_accounts} onChange={val => set('bank_accounts', val)} />;
      case 'additional':
        return <AdditionalDataStep data={data} onChange={set} />;
      default:
        return null;
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {i < step && <Check className="w-3 h-3" />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 min-h-[300px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          ביטול
        </Button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={saving}>
              <ChevronRight className="w-4 h-4" /> הקודם
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              הבא <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={saving || !data.lead_name?.trim()}>
              {saving ? 'שומר...' : 'שמור ליד'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}