import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileDown, Power, Link, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminDownloadableDocs({ selectedClient }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [signLinks, setSignLinks] = useState({});
  const [savingLink, setSavingLink] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.DownloadableDoc.list();
        setDocs(data || []);
        // Init sign link inputs from current data
        const links = {};
        (data || []).forEach((doc) => {
          links[doc.id] = (doc.sign_links || {})[selectedClient] || '';
        });
        setSignLinks(links);
      } catch {
        toast.error('שגיאה בטעינת מסמכים');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClient]);

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

  const handleSaveSignLink = async (doc) => {
    if (!selectedClient) return;
    setSavingLink((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const currentLinks = doc.sign_links || {};
      const newLinks = { ...currentLinks, [selectedClient]: signLinks[doc.id] || '' };
      const updated = await base44.entities.DownloadableDoc.update(doc.id, { sign_links: newLinks });
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, sign_links: updated.sign_links } : d)));
      toast.success('לינק החתימה נשמר');
    } catch {
      toast.error('שגיאה בשמירת הלינק');
    } finally {
      setSavingLink((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (!selectedClient) return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      בחר לקוח כדי לנהל מסמכים להורדה וחתימה
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileDown className="w-5 h-5 text-primary" />
        <h3 className="font-bold">מסמכים להורדה וחתימה</h3>
        <span className="text-xs text-muted-foreground">— הפעל ללקוח הנוכחי</span>
      </div>

      <div className="space-y-3">
        {docs.map((doc) => {
          const enabled = isEnabled(doc);
          const currentSignLink = (doc.sign_links || {})[selectedClient] || '';
          return (
            <div
              key={doc.id}
              className={`rounded-lg border p-3 space-y-2 transition-colors ${
                enabled ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-border bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
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

              {/* Sign link input — always visible so admin can set it even before enabling */}
              <div className="flex items-center gap-2">
                <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={signLinks[doc.id] ?? currentSignLink}
                  onChange={(e) => setSignLinks((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                  placeholder="לינק לחתימה (אופציונלי) — הסכם ליווי, DocuSign וכו׳"
                  className="h-7 text-xs"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSignLink(doc)}
                  disabled={savingLink[doc.id]}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <Save className="w-3 h-3" />
                  {savingLink[doc.id] ? '...' : 'שמור'}
                </button>
              </div>
              {currentSignLink && (
                <p className="text-xs text-muted-foreground pr-5 truncate">
                  לינק נוכחי: <a href={currentSignLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{currentSignLink}</a>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}