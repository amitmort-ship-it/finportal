import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileDown, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDownloadableDocs({ selectedClient }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.DownloadableDoc.list();
        setDocs(data || []);
      } catch {
        toast.error('שגיאה בטעינת מסמכים');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isEnabled = (doc) =>
    Array.isArray(doc.enabled_for) && doc.enabled_for.includes(selectedClient);

  const handleToggle = async (doc) => {
    if (!selectedClient) return;
    setToggling((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const currentList = Array.isArray(doc.enabled_for) ? doc.enabled_for : [];
      const newList = isEnabled(doc)
        ? currentList.filter((email) => email !== selectedClient)
        : [...currentList, selectedClient];

      const updated = await base44.entities.DownloadableDoc.update(doc.id, { enabled_for: newList });
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, enabled_for: updated.enabled_for } : d)));
      toast.success(isEnabled(doc) ? 'המסמך הוסתר מהלקוח' : 'המסמך הופעל ללקוח');
    } catch {
      toast.error('שגיאה בעדכון');
    } finally {
      setToggling((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (!selectedClient) return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      בחר לקוח כדי לנהל מסמכים להורדה
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileDown className="w-5 h-5 text-primary" />
        <h3 className="font-bold">מסמכים להורדה</h3>
        <span className="text-xs text-muted-foreground">— הפעל ללקוח הנוכחי</span>
      </div>

      <div className="space-y-2">
        {docs.map((doc) => {
          const enabled = isEnabled(doc);
          return (
            <div
              key={doc.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                enabled ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-border bg-muted/20'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate"
                >
                  {doc.title}
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(doc)}
                disabled={toggling[doc.id]}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                  enabled
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <Power className="w-3 h-3" />
                {enabled ? 'מופעל' : 'כבוי'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}