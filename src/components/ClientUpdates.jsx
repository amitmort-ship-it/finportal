import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Bell } from 'lucide-react';

export default function ClientUpdates() {
  const { user, caseEmail } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseEmail) return;

    const load = async () => {
      try {
        const data = await base44.entities.ClientUpdate.filter(
          { client_email: caseEmail },
          '-created_date'
        );
        setUpdates(data || []);
      } catch (err) {
        console.error("Error loading updates:", err);
      } finally {
        setLoading(false);
      }
    };
    
    load();

    // האזנה לעדכונים בזמן אמת
    const unsubscribe = base44.entities.ClientUpdate.subscribe((event) => {
      if (event.type === 'create' && event.data.client_email === caseEmail) {
        setUpdates(prev => [event.data, ...prev]);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [caseEmail]);

  if (!user) return null;

  return (
    /* h-[500px] קובע גובה קבוע כדי למנוע מהריבוע להימתח. flex-col מאפשר גלילה פנימית */
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900 flex flex-col h-[500px] w-full">
      
      {/* כותרת קבועה שלא נעלמת בגלילה */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-blue-900 dark:text-blue-300 text-lg">עדכונים חדשים</h2>
        </div>
      </div>

      {/* אזור רשימת ההודעות עם גלילה מובנית */}
      <div className="overflow-y-auto space-y-3 flex-1 pr-2 
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-blue-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800
        [&::-webkit-scrollbar-track]:rounded-full 
        [&::-webkit-scrollbar-thumb]:bg-blue-400 dark:[&::-webkit-scrollbar-thumb]:bg-blue-700
        [&::-webkit-scrollbar-thumb]:rounded-full 
        [&::-webkit-scrollbar-thumb]:hover:bg-blue-500">
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-blue-400 dark:text-blue-300/70">
            <p className="text-sm">אין עדכונים חדשים כרגע</p>
          </div>
        ) : (
          updates.map((update) => (
            <div 
              key={update.id} 
              className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-blue-800"
            >
              <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-100">
                {update.message}
              </p>
              <div className="flex justify-end mt-2">
                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400">
                  {update.created_date ? format(new Date(update.created_date), 'HH:mm dd.MM.yyyy', { locale: he }) : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
