import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, TrendingDown, Award } from 'lucide-react';

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
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 mb-6" dir="rtl">
      <p className="text-sm text-blue-800">
        <span className="font-bold">מד דופק משכנתא:</span> המשכנתא שלך מנוטרת מול ריביות השוק. נעדכן כשתיווצר הזדמנות למחזור.
      </p>
      <p className="text-xs text-blue-600 mt-3 text-right">בדיקה אחרונה: {new Date().toLocaleDateString('he-IL')}</p>
    </div>

    {mortgage && (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 mt-4" dir="rtl">
        <div className="flex items-start justify-between gap-4 mb-4" dir="rtl">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="font-bold text-xl text-yellow-800">המשכנתא שלך</span>
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-sm text-yellow-700 font-semibold">סה"כ קרן: ₪{(mortgage.tracks || []).reduce((sum, t) => sum + (t.principal || 0), 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-yellow-600 mb-2">{new Date(mortgage.execution_date).toLocaleDateString('he-IL')}</div>
            <div className="inline-block bg-yellow-200 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded">{mortgage.bank_name || 'בנק'}</div>
          </div>
        </div>
        <div className="space-y-2">
          {(mortgage.tracks || []).map((track, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-white/50 rounded px-3 py-2">
              <span className="text-yellow-700 font-medium">{track.track_type}</span>
              <span className="text-yellow-600">₪{(track.principal || 0).toLocaleString()}</span>
              <span className="font-bold text-blue-600">{track.interest_rate}%</span>
              <span className="text-yellow-700">{track.years}שנ'</span>
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}