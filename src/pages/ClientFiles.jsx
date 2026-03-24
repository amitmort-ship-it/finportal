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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">מסמכים נדרשים</h1>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין מסמכים נדרשים כרגע
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <FileUploadCard key={request.id} request={request} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}