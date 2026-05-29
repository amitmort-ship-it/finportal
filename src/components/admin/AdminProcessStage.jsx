import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ListChecks, Save } from 'lucide-react';
import { toast } from 'sonner';
import VisualTimeline from '../VisualTimeline';

const DEFAULT_STAGES = [
  'איסוף מסמכים',
  'בניית תמהיל',
  'מכרז ריביות',
  'בנק מנצח',
  'בטחונות וחתימות',
  'המתנה לביצוע',
];

const nativeSelectClassName = 'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminProcessStage({ selectedClient }) {
  const [record, setRecord] = useState(null);
  const [stage, setStage] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stageNames, setStageNames] = useState(DEFAULT_STAGES);
  const normalizedClientEmail = String(selectedClient || '').trim().toLowerCase();

  // Load stage names from timeline template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        // Try client-specific first, then global
        if (normalizedClientEmail && normalizedClientEmail !== '_all') {
          const clientTimelines = await base44.entities.ClientTimeline.filter({ client_email: normalizedClientEmail });
          if (clientTimelines[0]?.stages?.length) {
            setStageNames(clientTimelines[0].stages.map(s => s.name));
            return;
          }
        }
        const globals = await base44.entities.TimelineTemplate.filter({ key: 'global' });
        if (globals[0]?.stages?.length) {
          setStageNames(globals[0].stages.map(s => s.name));
        }
      } catch {
        // fallback to defaults
      }
    };
    loadTemplate();
  }, [normalizedClientEmail]);

  useEffect(() => {
    if (!normalizedClientEmail || normalizedClientEmail === '_all') {
      setRecord(null);
      setStage('');
      setNotes('');
      return;
    }

    let isActive = true;
    const load = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.ProcessStage.filter({ client_email: normalizedClientEmail });
        if (!isActive) return;
        const nextRecord = list?.[0] || null;
        setRecord(nextRecord);
        setStage(nextRecord?.current_stage || '');
        setNotes(nextRecord?.notes || '');
      } catch {
        if (!isActive) return;
        setRecord(null);
        setStage('');
        setNotes('');
        toast.error('לא הצלחנו לטעון את שלב התהליך');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    load();
    return () => { isActive = false; };
  }, [normalizedClientEmail]);

  // Once stage names are loaded, default the stage if not set
  useEffect(() => {
    if (!stage && stageNames.length > 0) {
      setStage(stageNames[0]);
    }
  }, [stageNames]);

  const handleSave = async () => {
    if (!normalizedClientEmail || normalizedClientEmail === '_all') {
      toast.error('בחר לקוח');
      return;
    }
    setSaving(true);
    try {
      const payload = { current_stage: stage, notes: String(notes || '') };
      if (record?.id) {
        const updated = await base44.entities.ProcessStage.update(record.id, payload);
        setRecord(updated || { ...record, ...payload });
      } else {
        const created = await base44.entities.ProcessStage.create({
          client_email: normalizedClientEmail,
          ...payload,
        });
        setRecord(created);
      }
      toast.success('שלב התהליך עודכן');
    } catch {
      toast.error('לא הצלחנו לשמור את שינוי השלב');
    } finally {
      setSaving(false);
    }
  };

  if (!normalizedClientEmail || normalizedClientEmail === '_all') {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        בחר לקוח כדי לנהל את שלב התהליך
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit panel */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 max-w-md">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">עדכון שלב התהליך</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <Label className="mb-1 block">שלב נוכחי</Label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className={nativeSelectClassName}
              >
                {stageNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">הערה (אופציונלי)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="למשל: ממתינים לתלושי שכר..."
                rows={3}
              />
            </div>
            <Button type="button" onClick={handleSave} disabled={saving || loading} className="w-full gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור שלב'}
            </Button>
          </>
        )}
      </div>

      {/* Timeline preview */}
      {stageNames.length > 0 && stage && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-muted-foreground mb-4">תצוגה מקדימה</p>
          <VisualTimeline
            stages={stageNames.map(name => ({ name }))}
            currentStageName={stage}
          />
        </div>
      )}
    </div>
  );
}