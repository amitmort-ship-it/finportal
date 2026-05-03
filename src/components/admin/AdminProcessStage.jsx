import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ListChecks, Save } from 'lucide-react';
import { toast } from 'sonner';
import ProcessTracker from '../ProcessTracker';

const STAGES = [
  'איסוף מסמכים',
  'בניית תמהיל',
  'מכרז ריביות',
  'בנק מנצח',
  'בטחונות וחתימות',
  'המתנה לביצוע',
];

export default function AdminProcessStage({ selectedClient }) {
  const [record, setRecord] = useState(null);
  const [stage, setStage] = useState('איסוף מסמכים');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const normalizedClientEmail = String(selectedClient || '').trim().toLowerCase();

  useEffect(() => {
    if (!normalizedClientEmail || normalizedClientEmail === '_all') {
      setRecord(null);
      setStage('איסוף מסמכים');
      setNotes('');
      return;
    }

    let isActive = true;

    const load = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.ProcessStage.filter({ client_email: normalizedClientEmail });
        if (!isActive) return;

        const nextRecord = Array.isArray(list) && list.length > 0 ? list[0] : null;
        const nextStage = STAGES.includes(nextRecord?.current_stage) ? nextRecord.current_stage : 'איסוף מסמכים';
        const nextNotes = typeof nextRecord?.notes === 'string' ? nextRecord.notes : '';

        setRecord(nextRecord);
        setStage(nextStage);
        setNotes(nextNotes);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load process stage', error);
        setRecord(null);
        setStage('איסוף מסמכים');
        setNotes('');
        toast.error('לא הצלחנו לטעון את שלב התהליך ללקוח הזה');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [normalizedClientEmail]);

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
    } catch (error) {
      console.error('Failed to save process stage', error);
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
    <div className="grid md:grid-cols-2 gap-6">
      {/* Edit panel */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">עדכון שלב התהליך</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <>
            <div>
              <Label className="mb-1 block">שלב נוכחי</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
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

      {/* Preview */}
      <ProcessTracker currentStage={stage} notes={notes} />
    </div>
  );
}
