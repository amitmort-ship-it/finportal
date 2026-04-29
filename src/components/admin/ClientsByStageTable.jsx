import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users } from 'lucide-react';

const STAGES = [
  'איסוף מסמכים',
  'בניית תמהיל',
  'מכרז ריביות',
  'בנק מנצח',
  'בטחונות וחתימות',
  'המתנה לביצוע',
  'סיום טיפול',
];

const STAGE_COLORS = {
  'איסוף מסמכים':     'bg-slate-100 text-slate-700 border-slate-200',
  'בניית תמהיל':      'bg-blue-50 text-blue-700 border-blue-200',
  'מכרז ריביות':      'bg-violet-50 text-violet-700 border-violet-200',
  'בנק מנצח':         'bg-amber-50 text-amber-700 border-amber-200',
  'בטחונות וחתימות':  'bg-orange-50 text-orange-700 border-orange-200',
  'המתנה לביצוע':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'סיום טיפול':       'bg-gray-100 text-gray-500 border-gray-200',
};

export default function ClientsByStageTable({ onSelectClient }) {
  const [stageMap, setStageMap] = useState({});
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [stages, clientProfiles] = await Promise.all([
        base44.entities.ProcessStage.filter({}, '-created_date'),
        base44.entities.ClientProfile.filter({}),
      ]);

      const profileMap = {};
      clientProfiles.forEach(p => { profileMap[p.email] = p.full_name || p.email; });
      setProfiles(profileMap);

      const map = {};
      STAGES.forEach(s => { map[s] = []; });

      // Build a map of email -> stage from ProcessStage records
      const stageByEmail = {};
      stages.forEach(s => { stageByEmail[s.client_email] = s.current_stage; });

      // Place every client profile into the correct stage
      // Clients marked as treatment ended go to 'סיום טיפול' column
      clientProfiles.forEach(p => {
        if (p.treatment_ended_at) {
          map['סיום טיפול'].push(p.email);
        } else {
          const stage = stageByEmail[p.email] || STAGES[0];
          if (map[stage]) map[stage].push(p.email);
        }
      });

      setStageMap(map);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const hasAny = Object.values(stageMap).some(arr => arr.length > 0);
  if (!hasAny) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm mb-6" dir="rtl">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">לקוחות לפי שלב</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {STAGES.map(stage => (
                <th key={stage} className="px-4 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap text-xs">
                  <span className={`inline-block px-2 py-1 rounded-full border text-xs font-semibold ${STAGE_COLORS[stage]}`}>
                    {stage}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {STAGES.map(stage => (
                <td key={stage} className="px-4 py-3 align-top text-center border-l border-t border-border/40 first:border-l-0">
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {stageMap[stage]?.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      stageMap[stage].map(email => (
                        <button
                          key={email}
                          onClick={() => onSelectClient?.(email)}
                          className="block w-full text-right px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium text-foreground transition-colors truncate max-w-[140px] mx-auto"
                          title={profiles[email] || email}
                        >
                          {profiles[email] || email}
                        </button>
                      ))
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}