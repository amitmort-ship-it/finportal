import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, TrendingDown, ShieldCheck } from 'lucide-react';

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
    <div className="rounded-xl border p-4 mb-4" dir="rtl"
      style={status === 'opportunity'
        ? { background: 'rgb(240 253 244)', borderColor: 'rgb(134 239 172)' }
        : { background: 'rgb(239 246 255)', borderColor: 'rgb(147 197 253)' }
      }
    >
      <div className="flex items-start gap-3">
        {status === 'opportunity' ? (
          <TrendingDown className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        )}
        <div>
          {status === 'opportunity' ? (
            <>
              <p className="font-bold text-emerald-800 text-sm">נמצאה הזדמנות לחיסכון בריביות השוק</p>
              <p className="text-emerald-700 text-xs mt-0.5">פנה ליועץ שלך לבדיקת מחזור משכנתא — ייתכן שניתן לחסוך בתשלומים החודשיים.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-blue-800 text-sm">מד דופק משכנתא</p>
              <p className="text-blue-700 text-xs mt-0.5">המשכנתא שלך מנוטרת מול ריביות השוק. נעדכן כשתיווצר הזדמנות למחזור.</p>
            </>
          )}
          {mortgage?.bank_name && (
            <p className="text-xs text-muted-foreground mt-1">{mortgage.bank_name} · {mortgage.execution_date ? new Date(mortgage.execution_date).toLocaleDateString('he-IL') : ''}</p>
          )}
        </div>
      </div>
    </div>
  );
}