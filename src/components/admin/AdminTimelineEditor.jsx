import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, GripVertical, RotateCcw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import VisualTimeline from '@/components/VisualTimeline';

const DEFAULT_STAGES = [
  { name: 'איסוף מסמכים', estimated_days: 7, next_step: '' },
  { name: 'בניית תמהיל', estimated_days: 7, next_step: '' },
  { name: 'מכרז ריביות', estimated_days: 14, next_step: '' },
  { name: 'בנק מנצח', estimated_days: 7, next_step: '' },
  { name: 'בטחונות וחתימות', estimated_days: 14, next_step: '' },
  { name: 'המתנה לביצוע', estimated_days: 30, next_step: '' },
];

export default function AdminTimelineEditor({ selectedClient }) {
  const [globalTemplate, setGlobalTemplate] = useState(null);
  const [clientRecord, setClientRecord] = useState(null);
  const [stages, setStages] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewStage, setPreviewStage] = useState('');
  const [currentStageRecord, setCurrentStageRecord] = useState(null);
  const [currentStageName, setCurrentStageName] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedClient]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templates, clientTimelines, processStages] = await Promise.all([
        base44.entities.TimelineTemplate.filter({ key: 'global' }),
        selectedClient ? base44.entities.ClientTimeline.filter({ client_email: selectedClient }) : Promise.resolve([]),
        selectedClient ? base44.entities.ProcessStage.filter({ client_email: selectedClient }) : Promise.resolve([]),
      ]);

      const global = templates[0] || null;
      const clientRec = clientTimelines[0] || null;

      const stageRec = processStages[0] || null;
      setCurrentStageRecord(stageRec);
      setCurrentStageName(stageRec?.current_stage || '');

      setGlobalTemplate(global);
      setClientRecord(clientRec);

      if (clientRec) {
        setIsCustom(true);
        setStages(clientRec.stages?.length ? clientRec.stages : (global?.stages || DEFAULT_STAGES));
      } else {
        setIsCustom(false);
        setStages(global?.stages?.length ? global.stages : DEFAULT_STAGES);
      }
    } catch (e) {
      toast.error('שגיאה בטעינת התבנית');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobal = async () => {
    setSaving(true);
    try {
      if (globalTemplate) {
        await base44.entities.TimelineTemplate.update(globalTemplate.id, { stages });
      } else {
        const created = await base44.entities.TimelineTemplate.create({ key: 'global', stages });
        setGlobalTemplate(created);
      }
      toast.success('תבנית גלובלית נשמרה');
    } catch (e) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      if (clientRecord) {
        await base44.entities.ClientTimeline.update(clientRecord.id, { stages });
      } else {
        const created = await base44.entities.ClientTimeline.create({ client_email: selectedClient, stages });
        setClientRecord(created);
      }
      setIsCustom(true);
      toast.success('תבנית אישית נשמרה ללקוח');
    } catch (e) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentStage = async (stageName) => {
    if (!selectedClient || !stageName) return;
    if (currentStageRecord) {
      await base44.entities.ProcessStage.update(currentStageRecord.id, { current_stage: stageName });
    } else {
      const created = await base44.entities.ProcessStage.create({ client_email: selectedClient, current_stage: stageName });
      setCurrentStageRecord(created);
    }
  };

  const handlePublish = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      if (clientRecord) {
        await base44.entities.ClientTimeline.update(clientRecord.id, { stages });
      } else {
        const created = await base44.entities.ClientTimeline.create({ client_email: selectedClient, stages });
        setClientRecord(created);
        setIsCustom(true);
      }
      const stageToPublish = currentStageName || stages[0]?.name || '';
      await saveCurrentStage(stageToPublish);
      await base44.functions.invoke('notifyStageUpdate', {
        client_email: selectedClient,
        stage_name: stageToPublish,
      });
      toast.success('השלב פורסם ומייל נשלח ללקוח');
    } catch {
      toast.error('שגיאה בפרסום');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToGlobal = async () => {
    if (!clientRecord) return;
    try {
      await base44.entities.ClientTimeline.delete(clientRecord.id);
      setClientRecord(null);
      setIsCustom(false);
      setStages(globalTemplate?.stages?.length ? globalTemplate.stages : DEFAULT_STAGES);
      toast.success('אופס לתבנית הגלובלית');
    } catch (e) {
      toast.error('שגיאה באיפוס');
    }
  };

  const addStage = () => {
    setStages([...stages, { name: '', estimated_days: 7, next_step: '' }]);
  };

  const removeStage = (i) => {
    setStages(stages.filter((_, idx) => idx !== i));
  };

  const updateStage = (i, field, value) => {
    const updated = stages.map((s, idx) =>
      idx === i ? { ...s, [field]: field === 'estimated_days' ? Number(value) : value } : s
    );
    setStages(updated);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Preview */}
      {stages.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">תצוגה מקדימה</h3>
            <select
              className="text-xs border border-border rounded-md px-2 py-1 bg-background"
              value={previewStage}
              onChange={e => setPreviewStage(e.target.value)}
            >
              <option value="">בחר שלב נוכחי לתצוגה</option>
              {stages.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <VisualTimeline stages={stages} currentStageName={previewStage || stages[0]?.name} />
        </div>
      )}

      {/* Stage editor */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">
              {selectedClient && isCustom ? (
                <span className="text-primary">תבנית אישית ללקוח</span>
              ) : selectedClient ? (
                <span className="text-muted-foreground">תבנית גלובלית (אין עקיפה ללקוח זה)</span>
              ) : (
                'תבנית גלובלית'
              )}
            </h3>
            {selectedClient && isCustom && (
              <p className="text-xs text-muted-foreground mt-0.5">הלקוח הזה מקבל תבנית מותאמת אישית</p>
            )}
          </div>
          {selectedClient && isCustom && (
            <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={handleResetToGlobal}>
              <RotateCcw className="w-3.5 h-3.5" />
              אפס לגלובלי
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {stages.map((stage, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[auto_1fr_100px_1fr_auto] gap-2 items-start bg-muted/30 rounded-lg p-3 border border-border">
              <div className="hidden md:flex items-center text-muted-foreground cursor-grab pt-2">
                <GripVertical className="w-4 h-4" />
              </div>

              <div>
                <Label className="text-xs mb-1 block">שם השלב</Label>
                <Input
                  value={stage.name}
                  onChange={e => updateStage(i, 'name', e.target.value)}
                  placeholder="שם השלב"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">ימים משוערים</Label>
                <Input
                  type="number"
                  min="0"
                  value={stage.estimated_days}
                  onChange={e => updateStage(i, 'estimated_days', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">הצעד הבא (ייראה ללקוח)</Label>
                <Input
                  value={stage.next_step}
                  onChange={e => updateStage(i, 'next_step', e.target.value)}
                  placeholder="למשל: להעלות תלושי שכר"
                  className="h-8 text-sm"
                />
              </div>

              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 mt-5 md:mt-0" onClick={() => removeStage(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={addStage}>
          <Plus className="w-4 h-4" />
          הוסף שלב
        </Button>
      </div>

      {/* Current stage selector */}
      {selectedClient && stages.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5" dir="rtl">
          <h3 className="font-semibold mb-3">שלב נוכחי של הלקוח</h3>
          <select
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={currentStageName}
            onChange={e => setCurrentStageName(e.target.value)}
          >
            <option value="">בחר שלב נוכחי...</option>
            {stages.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
          </select>
          <Button
            className="mt-3 gap-2"
            variant="outline"
            disabled={saving || !currentStageName}
            onClick={async () => {
              setSaving(true);
              try {
                await saveCurrentStage(currentStageName);
                toast.success('שלב נוכחי נשמר');
              } catch {
                toast.error('שגיאה בשמירה');
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save className="w-4 h-4" />
            שמור שלב נוכחי
          </Button>
        </div>
      )}

      {/* Save buttons */}
      <div className="flex gap-3 flex-wrap pb-4">
        <Button onClick={handleSaveGlobal} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור כתבנית גלובלית'}
        </Button>
        {selectedClient && (
          <Button onClick={handleSaveClient} disabled={saving} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור כתבנית אישית ללקוח זה'}
          </Button>
        )}
        {selectedClient && (
          <Button onClick={handlePublish} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Send className="w-4 h-4" />
            {saving ? 'שולח...' : 'פרסם ללקוח + שלח מייל'}
          </Button>
        )}
      </div>
    </div>
  );
}