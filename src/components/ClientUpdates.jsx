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
        console.error('Error loading updates:', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    const unsubscribe = base44.entities.ClientUpdate.subscribe((event) => {
      if (event.type === 'create' && event.data.client_email === caseEmail) {
        setUpdates((prev) => [event.data, ...prev]);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [caseEmail]);

  if (!user) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col h-[500px] w-full shadow-sm">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-blue-900 text-lg">עדכונים חדשים</h2>
        </div>
      </div>

      <div className="overflow-y-auto space-y-3 flex-1 pr-2 
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-blue-100 
        [&::-webkit-scrollbar-track]:rounded-full 
        [&::-webkit-scrollbar-thumb]:bg-blue-400 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        [&::-webkit-scrollbar-thumb]:hover:bg-blue-500">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-blue-400">
            <p className="text-sm">אין עדכונים חדשים כרגע</p>
          </div>
        ) : (
          updates.map((update) => (
            <div
              key={update.id}
              className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm hover:border-blue-300 transition-colors"
            >
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {update.message}
              </p>
              <div className="flex justify-end mt-2">
                <span className="text-[10px] text-slate-400 font-normal">
                  {update.created_date
                    ? format(new Date(update.created_date), 'HH:mm dd.MM.yyyy', { locale: he })
                    : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
