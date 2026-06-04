import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSignature } from 'lucide-react';

export default function ClientPowerOfAttorney({ clientEmail }) {
  const [signUrl, setSignUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientEmail) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.PowerOfAttorney.filter({ client_email: clientEmail });
        setSignUrl(data?.[0]?.sign_url || null);
      } catch {
        setSignUrl(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientEmail]);

  if (loading || !signUrl) return null;

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSignature className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-blue-900 dark:text-blue-200">ייפוי כח לייצוג בנושא המשכנתא</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            המשרד שלח לך ייפוי כח הדורש חתימה. לחץ על הכפתור לחתימה על המסמך.
          </p>
        </div>
        <a
          href={signUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
        >
          <FileSignature className="w-4 h-4" />
          חתימה על ייפוי כח
        </a>
      </div>
    </div>
  );
}