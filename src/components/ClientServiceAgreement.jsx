import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PenLine } from 'lucide-react';

export default function ClientServiceAgreement({ clientEmail }) {
  const [signUrl, setSignUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientEmail) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.ServiceAgreement.filter({ client_email: clientEmail });
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
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-bold text-violet-900 dark:text-violet-200">הסכם ליווי לחתימה</h3>
          </div>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            המשרד שלח לך הסכם ליווי הדורש חתימה. לחץ על הכפתור לחתימה על המסמך.
          </p>
        </div>
        <a
          href={signUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
        >
          <PenLine className="w-4 h-4" />
          חתימה על ההסכם
        </a>
      </div>
    </div>
  );
}