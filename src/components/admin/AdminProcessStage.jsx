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

  useEffect(() => {
    if (!selectedClient || selectedClient === '_all') { setRecord(null); return; }
    const load = async () => {
      setLoading(true);
      const list = await base44.entities.ProcessStage.filter({ client_email: selectedClient });
      if (list.length > 0) {
        setRecord(list[0]);
        setStage(list[0].current_stage);
        setNotes(list[0].notes || '');
      } else {
        setRecord(null);
        setStage('איסוף מסמכים');
        setNotes('');
      }
      setLoading(false);
    };
    load();
  }, [selectedClient]);

  const handleSave = async () => {
    if (!selectedClient) { toast.error('בחר לקוח'); return; }
    setSaving(true);
    if (record) {
      await base44.entities.ProcessStage.update(record.id, { current_stage: stage, notes });
    } else {
      const created = await base44.entities.ProcessStage.create({ client_email: selectedClient, current_stage: stage, notes });
      setRecord(created);
    }
    toast.success('שלב התהליך עודכן');
    setSaving(false);
  };

  if (!selectedClient) {
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
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
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