import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Award } from 'lucide-react';

export default function FinalMortgageDetails({ clientEmail }) {
  const [mortgage, setMortgage] = useState(null);

  useEffect(() => {
    if (!clientEmail) return;
    base44.entities.FinalMortgage.filter({ client_email: clientEmail }, '-created_date')
      .then(data => { if (data.length > 0) setMortgage(data[0]); });
  }, [clientEmail]);

  if (!mortgage) return null;

  const totalPrincipal = (mortgage.tracks || []).reduce((s, t) => s + (t.principal || 0), 0);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-amber-800">המשכנתא שלך</h3>
        <span className="mr-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
          {mortgage.bank_name}
        </span>
        {mortgage.execution_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(mortgage.execution_date).toLocaleDateString('he-IL')}
          </span>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        סה"כ קרן: <span className="font-semibold text-foreground">₪{totalPrincipal.toLocaleString('he-IL')}</span>
      </div>

      <div className="space-y-1.5">
        {(mortgage.tracks || []).map((t, i) => (
          <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-4 py-2 text-sm border border-amber-100">
            <span className="font-medium text-foreground">{t.track_type}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">₪{(t.principal || 0).toLocaleString('he-IL')}</span>
              <span className="text-blue-600 font-medium">{t.interest_rate}%</span>
              <span className="text-muted-foreground">שנ' {t.years}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}