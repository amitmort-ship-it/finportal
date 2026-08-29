import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { emptyBankAccount } from './leadomatConfig';

export default function BankAccountsStep({ bankAccounts, onChange }) {
  const addAccount = () => onChange([...(bankAccounts || []), emptyBankAccount()]);
  const removeAccount = (idx) => onChange((bankAccounts || []).filter((_, i) => i !== idx));
  const setAccount = (idx, field, value) => onChange((bankAccounts || []).map((a, i) => i === idx ? { ...a, [field]: value } : a));

  return (
    <div className="space-y-5" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">חשבונות בנק</h3>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground">חשבונות בנק של הליד</p>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addAccount}>
            <Plus className="w-3.5 h-3.5" /> הוסף חשבון
          </Button>
        </div>
        {(bankAccounts || []).length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין חשבונות. לחץ "הוסף חשבון" להוספה.</p>
        ) : (
          <div className="space-y-2">
            {(bankAccounts || []).map((a, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-muted/20 rounded-lg p-2.5">
                <div>
                  <Label className="text-[11px]">שם הבנק</Label>
                  <Input value={a.bank_name} onChange={e => setAccount(idx, 'bank_name', e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">מספר סניף</Label>
                  <Input value={a.branch} onChange={e => setAccount(idx, 'branch', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">מספר חשבון</Label>
                  <Input value={a.account_number} onChange={e => setAccount(idx, 'account_number', e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <Label className="text-[11px]">הערות</Label>
                  <Input value={a.notes} onChange={e => setAccount(idx, 'notes', e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeAccount(idx)}>
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