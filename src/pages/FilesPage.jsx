import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FileUploadCard from '../components/FileUploadCard';
import { FileText } from 'lucide-react';

export default function FilesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    const data = await base44.entities.FileRequest.filter({ client_email: user.email }, '-created_date');
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [user.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">מסמכים נדרשים</h1>
        <p className="text-muted-foreground mt-1">העלה את המסמכים המבוקשים</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין מסמכים נדרשים כרגע</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר יהיו מסמכים להעלאה, הם יופיעו כאן</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <FileUploadCard key={req.id} request={req} onUpdate={loadRequests} />
          ))}
        </div>
      )}
    </div>
  );
}