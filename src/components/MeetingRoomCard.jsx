import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Video } from 'lucide-react';

const STATUSES = {
  available: { label: 'פנוי לשיחה', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50', pulse: true },
  busy: { label: 'בפגישה כרגע', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50', pulse: false },
  away: { label: 'לא נמצא', color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700', pulse: false },
};

export default function MeetingRoomCard() {
  const [meetLink, setMeetLink] = useState('');
  const [status, setStatus] = useState('away');

  useEffect(() => {
    const load = async () => {
      const records = await base44.entities.BusinessData.filter({ key: 'main' });
      if (records.length > 0) {
        setMeetLink(records[0].meetLink || '');
        setStatus(records[0].meetStatus || 'away');
      }
    };
    load();

    const unsub = base44.entities.BusinessData.subscribe((event) => {
      if (event.data?.key === 'main') {
        setMeetLink(event.data.meetLink || '');
        setStatus(event.data.meetStatus || 'away');
      }
    });
    return () => unsub();
  }, []);

  const s = STATUSES[status] || STATUSES.away;

  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className={`w-3 h-3 rounded-full block ${s.color}`} />
            {s.pulse && <span className={`absolute inset-0 w-3 h-3 rounded-full ${s.color} animate-ping opacity-60`} />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${s.text}`}>עמית — {s.label}</p>
            <p className="text-xs text-muted-foreground">חדר פגישות וירטואלי</p>
          </div>
        </div>

        {meetLink && status !== 'busy' && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            <Video className="w-3.5 h-3.5" />
            הצטרף
          </a>
        )}
      </div>
    </div>
  );
}