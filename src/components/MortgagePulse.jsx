import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Award } from 'lucide-react';

const THRESHOLD = 0.5;
const COOLOFF_MONTHS = 12;

function monthsDiff(dateStr) {
  if (!dateStr) return 0;
  const exec = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - exec.getFullYear()) * 12 + (now.getMonth() - exec.getMonth());
}

function getYearsRange(years) {
  if (years <= 15) return '0-15';
  if (years <= 20) return '15-20';
  if (years <= 25) return '20-25';
  return '25-30';
}

export default function MortgagePulse({ clientEmail }) {
  const [status, setStatus] = useState(null); // null=loading, 'none'=no mortgage, 'monitoring'=ok, 'opportunity'=refin
  const [mortgage, setMortgage] = useState(null);

  useEffect(() => {
    if (!clientEmail) return;
    const load = async () => {
      const [mortgages, marketRates] = await Promise.all([
        base44.entities.FinalMortgage.filter({ client_email: clientEmail }),
        base44.entities.MarketRate.filter({}),
      ]);

      if (!mortgages.length) { setStatus('none'); return; }

      const m = mortgages[0];
      setMortgage(m);
      const months = monthsDiff(m.execution_date);

      if (months < COOLOFF_MONTHS) { setStatus('monitoring'); return; }

      const rateMap = {};
      marketRates.forEach(r => { rateMap[`${r.track_type}__${r.years_range}`] = r.target_rate; });

      let totalWeightedGap = 0;
      let totalPrincipal = 0;
      (m.tracks || []).forEach(track => {
        const range = getYearsRange(track.years || 0);
        const key = `${track.track_type}__${range}`;
        const targetRate = rateMap[key];
        if (targetRate === undefined) return;
        totalWeightedGap += (track.interest_rate - targetRate) * (track.principal || 0);
        totalPrincipal += (track.principal || 0);
      });

      if (totalPrincipal === 0) { setStatus('monitoring'); return; }
      const avgGap = totalWeightedGap / totalPrincipal;
      setStatus(avgGap >= THRESHOLD ? 'opportunity' : 'monitoring');
    };
    load();
  }, [clientEmail]);

  if (status === null || status === 'none') return null;

  return (
    <>
      {status === 'opportunity' ? (
        <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-6 mb-6" dir="rtl">
          <div className="flex items-start gap-4">
            <Award className="w-6 h-6 text-amber-700 shrink-0 mt-1" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-amber-800 text-lg">המשכנתא שלך</h3>
                <span className="text-xs bg-yellow-200 text-amber-700 px-2.5 py-1 rounded-full font-semibold">בנק הפועלים</span>
              </div>
              <p className="text-amber-700 text-sm mb-4">סה"כ קרן: <span className="font-bold text-foreground">₪5,577,000</span></p>
              
              <div className="space-y-2">
                <div className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700">קל"צ</span>
                  <span className="text-xs">₪5,000</span>
                  <span className="text-xs font-bold text-amber-700">40שנ׳</span>
                  <span className="text-xs font-bold">%3.6</span>
                </div>
                <div className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700">חל״צ כל 2</span>
                  <span className="text-xs">₪577</span>
                  <span className="text-xs font-bold text-amber-700">50שנ׳</span>
                  <span className="text-xs font-bold">%3.7</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-3">בנק הפועלים · 21.4.2026</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6 mb-6" dir="rtl">
          <div className="flex items-start gap-4">
            <Zap className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-800 text-lg mb-2">מד דופק משכנתא</h3>
              <p className="text-blue-700 text-sm">המשכנתא שלך מנוטרת מול ריביות השוק. שתוהורץ הזדמנות למחזור, נעדכן אתך.</p>
              {mortgage?.execution_date && (
                <p className="text-xs text-blue-600 mt-2">בנק הפועלים · {new Date(mortgage.execution_date).toLocaleDateString('he-IL')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}