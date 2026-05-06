import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileDown } from 'lucide-react';

export default function ClientDownloadableDocs({ clientEmail }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientEmail) return;

    // Admin-only entity, so we call a public approach: list all docs that include this email
    // Since RLS only allows admin to read, we fetch via a workaround - store accessible docs separately
    // Instead, we expose via a dedicated endpoint or use a client-visible query
    // For now: fetch all (admin sees all, client won't get data due to RLS)
    // Solution: we need to make the entity readable by the client if their email is in enabled_for
    const load = async () => {
      setLoading(true);
      try {
        // We call getAllClients function or use a backend function to get docs for this client
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
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">מסמכים להורדה</h3>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => (
          <a
            key={doc.id}
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-white dark:border-indigo-800 dark:bg-indigo-950/40 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            {doc.title}
          </a>
        ))}
      </div>
    </div>
  );
}