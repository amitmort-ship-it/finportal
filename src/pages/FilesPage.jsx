import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FileUploadCard from '../components/FileUploadCard';
import { FileText } from 'lucide-react';

const CATEGORIES = ['לווה 1', 'לווה 2', 'משותף'];
const CATEGORY_STYLES = {
  'לווה 1': { bg: 'bg-blue-50 border-blue-200', title: 'text-blue-600' },
  'לווה 2': { bg: 'bg-purple-50 border-purple-200', title: 'text-purple-600' },
  'משותף': { bg: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-600' },
};

export default function FilesPage() {
  const { user } = useAuth();
  const { data: requests = [], isLoading: loading } = useQuery({
    queryKey: ['file-requests', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.FileRequest.filter({ client_email: user.email }, '-created_date');
    },
    staleTime: 60000,
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.FileRequest.subscribe(() => {});
    return unsubscribe;
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">מסמכים נדרשים</h1>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין מסמכים נדרשים כרגע</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר יהיו מסמכים להעלאה, הם יופיעו כאן</p>
        </div>
      </div>
    );
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = requests.filter(r => r.category === cat);
    return acc;
  }, {});
  const uncategorized = requests.filter(r => !r.category);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">מסמכים נדרשים</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {CATEGORIES.map(cat => (
          <div key={cat} className={`rounded-2xl border p-5 ${CATEGORY_STYLES[cat].bg}`}>
            <h2 className={`font-bold text-base mb-4 text-center ${CATEGORY_STYLES[cat].title}`}>{cat}</h2>
            {grouped[cat]?.length > 0 ? (
              <div className="space-y-3">
                {grouped[cat].map(request => (
                  <FileUploadCard key={request.id} request={request} onUpdate={() => window.location.reload()} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">אין מסמכים בקטגוריה זו</div>
            )}
          </div>
        ))}
      </div>

      {uncategorized.length > 0 && (
        <div className="mt-4 space-y-3">
          {uncategorized.map(r => (
            <FileUploadCard key={r.id} request={r} onUpdate={() => window.location.reload()} />
          ))}
        </div>
      )}
    </div>
  );
}