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
    const load = async () => {
      const data = await base44.entities.ClientUpdate.filter(
        { client_email: user.email },
        '-created_date'
      );
      setUpdates(data);
      setLoading(false);
    };
    load();

    const unsubscribe = base44.entities.ClientUpdate.subscribe((event) => {
      if (event.type === 'create' && event.data.client_email === user.email) {
        setUpdates(prev => [event.data, ...prev]);
      }
    });

    return unsubscribe;
  }, [user.email]);

  if (loading || updates.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col" style={{height: '100%'}}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-blue-900">עדכונים חדשים</h2>
      </div>
      <div className="overflow-y-auto space-y-3 flex-1 min-h-0">
        {updates.map((update) => (
          <div key={update.id} className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-foreground">{update.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(update.created_date), 'dd.MM.yyyy HH:mm', { locale: he })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}