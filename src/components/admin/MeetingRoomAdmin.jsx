import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, Link2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUSES = [
  { key: 'available', label: 'פנוי', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { key: 'busy', label: 'בפגישה', color: 'bg-red-500', light: 'bg-red-50 border-red-300 text-red-700' },
  { key: 'away', label: 'לא נמצא', color: 'bg-slate-400', light: 'bg-slate-50 border-slate-300 text-slate-600' },
];

export default function MeetingRoomAdmin() {
  const [recordId, setRecordId] = useState(null);
  const [meetLink, setMeetLink] = useState('');
  const [editingLink, setEditingLink] = useState('');
  const [status, setStatus] = useState('away');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const records = await base44.entities.BusinessData.filter({ key: 'main' });
      if (records.length > 0) {
        const r = records[0];
        setRecordId(r.id);
        setMeetLink(r.meetLink || '');
        setEditingLink(r.meetLink || '');
        setStatus(r.meetStatus || 'away');
      }
    };
    load();

    const unsub = base44.entities.BusinessData.subscribe((event) => {
      if (event.data?.key === 'main') {
        setMeetLink(event.data.meetLink || '');
        setEditingLink(event.data.meetLink || '');
        setStatus(event.data.meetStatus || 'away');
        if (event.data.id) setRecordId(event.data.id);
      }
    });
    return () => unsub();
  }, []);

  const save = async (updates) => {
    setSaving(true);
    try {
      if (recordId) {
        await base44.entities.BusinessData.update(recordId, updates);
      } else {
        const created = await base44.entities.BusinessData.create({ key: 'main', ...updates });
        setRecordId(created.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLink = async () => {
    await save({ meetLink: editingLink.trim() });
    setMeetLink(editingLink.trim());
    setEditMode(false);
    toast.success('הקישור נשמר');
  };

  const handleSetStatus = async (key) => {
    setStatus(key);
    await save({ meetStatus: key });
  };

  const currentStatus = STATUSES.find(s => s.key === status) || STATUSES[2];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Video className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">חדר פגישות</h3>
      </div>

      {/* Status buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">סטטוס זמינות</p>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => handleSetStatus(s.key)}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                status === s.key
                  ? s.light + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status === s.key ? s.color : 'bg-muted-foreground/40'}`} />
              {s.label}
              {status === s.key && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Meet link */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">קישור לחדר</p>
        {editMode ? (
          <div className="flex gap-2">
            <Input
              value={editingLink}
              onChange={e => setEditingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              dir="ltr"
              className="text-xs h-8"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveLink} disabled={saving} className="h-8 text-xs px-3">שמור</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditingLink(meetLink); }} className="h-8 text-xs px-3">ביטול</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {meetLink ? (
              <a href={meetLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{meetLink}</span>
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">אין קישור</span>
            )}
            <button onClick={() => setEditMode(true)} className="text-xs text-muted-foreground hover:text-foreground underline shrink-0">
              {meetLink ? 'ערוך' : 'הוסף'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}