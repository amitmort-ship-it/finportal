import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileDown, PenLine } from 'lucide-react';

export default function ClientDownloadableDocs({ clientEmail }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientEmail) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('getDownloadableDocs', { client_email: clientEmail });
        setDocs(res?.data?.docs || []);
      } catch {
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientEmail]);

  if (loading || docs.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/20 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">מסמכים להורדה וחתימה</h3>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => {
          const signLink = (doc.sign_links || {})[clientEmail];
          return (
            <div key={doc.id} className="rounded-lg border border-indigo-200 bg-white dark:border-indigo-800 dark:bg-indigo-950/40 px-4 py-3 space-y-2">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                <Download className="w-4 h-4 shrink-0" />
                {doc.title}
              </a>
              {signLink && (
                <a
                  href={signLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  <PenLine className="w-3.5 h-3.5 shrink-0" />
                  לחתימה על המסמך
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}