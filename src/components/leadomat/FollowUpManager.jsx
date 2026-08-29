import { useState } from 'react';
import { Bell, Calendar, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function getFollowupStatus(dateStr) {
  if (!dateStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d - today) / 86400000);
  if (diffDays < 0) return { status: 'overdue', days: Math.abs(diffDays), label: `איחר ${Math.abs(diffDays)} ימים` };
  if (diffDays === 0) return { status: 'today', days: 0, label: 'היום' };
  if (diffDays <= 3) return { status: 'soon', days: diffDays, label: `בעוד ${diffDays} ימים` };
  return { status: 'future', days: diffDays, label: `בעוד ${diffDays} ימים` };
}

const STATUS_STYLES = {
  overdue: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/25 dark:border-red-900/50 dark:text-red-300',
  today: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/50 dark:text-amber-300',
  soon: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/25 dark:border-blue-900/50 dark:text-blue-300',
  future: 'bg-muted/30 border-border text-muted-foreground',
  none: 'bg-muted/20 border-border text-muted-foreground',
};

export function FollowupBadge({ lead }) {
  const f = getFollowupStatus(lead.next_followup_date);
  if (f === 'none') return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${STATUS_STYLES[f.status]}`}>
      {f.status === 'overdue' && '🔴 '}{f.status === 'today' && '🟡 '}{f.status === 'soon' && '🔵 '}
      {f.label}
    </span>
  );
}

export default function FollowUpManager({ lead, onUpdate, saving }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(lead.next_followup_date || '');
  const [notes, setNotes] = useState(lead.followup_notes || '');

  const f = getFollowupStatus(lead.next_followup_date);

  const handleSave = () => {
    onUpdate({ next_followup_date: date || null, followup_notes: notes });
    setEditing(false);
  };

  const handleClear = () => {
    setDate('');
    setNotes('');
    onUpdate({ next_followup_date: null, followup_notes: '' });
    setEditing(false);
  };

  const quickSet = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const iso = d.toISOString().split('T')[0];
    setDate(iso);
  };

  if (!editing) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            תזכורת Follow-up
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            {lead.next_followup_date ? 'ערוך' : 'הגדר'}
          </Button>
        </div>
        {lead.next_followup_date ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_STYLES[f.status]}`}>
                {f.status === 'overdue' && '🔴 '}{f.status === 'today' && '🟡 '}{f.status === 'soon' && '🔵 '}
                {f.label}
              </span>
              <span className="text-sm text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(lead.next_followup_date).toLocaleDateString('he-IL')}
              </span>
            </div>
            {lead.followup_notes && (
              <div className="rounded-lg bg-muted/30 border border-border p-2.5 text-sm text-foreground">
                {lead.followup_notes}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">לא נקבע מעקב. לחץ "הגדר" לתזכורת.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          עריכת תזכורת Follow-up
        </h3>
        <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">תאריך מעקב</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} dir="ltr" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => quickSet(0)}>היום</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => quickSet(1)}>מחר</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => quickSet(3)}>בעוד 3 ימים</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => quickSet(7)}>בעוד שבוע</Button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">הערות למעקב</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="מה צריך לעשות במעקב?"
          className="w-full min-h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          dir="rtl"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> שמור
        </Button>
        {lead.next_followup_date && (
          <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={saving}>
            נקה תזכורת
          </Button>
        )}
      </div>
    </div>
  );
}