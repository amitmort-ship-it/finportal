import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, TrendingDown } from 'lucide-react';

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
    <div className="rounded-2xl border-2 p-6 mb-6" dir="rtl"
      style={status === 'opportunity'
        ? { borderColor: 'rgb(191 219 254)', backgroundColor: 'rgb(239 246 255)' }
        : { borderColor: 'rgb(191 219 254)', backgroundColor: 'rgb(239 246 255)' }
      }
    >
      <div className="flex items-start gap-3">
        {status === 'opportunity' ? (
          <TrendingDown className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        ) : (
          <Activity className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        )}
        <div>
          {status === 'opportunity' ? (
            <>
              <p className="font-bold text-blue-800 text-sm">נמצאה הזדמנות למחזור משכנתא</p>
              <p className="text-blue-700 text-xs mt-0.5">המשכנתא שלך משתוררת מול ריביות השוק. פנה ליועץ לבדיקת חיסכון בתשלומים חודשיים.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-blue-800 text-sm">מד דופק משכנתא</p>
              <p className="text-blue-700 text-xs mt-0.5">המשכנתא שלך מנוטרת מול ריביות השוק. נעדכן כשתיווצר הזדמנות למחזור.</p>
            </>
          )}
          {mortgage?.execution_date && (
            <p className="text-xs text-muted-foreground mt-1">בנק {mortgage.bank_name || ''} · {new Date(mortgage.execution_date).toLocaleDateString('he-IL')}</p>
          )}
        </div>
      </div>
    </div>

    {mortgage && (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 mt-4" dir="rtl">
        <h3 className="font-bold text-orange-800 text-sm mb-4">המשכנתא המנוטרת</h3>
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between"><span className="text-orange-700">בנק:</span><span className="font-medium text-orange-900">{mortgage.bank_name || '-'}</span></div>
          <div className="flex justify-between"><span className="text-orange-700">תאריך ביצוע:</span><span className="font-medium text-orange-900">{new Date(mortgage.execution_date).toLocaleDateString('he-IL')}</span></div>
          <div className="flex justify-between"><span className="text-orange-700">סכום כללי:</span><span className="font-medium text-orange-900">₪{(mortgage.tracks || []).reduce((sum, t) => sum + (t.principal || 0), 0).toLocaleString()}</span></div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-orange-200">
              <th className="text-right py-2 px-2 text-orange-700 font-medium">סוג מסלול</th>
              <th className="text-right py-2 px-2 text-orange-700 font-medium">סכום</th>
              <th className="text-right py-2 px-2 text-orange-700 font-medium">ריבית</th>
              <th className="text-right py-2 px-2 text-orange-700 font-medium">שנים</th>
            </tr>
          </thead>
          <tbody>
            {(mortgage.tracks || []).map((track, i) => (
              <tr key={i} className="border-b border-orange-100 last:border-b-0">
                <td className="text-right py-2 px-2 text-orange-900">{track.track_type}</td>
                <td className="text-right py-2 px-2 text-orange-900">₪{(track.principal || 0).toLocaleString()}</td>
                <td className="text-right py-2 px-2 text-orange-900">{track.interest_rate}%</td>
                <td className="text-right py-2 px-2 text-orange-900">{track.years}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    </>
  );
}