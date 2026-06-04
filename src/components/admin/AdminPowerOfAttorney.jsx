import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Stamp, Save, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminPowerOfAttorney({ selectedClient }) {
  const [record, setRecord] = useState(null);
  const [signUrl, setSignUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedClient) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.PowerOfAttorney.filter({ client_email: selectedClient });
        const existing = data?.[0] || null;
        setRecord(existing);
        setSignUrl(existing?.sign_url || '');
      } catch {
        toast.error('שגיאה בטעינת ייפוי כח');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (record) {
        const updated = await base44.entities.PowerOfAttorney.update(record.id, { sign_url: signUrl });
        setRecord(updated);
      } else {
        const created = await base44.entities.PowerOfAttorney.create({ client_email: selectedClient, sign_url: signUrl });
        setRecord(created);
      }
      toast.success('הלינק נשמר');
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedClient) return null;

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Stamp className="w-5 h-5 text-primary" />
        <h3 className="font-bold">ייפוי כח לייצוג בנושא המשכנתא</h3>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">לינק לחתימה (DocuSign, PDF, או כל שירות אחר)</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={signUrl}
            onChange={(e) => setSignUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
            className="flex-1"
          />
          {signUrl && (
            <a href={signUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 shrink-0">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </div>
    </div>
  );
}