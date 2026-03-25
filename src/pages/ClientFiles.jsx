import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import FileUploadCard from '@/components/FileUploadCard';

export default function ClientFiles() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const data = await base44.entities.FileRequest.list('-created_date');
      const pending = data.filter(r => r.client_email === user.email);
      setRequests(pending);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.FileRequest.subscribe((event) => {
      load();
    });
    return unsubscribe;
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const CATEGORIES = ['לווה 1', 'לווה 2', 'משותף'];
  const CATEGORY_COLORS = {
    'לווה 1': 'bg-blue-50 border-blue-200',
    'לווה 2': 'bg-purple-50 border-purple-200',
    'משותף': 'bg-emerald-50 border-emerald-200',
  };
  const CATEGORY_TITLE_COLORS = {
    'לווה 1': 'text-blue-700',
    'לווה 2': 'text-purple-700',
    'משותף': 'text-emerald-700',
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = requests.filter(r => r.category === cat);
    return acc;
  }, {});
  const uncategorized = requests.filter(r => !r.category);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">מסמכים נדרשים</h1>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין מסמכים נדרשים כרגע
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat} className={`rounded-xl border p-5 ${CATEGORY_COLORS[cat]}`}>
              <h2 className={`font-bold text-base mb-4 ${CATEGORY_TITLE_COLORS[cat]}`}>{cat}</h2>
              {grouped[cat]?.length > 0 ? (
                <div className="space-y-3">
                  {grouped[cat].map(request => (
                    <FileUploadCard key={request.id} request={request} onUpdate={load} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">אין מסמכים בקטגוריה זו</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}