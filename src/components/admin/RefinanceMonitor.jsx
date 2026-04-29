import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, TrendingDown, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const THRESHOLD = 0.5; // פער מינימלי לסימון (ריבית קיימת גבוהה מריבית שוק ב-0.5% לפחות)
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

export default function RefinanceMonitor() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState({});

  useEffect(() => {
    const load = async () => {
      const [mortgages, marketRates, profiles] = await Promise.all([
        base44.entities.FinalMortgage.filter({}),
        base44.entities.MarketRate.filter({}),
        base44.entities.ClientProfile.filter({}),
      ]);

      const profileMap = Object.fromEntries(profiles.map(p => [p.email, p.full_name || p.email]));

      const rateMap = {};
      marketRates.forEach(r => {
        const key = `${r.track_type}__${r.years_range}`;
        rateMap[key] = r.target_rate;
      });

      const results = [];
      mortgages.forEach(m => {
        const months = monthsDiff(m.execution_date);
        if (months < COOLOFF_MONTHS) return; // cool-off

        let totalWeightedGap = 0;
        let totalPrincipal = 0;

        (m.tracks || []).forEach(track => {
          const range = getYearsRange(track.years || 0);
          const key = `${track.track_type}__${range}`;
          const targetRate = rateMap[key];
          if (targetRate === undefined) return;
          // gap חיובי = ריבית קיימת גבוהה מריבית שוק = הזדמנות למחזור
          const gap = track.interest_rate - targetRate;
          totalWeightedGap += gap * (track.principal || 0);
          totalPrincipal += (track.principal || 0);
        });

        if (totalPrincipal === 0) return;
        const avgGap = totalWeightedGap / totalPrincipal;

        // avgGap חיובי = ריבית קיימת גבוהה מהשוק = כדאי למחזר
        if (avgGap >= THRESHOLD) {
          results.push({
            ...m,
            clientName: profileMap[m.client_email] || m.client_email,
            avgGap: Math.round(avgGap * 100) / 100,
            months,
          });
        }
      });

      results.sort((a, b) => b.avgGap - a.avgGap);
      setCandidates(results);
      setLoading(false);
    };
    load();
  }, []);

  const handleSendEmail = async (candidate) => {
    setSendingEmail(prev => ({ ...prev, [candidate.id]: true }));
    try {
      await base44.integrations.Core.SendEmail({
        to: candidate.client_email,
        subject: 'הזדמנות למחזור משכנתא – ריביות השוק ירדו',
        body: `שלום ${candidate.clientName},

בדיקה שוטפת של ריביות השוק מצאה הזדמנות פוטנציאלית למחזור המשכנתא שלך.

הריבית הממוצעת שלך גבוהה מריביות השוק הנוכחיות בכ-${candidate.avgGap.toFixed(2)}%.
המשכנתא שלך בוצעה לפני ${candidate.months} חודשים בבנק ${candidate.bank_name}.

מחזור משכנתא עשוי לחסוך לך כסף בתשלומים החודשיים.

פנה אלינו לבדיקה מעמיקה ואישית – נשמח לסייע!

בברכה,
צוות היועצים`,
      });
      toast.success(`מייל נשלח ל-${candidate.clientName}`);
    } catch (err) {
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setSendingEmail(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  if (loading) return null;

  if (candidates.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 mb-6 flex items-center gap-3" dir="rtl">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-sm">אין לקוחות הממתינים למחזור</p>
          <p className="text-xs text-muted-foreground">כל התיקים המתועדים עומדים בריביות השוק</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-amber-800">
          לקוחות עם הזדמנות למחזור ({candidates.length})
        </h3>
        <span className="text-xs text-amber-600 mr-1">— ריבית שוק נמוכה מריבית קיימת ב-{THRESHOLD}% ומעלה</span>
      </div>
      <div className="space-y-2">
        {candidates.map(c => (
          <div key={c.id} className="bg-white rounded-lg border border-amber-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="font-semibold text-sm">{c.clientName}</span>
              <span className="text-xs text-muted-foreground mr-2">{c.bank_name}</span>
              <span className="text-xs text-muted-foreground">· {c.months} חודשים מביצוע</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">פוטנציאל חיסכון {c.avgGap.toFixed(2)}%</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-amber-300 hover:bg-amber-100 text-amber-800"
                onClick={() => handleSendEmail(c)}
                disabled={!!sendingEmail[c.id]}
              >
                {sendingEmail[c.id] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                שלח התראה
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}