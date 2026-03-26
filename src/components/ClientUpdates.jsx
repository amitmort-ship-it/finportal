import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Bell } from 'lucide-react';

export default function ClientUpdates() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      try {
        const data = await base44.entities.ClientUpdate.filter(
          { client_email: user.email },
          '-created_date'
        );
        setUpdates(data);
      } catch (err) {
        console.error("Error loading updates:", err);
      } finally {
        setLoading(false);
      }
    };
    
    load();

    const unsubscribe = base44.entities.ClientUpdate.subscribe((event) => {
      if (event.type === 'create' && event.data.client_email === user.email) {
        setUpdates(prev => [event.data, ...prev]);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.email]);

  if (!user) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col md:h-full h-56">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-blue-900">עדכונים חדשים</h2>
      </div>
      <div className="overflow-y-auto space-y-3 flex-1 min-h-0 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-blue-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-500">
        {loading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        {!loading && updates.length === 0 && (
          <p className="text-sm text-blue-400 text-center py-6">אין עדכונים חדשים</p>
        )}
        {updates.map((update) => (
          <div key={update.id} className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-foreground">{update.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {update.created_date ? format(new Date(update.created_date), 'dd.MM.yyyy HH:mm', { locale: he }) : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
